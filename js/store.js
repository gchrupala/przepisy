// Data model: saved recipes, their tags and state, search and merging of
// copies from several devices. Pure logic without the DOM; the time is
// passed in as an argument.
//
// The whole state is one document, the same one that is synced:
//   { przepisy: 1, items: [Item], tombstones: { id: deletedAt } }
// Item:
//   id, url ('' for a recipe typed in by hand without a page), title (typed
//   or shared, may be ''), note, tags [string],
//   status ('todo' | 'done' = tried), addedAt, updatedAt, doneAt (ms or null),
//   recipe (optional): the recipe as corrected by hand; shown instead of
//     meta.recipe,
//   meta (optional, filled in by the GitHub Action in the data repository,
//   .github/scripts/przepisy_recipes.py in gchrupala/app-data):
//     { fetchedAt, title, description, site, author, image, lang, via,
//       error, attempts, finalUrl, recipe }
// Recipe: { yields: '4 porcje' (as the page says it), time (minutes),
//           ingredients: [Section], steps: [Section] }
// Section: { name ('' = no heading), items: [string] }

export const DOC_VERSION = 1;
export const STORAGE_KEY = 'przepisy:v1';

export const STATUSES = ['todo', 'done'];

const MAX_TAGS = 20;
const MAX_TEXT = 2000;
const MAX_LINES = 120;

export const emptyDoc = () => ({ przepisy: DOC_VERSION, items: [], tombstones: {} });

// ---------- addresses ----------

// Query parameters that only track where a click came from.
const TRACKING = /^(utm_\w+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|igshid|igsh|si|ref_src|ref_url|_hsenc|_hsmi|mkt_tok|oly_\w+|vero_\w+|spm|share_id|smid|cmpid|ito|sh|s)$/i;
// "si", "s" and "sh" are tracking only on these hosts; elsewhere they may matter.
const SHORT_TRACKING_HOSTS = /(^|\.)(youtube\.com|youtu\.be|twitter\.com|x\.com|open\.spotify\.com|instagram\.com|threads\.net|tiktok\.com)$/i;

// A web address with tracking parameters and text fragments removed, or
// null when the input is not an http(s) address.
export function cleanUrl(input) {
  let u;
  try {
    u = new URL(String(input ?? '').trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
  const shortOk = SHORT_TRACKING_HOSTS.test(u.hostname);
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING.test(key) && (key.length > 2 || shortOk)) u.searchParams.delete(key);
  }
  if (u.hash.startsWith('#:~:')) u.hash = '';
  let s = u.toString();
  if (!u.search && s.endsWith('?')) s = s.slice(0, -1);
  return s;
}

// The key under which two addresses count as the same recipe: no scheme, no
// "www.", no fragment, no trailing slash, sorted parameters.
export function urlKey(input) {
  const clean = cleanUrl(input);
  if (!clean) return null;
  const u = new URL(clean);
  u.searchParams.sort();
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  const path = u.pathname.replace(/\/+$/, '');
  const search = u.searchParams.toString();
  return `${host}${u.port ? `:${u.port}` : ''}${path}${search ? `?${search}` : ''}`;
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"'«»“”]+/i;

// What another app shared (Web Share Target: title, text, url) -> { url,
// title } or null when there is no address. Android apps often put the
// address in the text, sometimes after the title.
export function extractShared({ url, title, text } = {}) {
  const fromUrl = cleanUrl(url);
  const found = String(text ?? '').match(URL_IN_TEXT);
  const fromText = found ? cleanUrl(found[0].replace(/[.,;:!?)\]]+$/, '')) : null;
  const link = fromUrl || fromText;
  if (!link) return null;
  let rest = String(text ?? '');
  if (found) rest = rest.replace(found[0], '');
  rest = rest.replace(/\s+/g, ' ').trim().replace(/[\s:–—-]+$/, '');
  const name = String(title ?? '').trim() || rest;
  return { url: link, title: name === link ? '' : name.slice(0, 300) };
}

// ---------- tags ----------

// "Ciasta, #Wege  obiad" -> ["ciasta", "wege", "obiad"] when split on
// commas; a list without commas is split on spaces.
export function parseTags(input) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[,;\n]/);
  const parts = !Array.isArray(input) && !/[,;\n]/.test(String(input ?? '')) ? String(input ?? '').split(/\s+/) : raw;
  const tags = [];
  for (const p of parts) {
    const t = String(p ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().replace(/^#+\s*/, '').toLowerCase().slice(0, 40);
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags.slice(0, MAX_TAGS);
}

// ---------- recipes ----------

const line = (s, n = MAX_TEXT) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// Sections from JSON, without empty lines and empty sections.
function parseSections(x) {
  if (!Array.isArray(x)) return [];
  const out = [];
  let left = MAX_LINES;
  for (const s of x) {
    if (!isObj(s) || !Array.isArray(s.items)) continue;
    const items = s.items.map((i) => line(i)).filter(Boolean).slice(0, left);
    left -= items.length;
    if (items.length) out.push({ name: line(s.name, 200), items });
  }
  return out;
}

// A recipe from JSON, or null when it has nothing in it.
export function parseRecipe(x) {
  if (!isObj(x)) return null;
  const r = {};
  const yields = line(x.yields, 100);
  if (yields) r.yields = yields;
  if (Number.isFinite(x.time) && x.time > 0) r.time = Math.round(x.time);
  r.ingredients = parseSections(x.ingredients);
  r.steps = parseSections(x.steps);
  return r.yields || r.ingredients.length || r.steps.length ? r : null;
}

// The recipe to show: corrected by hand, else the one from the page.
export const recipeOf = (item) => item.recipe ?? item.meta?.recipe ?? null;

// Where the recipe shown comes from: 'hand' | 'schema' | 'claude' |
// 'mistral' | null.
export function recipeSource(item) {
  if (item.recipe) return 'hand';
  if (!item.meta?.recipe) return null;
  return ['claude', 'mistral'].includes(item.meta.via) ? item.meta.via : 'schema';
}

// "4", "4 porcje", "dla 4 osób", "4-6 servings", "serves 4" -> { min, max };
// null when the yield is not a number of people ("około 60 pierogów").
export function servingsOf(yields) {
  const s = String(yields ?? '').trim().replace(/\s+/g, ' ');
  const m = s.match(
    /^(?:(?:dla|serves|for|porcje:?|liczba porcji:?|ilość porcji:?)\s+)?(\d{1,3})(?:\s*(?:-|–|do|to)\s*(\d{1,3}))?(?:\s+(?:porcj\p{L}*|os[oó]b\p{L}*|servings?|people|persons?|portions?))?\.?$/iu,
  );
  if (!m) return null;
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  return min > 0 && max >= min ? { min, max } : null;
}

// "Dla 4 osób", "Dla 1 osoby", "Dla 4–6 osób", "Ilość: około 60 pierogów", or ''.
export function yieldsLabel(yields) {
  const n = servingsOf(yields);
  if (n) return `Dla ${n.min === n.max ? n.min : `${n.min}–${n.max}`} ${n.max === 1 ? 'osoby' : 'osób'}`;
  return yields ? `Ilość: ${yields}` : '';
}

// 45 -> "45 min", 90 -> "1 godz. 30 min", 180 -> "3 godz."
// Some sites write Markdown in their recipe data. A line -> spans to show:
// "**bold**" becomes { text, strong: true }, "[text](address)" just its text.
export function textSpans(line) {
  const s = String(line ?? '').replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)\s]*\)/g, '$1');
  const out = [];
  let last = 0;
  for (const m of s.matchAll(/\*\*(?=\S)(.+?)\*\*/g)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), strong: false });
    out.push({ text: m[1], strong: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), strong: false });
  return out;
}

// ---------- scaling ingredients ----------

const GLYPHS = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8 };
const NICE = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
  [1, ''],
];

// An amount in a line: "1 1/2", "1½", "½", "3/4", "1,5", "250", "pół",
// "półtora". Not a match inside words or codes ("E120").
const AMOUNT =
  /(?<![\p{L}\d.,/])(?:(\d+)\s+(\d+)\/(\d+)|(\d+)?\s?([½⅓⅔¼¾⅛⅜⅝⅞])|(\d+)\/(\d+)|(\d+(?:[.,]\d+)?)|(półtora|pół)(?!\p{L}))/gu;
// Numbers that are not amounts: sizes, temperatures, times, flour types.
const NOT_AMOUNT_AFTER = /^\s*(?:cm\b|mm\b|°|%|stopni|st\.|minut|min\b|godz|h\b|sek|s\b|[x×]\s*[\d½⅓⅔¼¾⅛⅜⅝⅞]|cali|inch|in\b|degrees|minutes?|hours?|grad|gradi|minuti|minutos|horas?|ore\b)/iu;
const NOT_AMOUNT_BEFORE = /(?:\btyp|\btype|\bnr|#|\bx|×)\s*$/iu;

function amountValue(m) {
  if (m[1]) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  if (m[5]) return (m[4] ? Number(m[4]) : 0) + GLYPHS[m[5]];
  if (m[6]) return Number(m[6]) / Number(m[7]);
  if (m[8]) return Number(m[8].replace(',', '.'));
  return m[9] === 'pół' ? 0.5 : 1.5;
}

// 0.5 -> "½", 1.5 -> "1½", 2.4 -> "2,4", 333 -> "335": fractions a cook
// can measure, fewer digits for bigger amounts.
export function formatAmount(x, decimal = ',', fractions = true) {
  if (x >= 100) return String(Math.round(x / 5) * 5);
  if (x >= 10) return String(Math.round(x));
  const whole = Math.floor(x);
  for (const [f, glyph] of fractions ? NICE : []) {
    if (Math.abs(x - whole - f) < 0.02) {
      const w = whole + (f === 1 ? 1 : 0);
      return glyph ? `${w || ''}${glyph}` : String(w);
    }
  }
  return String(Math.round(x * 10) / 10).replace('.', decimal);
}

// An ingredient line with its amounts multiplied by factor. Sizes,
// temperatures and times stay. The words around the numbers do not change
// ("2 jajka" -> "4 jajka", but "1 jajko" -> "2 jajko").
export function scaleLine(line, factor, decimal = ',') {
  const s = String(line ?? '');
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return s;
  return s.replace(AMOUNT, (...args) => {
    const m = args;
    const at = args.at(-2);
    const all = args.at(-1);
    if (NOT_AMOUNT_BEFORE.test(all.slice(0, at)) || NOT_AMOUNT_AFTER.test(all.slice(at + m[0].length))) return m[0];
    const v = amountValue(m);
    if (!(v > 0)) return m[0];
    // An amount written as a decimal ("1,5", "0.5") stays a decimal, with
    // the same separator.
    const written = m[8]?.match(/[.,]/)?.[0];
    return formatAmount(v * factor, written ?? decimal, !written);
  });
}

// The multipliers offered when the number of people is not known.
export const FACTORS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6];

export function timeLabel(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return [h ? `${h} godz.` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

// Sections as text to edit: one item per line, "# Name" before a named part.
export function sectionsToText(sections) {
  return (sections ?? [])
    .map((s) => [s.name ? `# ${s.name}` : '', ...s.items].filter(Boolean).join('\n'))
    .join('\n\n');
}

// The other way: lines become items, "# Name" starts a part. Bullets and
// step numbers at the start of a line go.
export function textToSections(text) {
  const out = [{ name: '', items: [] }];
  for (const raw of String(text ?? '').split('\n')) {
    const head = raw.match(/^\s*#+\s*(.*)$/);
    if (head) {
      out.push({ name: line(head[1], 200), items: [] });
      continue;
    }
    const item = line(raw.replace(/^\s*(?:[-–•*·]\s+|\d{1,2}[.)]\s+)/, ''));
    if (item) out.at(-1).items.push(item);
  }
  return parseSections(out);
}

// The text of the edit form for a recipe (or for none).
export function recipeToForm(recipe) {
  return {
    yields: recipe?.yields ?? '',
    ingredients: sectionsToText(recipe?.ingredients),
    steps: sectionsToText(recipe?.steps),
  };
}

// Saves what was typed in the recipe form. When it is the same as the
// recipe from the page, the correction goes, so a better extraction later
// shows up. Returns the item or null.
export function editRecipe(doc, id, form, now) {
  const item = doc.items.find((i) => i.id === id);
  if (!item) return null;
  const page = item.meta?.recipe ?? null;
  const typed = parseRecipe({
    yields: form.yields,
    time: (item.recipe ?? page)?.time,
    ingredients: textToSections(form.ingredients),
    steps: textToSections(form.steps),
  });
  const same = stableJson(typed) === stableJson(parseRecipe(page));
  return updateItem(doc, id, { recipe: same ? null : (typed ?? { ingredients: [], steps: [] }) }, now);
}

// ---------- titles for display ----------

export const titleOf = (item) => item.title || item.meta?.title || (item.url ? prettyUrl(item.url) : 'Bez tytułu');
export const siteOf = (item) => item.meta?.site || domainOf(item.url);

export function prettyUrl(url) {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, '');
    return `${u.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return String(url);
  }
}

// ---------- changes ----------

export function newId(now, random = Math.random) {
  return `${now.toString(36)}-${Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0')}`;
}

export const findByUrl = (doc, url) => {
  const key = urlKey(url);
  return key ? doc.items.find((i) => urlKey(i.url) === key) ?? null : null;
};

// Adds a recipe. When the same address is already saved, it returns that
// one (with the new title and tags added) instead.
// Returns { item, existed } or null when the address is not valid.
export function addItem(doc, { url, title = '', note = '', tags = [] }, now, random) {
  const clean = cleanUrl(url);
  if (!clean) return null;
  const existing = findByUrl(doc, clean);
  if (existing) {
    const patch = {};
    if (title && !existing.title) patch.title = String(title).slice(0, 300);
    const more = parseTags(tags);
    if (more.length) patch.tags = parseTags([...existing.tags, ...more]);
    updateItem(doc, existing.id, patch, now);
    return { item: existing, existed: true };
  }
  const item = {
    id: newId(now, random),
    url: clean,
    title: String(title ?? '').trim().slice(0, 300),
    note: String(note ?? '').slice(0, MAX_TEXT),
    tags: parseTags(tags),
    status: 'todo',
    addedAt: now,
    updatedAt: now,
    doneAt: null,
  };
  doc.items.push(item);
  return { item, existed: false };
}

// Adds a recipe without a page, typed in by hand. Returns the item.
export function addManual(doc, { title = '', note = '', tags = [], recipe = null } = {}, now, random) {
  const item = {
    id: newId(now, random),
    url: '',
    title: String(title ?? '').trim().slice(0, 300),
    note: String(note ?? '').slice(0, MAX_TEXT),
    tags: parseTags(tags),
    status: 'todo',
    addedAt: now,
    updatedAt: now,
    doneAt: null,
  };
  const r = parseRecipe(recipe);
  if (r) item.recipe = r;
  doc.items.push(item);
  return item;
}

// A recipe without a page and with nothing typed in yet (a new one that
// was closed at once).
export const isBlank = (item) =>
  !item.url && !item.title && !item.note && !item.tags.length && !(item.recipe && parseRecipe(item.recipe));

// Changes the fields in patch that differ; stamps updatedAt when anything
// changed. patch.recipe = null removes the correction. Returns the item or
// null.
export function updateItem(doc, id, patch, now) {
  const item = doc.items.find((i) => i.id === id);
  if (!item) return null;
  const next = { ...item };
  if ('title' in patch) next.title = String(patch.title ?? '').trim().slice(0, 300);
  if ('note' in patch) next.note = String(patch.note ?? '').slice(0, MAX_TEXT);
  if ('tags' in patch) next.tags = parseTags(patch.tags);
  // An empty address makes it a recipe without a page; a wrong one is ignored.
  if ('url' in patch) next.url = String(patch.url ?? '').trim() ? (cleanUrl(patch.url) ?? item.url) : '';
  if ('status' in patch && STATUSES.includes(patch.status)) {
    next.status = patch.status;
    next.doneAt = patch.status === 'done' ? (item.status === 'done' ? item.doneAt : now) : null;
  }
  if ('recipe' in patch) {
    // An empty correction is kept: it hides a wrong recipe from the page.
    const r = patch.recipe ? (parseRecipe(patch.recipe) ?? { ingredients: [], steps: [] }) : null;
    if (r) next.recipe = r;
    else delete next.recipe;
  }
  if (stableJson(next) === stableJson(item)) return item;
  if (next.url !== item.url) delete next.meta; // the Action fetches the new page
  next.updatedAt = Math.max(now, item.updatedAt + 1);
  Object.keys(item).forEach((k) => delete item[k]);
  Object.assign(item, next);
  return item;
}

export const toggleDone = (doc, id, now) => {
  const item = doc.items.find((i) => i.id === id);
  return item ? updateItem(doc, id, { status: item.status === 'done' ? 'todo' : 'done' }, now) : null;
};

// Deletes a recipe and leaves a tombstone, so other devices delete it too.
export function deleteItem(doc, id, now) {
  const i = doc.items.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const [item] = doc.items.splice(i, 1);
  doc.tombstones[id] = now;
  return item;
}

// Undoes deleteItem (right after it, on the same device).
export function restoreItem(doc, item) {
  delete doc.tombstones[item.id];
  if (!doc.items.some((i) => i.id === item.id)) doc.items.push(item);
}

// Renames a tag on every recipe, or removes it when the new name is empty.
export function renameTag(doc, from, to, now) {
  const [target] = parseTags([to]);
  let n = 0;
  for (const item of doc.items) {
    if (!item.tags.includes(from)) continue;
    const tags = item.tags.map((t) => (t === from ? target : t)).filter(Boolean);
    updateItem(doc, item.id, { tags }, now);
    n++;
  }
  return n;
}

// ---------- reading and lists ----------

// Tags with the number of recipes, most used first.
export function tagCounts(items) {
  const counts = new Map();
  for (const i of items) for (const t of i.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl'));
}

// Lower case without accents, for search: "Łódź" -> "lodz".
export function fold(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase();
}

function haystack(item) {
  const m = item.meta ?? {};
  const r = recipeOf(item);
  const lines = (sections) => (sections ?? []).flatMap((s) => [s.name, ...s.items]);
  return fold(
    [item.title, item.url, domainOf(item.url), item.note, item.tags.join(' '), m.title, m.description, m.site, m.author, r?.yields, ...lines(r?.ingredients)]
      .filter(Boolean)
      .join(' \n '),
  );
}

// A search word without its last letter when it is long enough, so that
// "pomidory" finds "pomidorów" and "cukinia" finds "cukinie".
const stem = (w) => (w.length >= 5 ? w.slice(0, -1) : w);

// The recipes that match the filters. query: words that must all occur,
// in any field including the ingredients; "#tag" requires the tag.
// status: 'todo' | 'done' | 'all'. sort: 'added' (newest first; tried ones
// by the time they were tried) or 'opened' (by openedAt, { id: ms }, most
// recent first; recipes never opened after them, newest first).
export function filterItems(items, { query = '', status = 'all', tag = '', sort = 'added', openedAt = {} } = {}) {
  const words = [];
  const tags = tag ? [tag] : [];
  for (const w of String(query).trim().split(/\s+/).filter(Boolean)) {
    if (w.startsWith('#') && w.length > 1) tags.push(...parseTags([w]));
    else words.push(stem(fold(w)));
  }
  const out = items.filter(
    (i) =>
      (status === 'all' || i.status === status) &&
      tags.every((t) => i.tags.includes(t)) &&
      (!words.length || ((h) => words.every((w) => h.includes(w)))(haystack(i))),
  );
  const when = (i) => (status === 'done' ? (i.doneAt ?? i.addedAt) : i.addedAt);
  const opened = (i) => (sort === 'opened' && Number.isFinite(openedAt[i.id]) ? openedAt[i.id] : -Infinity);
  return out.sort((a, b) => opened(b) - opened(a) || when(b) - when(a) || (a.id < b.id ? 1 : -1));
}

// ---------- reading, checking and saving the document ----------

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const num = (x) => (Number.isFinite(x) ? x : null);

function parseMeta(m) {
  if (!isObj(m) || !Number.isFinite(m.fetchedAt)) return undefined;
  const out = { fetchedAt: m.fetchedAt };
  for (const k of ['title', 'description', 'site', 'author', 'lang', 'error', 'finalUrl', 'via']) {
    if (typeof m[k] === 'string' && m[k]) out[k] = m[k].slice(0, 1000);
  }
  if (typeof m.image === 'string' && /^https?:\/\//i.test(m.image)) out.image = m.image.slice(0, 2000);
  if (Number.isFinite(m.attempts)) out.attempts = m.attempts;
  const recipe = parseRecipe(m.recipe);
  if (recipe) out.recipe = recipe;
  return out;
}

function parseItem(x) {
  if (!isObj(x) || typeof x.id !== 'string' || !x.id) return null;
  const url = x.url === '' ? '' : cleanUrl(x.url);
  if (url === null) return null;
  const addedAt = num(x.addedAt) ?? num(x.updatedAt) ?? 0;
  const item = {
    id: x.id,
    url,
    title: typeof x.title === 'string' ? x.title.slice(0, 300) : '',
    note: typeof x.note === 'string' ? x.note.slice(0, MAX_TEXT) : '',
    tags: parseTags(Array.isArray(x.tags) ? x.tags : []),
    status: STATUSES.includes(x.status) ? x.status : 'todo',
    addedAt,
    updatedAt: num(x.updatedAt) ?? addedAt,
    doneAt: x.status === 'done' ? num(x.doneAt) : null,
  };
  // An empty correction (no lines at all) is kept: it hides the page recipe.
  if (isObj(x.recipe)) item.recipe = parseRecipe(x.recipe) ?? { ingredients: [], steps: [] };
  const meta = parseMeta(x.meta);
  if (meta) item.meta = meta;
  return item;
}

// A document from JSON (storage, the repository or a backup file), checked
// and completed; null when it is not a Przepisy document.
export function parseDoc(raw) {
  if (!isObj(raw) || !Array.isArray(raw.items)) return null;
  const tombstones = {};
  if (isObj(raw.tombstones)) {
    for (const [id, at] of Object.entries(raw.tombstones)) if (Number.isFinite(at)) tombstones[id] = at;
  }
  const seen = new Set();
  const items = [];
  for (const x of raw.items) {
    const item = parseItem(x);
    if (item && !seen.has(item.id) && !(item.id in tombstones)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return { przepisy: DOC_VERSION, items, tombstones };
}

export function loadDoc(storage) {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return (text && parseDoc(JSON.parse(text))) || emptyDoc();
  } catch {
    return emptyDoc();
  }
}

export function saveDoc(storage, doc) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

// ---------- merging copies from two devices ----------

// The newer of two versions of a recipe. Fields (the correction included)
// go by updatedAt; the page data (meta) go by fetchedAt, because the
// Action changes them without touching updatedAt.
function mergeItem(a, b) {
  let base;
  if (a.updatedAt !== b.updatedAt) base = a.updatedAt > b.updatedAt ? a : b;
  else base = stableJson({ ...a, meta: undefined }) >= stableJson({ ...b, meta: undefined }) ? a : b;
  const ma = a.meta?.fetchedAt ?? -1;
  const mb = b.meta?.fetchedAt ?? -1;
  let meta = ma >= mb ? a.meta : b.meta;
  // A changed address means the page data of the old one no longer apply.
  if (meta && meta !== base.meta && (ma >= mb ? a : b).url !== base.url) meta = base.meta;
  const out = { ...base, addedAt: Math.min(a.addedAt, b.addedAt) };
  if (meta) out.meta = meta;
  else delete out.meta;
  return out;
}

// Two recipes with the same address saved on different devices become one:
// the id of the earlier one, the newer fields, the tags of both. The other
// id gets a tombstone, so both devices arrive at the same result.
function dedupe(items, tombstones) {
  const byKey = new Map();
  for (const item of [...items].sort((a, b) => a.addedAt - b.addedAt || (a.id < b.id ? -1 : 1))) {
    const key = urlKey(item.url) ?? item.id;
    const first = byKey.get(key);
    if (!first) {
      byKey.set(key, item);
      continue;
    }
    const newer = item.updatedAt > first.updatedAt ? item : first;
    const merged = {
      ...newer,
      id: first.id,
      addedAt: first.addedAt,
      tags: parseTags([...first.tags, ...item.tags]),
      note: [first.note, item.note].filter(Boolean).filter((n, i, all) => all.indexOf(n) === i).join('\n\n').slice(0, MAX_TEXT),
      updatedAt: Math.max(first.updatedAt, item.updatedAt),
    };
    const meta = (first.meta?.fetchedAt ?? -1) >= (item.meta?.fetchedAt ?? -1) ? first.meta : item.meta;
    if (meta) merged.meta = meta;
    else delete merged.meta;
    byKey.set(key, merged);
    tombstones[item.id] = Math.max(tombstones[item.id] ?? 0, item.updatedAt);
  }
  return [...byKey.values()];
}

// Merges the local document with the one from the repository (or null).
// The result does not depend on which side is which.
export function mergeDocs(local, remote) {
  const a = parseDoc(local) ?? emptyDoc();
  const b = remote ? (parseDoc(remote) ?? emptyDoc()) : emptyDoc();
  const tombstones = { ...a.tombstones };
  for (const [id, at] of Object.entries(b.tombstones)) tombstones[id] = Math.max(tombstones[id] ?? 0, at);
  const byId = new Map();
  for (const item of [...a.items, ...b.items]) {
    if (item.id in tombstones) continue;
    const other = byId.get(item.id);
    byId.set(item.id, other ? mergeItem(other, item) : item);
  }
  const items = dedupe([...byId.values()], tombstones).sort((x, y) => x.addedAt - y.addedAt || (x.id < y.id ? -1 : 1));
  return { przepisy: DOC_VERSION, items, tombstones };
}

// JSON with sorted keys, to compare documents.
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

// Recipes still waiting for the Action.
export const waitingForMeta = (doc) => doc.items.some((i) => i.url && !i.meta);
