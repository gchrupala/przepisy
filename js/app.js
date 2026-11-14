// User interface: renders the views from the document in store.js and
// handles input, recipes shared from other apps and sync.

import { getLang, has, LANGS, pickLang, setLang, STRINGS, t } from './i18n.js';
import * as S from './store.js';
import { gitHubRemote, parsePerson, parseRepo, syncOnce, syncPath } from './sync.js';

const VERSION = '1';

const STATUS_TABS = [
  ['all', 'tabAll'],
  ['todo', 'tabTodo'],
  ['done', 'tabDone'],
];

const ICON = {
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 19H7a5 5 0 1 1 1.1-9.9A6 6 0 0 1 19.6 11a4 4 0 0 1-2.1 8Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  pot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6Z"/><path d="M2 10h20M10 7h4M9 4c0 1 1 1 1 2M14 4c0 1 1 1 1 2"/></svg>',
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M7 11H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};

const storage = openStorage();
let doc = S.loadDoc(storage);
let saveFailed = !storage;

const PREFS_KEY = 'przepisy:prefs';
const prefs = { status: 'all', tag: '', sort: 'added', lang: 'auto', text: 'normal', ...readJson(PREFS_KEY) };

// The interface language: chosen in settings ('pl' | 'en') or, with
// 'auto', the browser's.
function applyLang() {
  setLang(pickLang(prefs.lang, navigator.languages ?? [navigator.language]));
  document.documentElement.lang = getLang();
}
applyLang();

// The size of the text: 'normal' | 'large' | 'larger' (styles.css scales
// the root font size, and with it everything sized in rem).
const TEXT_SIZES = ['normal', 'large', 'larger'];
function applyTextSize() {
  document.documentElement.dataset.text = TEXT_SIZES.includes(prefs.text) ? prefs.text : 'normal';
}
applyTextSize();

// When each recipe was last opened on this device: { id: ms }. Kept apart
// from the data, so opening a recipe does not start a sync.
const OPENED_KEY = 'przepisy:opened';
const openedAt = readJson(OPENED_KEY);

function markOpened(id) {
  openedAt[id] = Date.now();
  for (const k of Object.keys(openedAt)) if (!doc.items.some((i) => i.id === k)) delete openedAt[k];
  try {
    storage?.setItem(OPENED_KEY, JSON.stringify(openedAt));
  } catch {
    // The order then lasts until the page closes.
  }
}

const ui = {
  view: 'list', // 'list' | 'recipe' | 'settings'
  recipeId: null,
  query: '',
  editId: null,
  editMode: 'item', // 'item' (title, tags, note) | 'recipe' (the recipe itself)
  editIntro: '', // text above the edit form, e.g. after sharing
  editBase: null, // the recipe form as it was when opened
  editNew: false, // a new recipe without a page: it goes when closed empty
  checked: new Set(), // ingredients and steps ticked off while cooking
  scale: new Map(), // recipe id -> multiplier of the ingredient amounts, while the app is open
  wake: null, // the screen wake lock while it is held
  wantWake: false,
  toast: null, // { text, action, run }
  toastTimer: 0,
  confirmDelete: false,
  confirmDisconnect: false,
  syncRepo: null,
  syncPerson: null,
  syncToken: null,
  syncError: null,
  syncConnecting: false,
  syncFrom: null, // the key of another app whose connection filled in the form
  importMsg: '',
};

const app = document.getElementById('app');
const sheet = document.getElementById('sheet');

function openStorage() {
  try {
    const ls = window.localStorage;
    ls.setItem('przepisy:probe', '1');
    ls.removeItem('przepisy:probe');
    return ls;
  } catch {
    return null;
  }
}

function readJson(key) {
  try {
    return JSON.parse(storage?.getItem(key) ?? 'null') ?? {};
  } catch {
    return {};
  }
}

function savePrefs() {
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Filters then last until the page closes.
  }
}

function persist() {
  if (!S.saveDoc(storage, doc)) saveFailed = true;
  scheduleSync();
}

const itemById = (id) => doc.items.find((i) => i.id === id) ?? null;

// ---------- sync with GitHub ----------
//
// The connection (repository, person and token) is kept on this device
// only, under its own key, so it never goes into a backup file or into the
// shared data. The data go to <person>/przepisy.json in the repository.

const SYNC_KEY = 'przepisy:sync';
const SYNC_DELAY = 5000;
const DEFAULT_SYNC_REPO = 'gchrupala/app-data';
// Recipes for new pages come from a GitHub Action a minute or two after a
// push; look for them a few times while the app is open.
const META_CHECK_DELAY = 60000;
const META_CHECKS = 5;
let syncConfig = loadSyncConfig();
const sync = { busy: false, again: false, timer: 0, metaTimer: 0, metaChecks: 0 };

function loadSyncConfig() {
  const c = readJson(SYNC_KEY);
  if (c?.repo && c?.token && c?.person) return c;
  // Doczytania and Myo on the same site use the same kind of connection: offer it.
  for (const key of ['doczytania:sync', 'myo:sync']) {
    const other = readJson(key);
    if (other?.repo && other?.token) {
      Object.assign(ui, { syncRepo: other.repo, syncPerson: other.person ?? '', syncToken: other.token, syncFrom: key });
      break;
    }
  }
  return null;
}

const remoteFor = (c) => gitHubRemote({ repo: c.repo, token: c.token, path: syncPath(c.person) });

function saveSyncConfig() {
  try {
    if (syncConfig) storage?.setItem(SYNC_KEY, JSON.stringify(syncConfig));
    else storage?.removeItem(SYNC_KEY);
  } catch {
    // Without storage the connection lasts until the page closes.
  }
}

function scheduleSync(delay = SYNC_DELAY) {
  if (!syncConfig) return;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(syncNow, delay);
}

async function syncNow() {
  const config = syncConfig;
  if (!config) return;
  if (sync.busy) {
    sync.again = true;
    return;
  }
  clearTimeout(sync.timer);
  sync.timer = 0;
  sync.busy = true;
  render();
  let result = { error: null };
  try {
    await syncOnce({
      remote: remoteFor(config),
      getLocal: () => doc,
      apply: (merged) => {
        doc = merged;
        if (!S.saveDoc(storage, doc)) saveFailed = true;
      },
      now: Date.now(),
    });
    result = { lastSyncAt: Date.now(), error: null };
  } catch (e) {
    // Being offline is not shown as an error; the next change, a return to
    // the app or getting back online tries again.
    result = e?.kind === 'network' ? {} : { error: e?.kind ?? 'bad' };
  } finally {
    sync.busy = false;
    if (syncConfig === config) {
      syncConfig = { ...config, ...result };
      saveSyncConfig();
    }
    render();
    if (sync.again) {
      sync.again = false;
      scheduleSync(1000);
    } else {
      watchForMeta();
    }
  }
}

function watchForMeta() {
  clearTimeout(sync.metaTimer);
  if (!syncConfig || syncConfig.error || !S.waitingForMeta(doc) || sync.metaChecks >= META_CHECKS) return;
  sync.metaTimer = setTimeout(() => {
    sync.metaChecks += 1;
    if (document.visibilityState === 'visible') syncNow();
  }, META_CHECK_DELAY);
}

async function connectSync(repoInput, personInput, tokenInput) {
  const repo = parseRepo(repoInput);
  const person = parsePerson(personInput);
  const token = String(tokenInput ?? '').trim();
  Object.assign(ui, { syncRepo: repoInput, syncPerson: personInput, syncToken: token, syncError: null, syncFrom: null });
  if (!repo) ui.syncError = 'repoFormat';
  else if (!person) ui.syncError = 'person';
  else if (!token) ui.syncError = 'token';
  if (ui.syncError) {
    render();
    return;
  }
  ui.syncConnecting = true;
  render();
  try {
    await remoteFor({ repo, person, token }).checkRepo();
    syncConfig = { repo, person, token, lastSyncAt: null, error: null };
    saveSyncConfig();
    Object.assign(ui, { syncRepo: null, syncPerson: null, syncToken: null, syncConnecting: false });
    await syncNow();
  } catch (e) {
    Object.assign(ui, { syncError: e?.kind ?? 'bad', syncConnecting: false });
    render();
  }
}

const syncErrorText = (kind) => t(has(`syncErr_${kind}`) ? `syncErr_${kind}` : 'syncErr_bad');

// ---------- formatting ----------

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Date formats of the current language, made once per language.
const formats = {};
function fmt() {
  const lang = getLang();
  formats[lang] ??= {
    rtf: new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }),
    date: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }),
  };
  return formats[lang];
}

function ago(ms, now = Date.now()) {
  const f = fmt();
  const s = (ms - now) / 1000;
  if (s > -60) return t('justNow');
  if (s > -3600) return f.rtf.format(Math.round(s / 60), 'minute');
  const day = (d) => new Date(d).setHours(0, 0, 0, 0);
  const days = Math.round((day(ms) - day(now)) / 86400000);
  if (days === 0) return t('todayAt', f.time.format(ms));
  if (days > -7) return f.rtf.format(days, 'day');
  return f.date.format(ms);
}

// "Dla 4 osób · 45 min"
function factsOf(recipe) {
  return [S.yieldsLabel(recipe?.yields, getLang()), S.timeLabel(recipe?.time, getLang())].filter(Boolean).join(' · ');
}

const titleOf = (item) => S.titleOf(item, getLang());

// A link-like button inside a sentence.
const actionLink = (action) => (text) => `<button type="button" class="link" data-action="${action}">${text}</button>`;

// ---------- views ----------

function render() {
  const focus = rememberFocus();
  if (ui.view === 'recipe' && !itemById(ui.recipeId)) ui.view = 'list';
  const recipe = ui.view === 'recipe' ? itemById(ui.recipeId) : null;
  document.title = ui.view === 'settings' ? `${t('settings')} — Przepisy` : recipe ? `${titleOf(recipe)} — Przepisy` : 'Przepisy';
  const open = [...app.querySelectorAll('details[open][id]')].map((d) => d.id);
  app.innerHTML = ui.view === 'settings' ? settingsView() : recipe ? recipeView(recipe) : listView();
  for (const id of open) document.getElementById(id)?.setAttribute('open', '');
  renderSheet();
  renderToast();
  restoreFocus(focus);
}

function rememberFocus() {
  const el = document.activeElement;
  if (!el?.id || !app.contains(el)) return null;
  return { id: el.id, start: el.selectionStart, end: el.selectionEnd };
}

function restoreFocus(f) {
  if (!f) return;
  const el = document.getElementById(f.id);
  if (!el) return;
  el.focus({ preventScroll: true });
  if (f.start != null && el.setSelectionRange) {
    try {
      el.setSelectionRange(f.start, f.end);
    } catch {
      // Some input types have no selection.
    }
  }
}

function syncButton() {
  if (!syncConfig) return '';
  const state = sync.busy ? 'busy' : syncConfig.error ? 'error' : 'ok';
  const label = sync.busy
    ? t('syncing')
    : syncConfig.error
      ? t('syncNotWorking')
      : syncConfig.lastSyncAt
        ? t('syncedAgo', ago(syncConfig.lastSyncAt))
        : t('syncNow');
  return `<button class="icon-btn sync-${state}" type="button" data-action="${syncConfig.error ? 'settings' : 'sync-now'}" title="${esc(label)}" aria-label="${esc(label)}">${ICON.cloud}</button>`;
}

function notices() {
  const out = [];
  if (saveFailed) out.push(`<p class="notice">${t('noStorage')}</p>`);
  if (syncConfig?.error) out.push(`<button class="notice notice-link" type="button" data-action="settings">${t('syncBroken')}</button>`);
  return out.join('');
}

// PL | EN on the list: the current language stands out. A choice made
// here replaces 'auto'; settings can go back to it.
function langToggle() {
  const option = (l) =>
    `<button type="button" lang="${l}" data-action="lang" data-value="${l}" aria-pressed="${getLang() === l}" title="${LANG_NAMES[l]}">${l.toUpperCase()}</button>`;
  return `<div class="lang-toggle" role="group" aria-label="${t('language')}">${LANGS.map(option).join('<span aria-hidden="true">|</span>')}</div>`;
}

function listView() {
  return `<header class="bar">
      <h1>Przepisy</h1>
      <div class="bar-actions">${langToggle()}${syncButton()}<button class="icon-btn" type="button" data-action="new-recipe" aria-label="${t('newRecipe')}" title="${t('newRecipe')}">${ICON.plus}</button><button class="icon-btn" type="button" data-action="settings" aria-label="${t('settings')}" title="${t('settings')}">${ICON.gear}</button></div>
    </header>
    ${notices()}
    <form class="search" id="search-form" role="search">
      <span class="search-icon">${ICON.search}</span>
      <input id="q" type="search" enterkeyhint="search" placeholder="${t('search')}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(ui.query)}" aria-label="${t('search')}">
      <span id="search-actions" class="search-actions">${searchActions()}</span>
    </form>
    <div id="results">${results()}</div>`;
}

const pastedUrl = () => (/\s/.test(ui.query.trim()) ? null : S.cleanUrl(ui.query));

function searchActions() {
  const pasted = pastedUrl();
  return `${ui.query ? `<button class="icon-btn small" type="button" data-action="clear-query" aria-label="${t('clear')}">${ICON.close}</button>` : ''}
    ${pasted ? `<button class="btn primary" type="submit">${t('add')}</button>` : navigator.clipboard?.readText && !ui.query ? `<button class="btn" type="button" data-action="paste">${t('paste')}</button>` : ''}`;
}

function results() {
  const all = doc.items;
  const counts = { todo: 0, done: 0, all: all.length };
  for (const i of all) counts[i.status] += 1;
  const scoped = prefs.status === 'all' ? all : all.filter((i) => i.status === prefs.status);
  const tags = S.tagCounts(scoped);
  if (prefs.tag && !tags.some(([t]) => t === prefs.tag)) prefs.tag = '';
  const items = S.filterItems(all, { query: ui.query, status: prefs.status, tag: prefs.tag, sort: prefs.sort, openedAt });
  const pasted = pastedUrl();
  const known = pasted && S.findByUrl(doc, pasted);

  const tabs = STATUS_TABS.map(
    ([key, label]) =>
      `<button type="button" role="tab" aria-selected="${prefs.status === key}" data-action="status" data-status="${key}">${t(label)} <span class="count">${counts[key]}</span></button>`,
  ).join('');

  const chip = (value, label, count, on) =>
    `<button type="button" class="chip${on ? ' on' : ''}" aria-pressed="${on}" data-action="tag" data-value="${esc(value)}">${esc(label)} <span class="count">${count}</span></button>`;
  const tagChips = tags.map(([t, n]) => chip(t, `#${t}`, n, prefs.tag === t)).join('');
  const filters = tagChips ? `<div class="chips" aria-label="${t('filters')}">${tagChips}</div>` : '';
  const sortOption = (key, label) => `<option value="${key}"${prefs.sort === key ? ' selected' : ''}>${label}</option>`;
  const sorter = all.length > 1
    ? `<label class="sort">${t('sortLabel')} <select id="sort" data-action="sort">${sortOption('added', t('sortAdded'))}${sortOption('opened', t('sortOpened'))}</select></label>`
    : '';

  let body;
  if (items.length) body = `<ul class="items">${items.map(itemView).join('')}</ul>`;
  else if (!all.length) body = pasted ? '' : emptyHelp();
  else if (pasted) body = '';
  else body = `<p class="empty">${t('nothingMatches')}${ui.query || prefs.tag ? `. ${actionLink('clear-filters')(t('showAll'))}` : '.'}</p>`;

  const addHint = pasted
    ? `<p class="add-hint">${known ? t('hintKnown') : t('hintLink')}</p>`
    : '';
  return `${addHint}<div class="tabs" role="tablist">${tabs}</div>${filters}${sorter}${body}`;
}

// While typing in the search field only the results change, so the field
// (and the phone keyboard) stays as it is.
function renderResults() {
  const actions = document.getElementById('search-actions');
  const box = document.getElementById('results');
  if (!actions || !box) return render();
  actions.innerHTML = searchActions();
  box.innerHTML = results();
}

const imageTag = (item, cls) =>
  item.meta?.image ? `<img class="${cls}" src="${esc(item.meta.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';

// What the list says about a recipe that has none yet.
function recipeState(item) {
  if (S.recipeOf(item)) return '';
  if (!item.url) return t('stateBlank');
  if (!item.meta) return t('stateWaiting');
  return item.meta.error ? t('stateFailed') : t('stateNone');
}

function itemView(item) {
  const recipe = S.recipeOf(item);
  const done = item.status === 'done';
  const info = [esc(item.url ? S.siteOf(item) : t('ownRecipeShort')), esc(factsOf(recipe)), recipeState(item), done ? t('triedShort') : ''].filter(Boolean).join(' · ');
  const tags = item.tags.length
    ? `<div class="item-tags">${item.tags.map((t) => `<button type="button" class="tag" data-action="tag" data-value="${esc(t)}">#${esc(t)}</button>`).join('')}</div>`
    : '';
  return `<li class="item${done ? ' done' : ''}" data-id="${esc(item.id)}">
    <button type="button" class="item-open" data-action="open">
      <span class="thumb">${imageTag(item, 'thumb-img')}${ICON.pot}</span>
      <span class="item-body">
        <span class="item-title">${esc(titleOf(item))}</span>
        <span class="item-info">${info}</span>
      </span>
    </button>
    ${tags}
  </li>`;
}

function emptyHelp() {
  return `<div class="empty help">
    <p><strong>${t('emptyTitle')}</strong></p>
    <p>${t('emptyBody', actionLink('settings'))}</p>
  </div>`;
}

// ---------- one recipe ----------

function recipeNotice(item) {
  const recipe = S.recipeOf(item);
  const meta = item.meta;
  if (item.recipe && !item.recipe.ingredients.length && !item.recipe.steps.length && !item.recipe.yields) {
    return `<p class="notice">${t('pageRecipeHidden')} ${actionLink('recipe-reset')(t('showAgain'))}</p>`;
  }
  if (recipe) return '';
  if (!item.url) return `<p class="notice">${t('recipeBlank')} ${actionLink('edit-recipe')(t('fillIn'))}</p>`;
  if (!meta) return `<p class="notice">${syncConfig ? t('recipeSoon') : t('recipeNeedsSync', actionLink('settings'))}</p>`;
  if (meta.error) return `<p class="notice">${t('fetchFailed', esc(meta.error), (meta.attempts ?? 1) < 3)}</p>`;
  return `<p class="notice">${t('noRecipeFound', meta.via === 'page')}</p>`;
}

// A recipe line as HTML: escaped, with the bold of the site kept.
const rich = (text) => S.textSpans(text).map((p) => (p.strong ? `<strong>${esc(p.text)}</strong>` : esc(p.text))).join('');

// The number of people (when the recipe gives one) or a multiplier, with
// buttons to change it. The ingredient amounts follow.
function scaler(recipe, factor) {
  const n = S.servingsOf(recipe.yields);
  const base = n && n.min === n.max ? n.min : null;
  const value = base ? t('scaledServings', Math.round(base * factor)) : t('scaledFactor', esc(S.formatAmount(factor)));
  const btn = (step, label, text) => `<button class="icon-btn small" type="button" data-action="scale" data-step="${step}" aria-label="${label}" title="${label}">${text}</button>`;
  return `<div class="scaler" role="group" aria-label="${t('amounts')}">${btn(-1, base ? t('fewerPeople') : t('less'), '−')}<span aria-live="polite">${value}</span>${btn(1, base ? t('morePeople') : t('more'), '+')}</div>`;
}

function rescale(id, step) {
  const recipe = S.recipeOf(itemById(id));
  if (!recipe) return;
  const factor = ui.scale.get(id) ?? 1;
  const n = S.servingsOf(recipe.yields);
  let next;
  if (n && n.min === n.max) {
    next = Math.max(1, Math.round(n.min * factor) + step) / n.min;
  } else {
    const i = S.FACTORS.findIndex((f) => f >= factor - 1e-9);
    next = S.FACTORS[Math.min(S.FACTORS.length - 1, Math.max(0, (i < 0 ? S.FACTORS.length - 1 : i) + step))];
  }
  if (next === 1) ui.scale.delete(id);
  else ui.scale.set(id, next);
  render();
}

function checklist(id, kind, sections, lineOf = (line) => line) {
  let n = 0;
  return sections
    .map((s, g) => {
      const head = s.name ? `<h3>${rich(s.name)}</h3>` : '';
      const start = n + 1;
      const items = s.items
        .map((text, i) => {
          n += 1;
          const key = `${id}|${kind}|${g}|${i}`;
          const box = `<input type="checkbox" data-check="${esc(key)}"${ui.checked.has(key) ? ' checked' : ''}>`;
          return kind === 'i'
            ? `<li><label class="tick">${box}<span>${rich(lineOf(text))}</span></label></li>`
            : `<li><label class="step">${box}<span class="step-num" aria-hidden="true">${n}</span><span>${rich(text)}</span></label></li>`;
        })
        .join('');
      return `${head}<${kind === 'i' ? 'ul' : `ol start="${start}"`} class="checklist">${items}</${kind === 'i' ? 'ul' : 'ol'}>`;
    })
    .join('');
}

function recipeView(item) {
  const recipe = S.recipeOf(item);
  const done = item.status === 'done';
  const facts = factsOf(recipe);
  const author = item.meta?.author && item.meta.author !== S.siteOf(item) ? ` · ${esc(item.meta.author)}` : '';
  const tags = item.tags.length
    ? `<div class="item-tags">${item.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>`
    : '';
  const factor = ui.scale.get(item.id) ?? 1;
  const decimal = /^en/i.test(item.meta?.lang ?? '') ? '.' : ',';
  const ingredients = recipe?.ingredients.length
    ? `<section class="part"><div class="part-head"><h2>${t('ingredients')}</h2>${scaler(recipe, factor)}</div>${checklist(item.id, 'i', recipe.ingredients, (line) => S.scaleLine(line, factor, decimal))}</section>`
    : '';
  const steps = recipe?.steps.length ? `<section class="part"><h2>${t('method')}</h2>${checklist(item.id, 's', recipe.steps)}</section>` : '';
  const hasContent = recipe && (recipe.ingredients.length || recipe.steps.length || recipe.yields);
  const wake =
    'wakeLock' in navigator && hasContent
      ? `<button class="icon-btn${ui.wake ? ' wake-on' : ''}" type="button" data-action="wake" aria-pressed="${Boolean(ui.wake)}" aria-label="${t('keepAwake')}" title="${ui.wake ? t('wakeOn') : t('keepAwake')}">${ICON.sun}</button>`
      : '';
  const sourceKind = item.url ? S.recipeSource(item) : recipe && 'own';
  const source = sourceKind ? t(`source_${sourceKind}`) : '';
  const origin = item.url
    ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(S.siteOf(item))} ${ICON.out}</a>${author}`
    : t('ownRecipe');
  return `<header class="bar">
      <button class="icon-btn" type="button" data-action="back" aria-label="${t('back')}" title="${t('back')}">${ICON.back}</button>
      <div class="bar-actions">${wake}${syncButton()}<button class="icon-btn" type="button" data-action="share" aria-label="${t('share')}" title="${t('share')}">${ICON.share}</button><button class="icon-btn" type="button" data-action="edit" aria-label="${t('titleTagsNote')}" title="${t('titleTagsNote')}">${ICON.edit}</button></div>
    </header>
    ${notices()}
    <article class="recipe" data-id="${esc(item.id)}">
      ${imageTag(item, 'hero')}
      <h1 class="recipe-title">${esc(titleOf(item))}</h1>
      <p class="recipe-source">${origin}</p>
      ${facts ? `<p class="recipe-facts">${esc(facts)}</p>` : ''}
      ${tags}
      ${item.note ? `<p class="item-note">${esc(item.note)}</p>` : ''}
      ${recipeNotice(item)}
      ${ingredients}
      ${steps}
      <div class="row recipe-actions">
        <button class="btn${done ? ' on' : ''}" type="button" data-action="toggle" aria-pressed="${done}">${ICON.check} ${t('tried')}</button>
        <button class="btn" type="button" data-action="edit-recipe">${hasContent ? t('correctRecipe') : t('enterRecipe')}</button>
      </div>
      ${source ? `<p class="field-note">${source}</p>` : ''}
    </article>`;
}

function openRecipe(id) {
  markOpened(id);
  ui.view = 'recipe';
  ui.recipeId = id;
  pushNav('recipe', { id });
  render();
  window.scrollTo(0, 0);
}

// The screen stays on while a recipe is open, when asked for. The browser
// lets the lock go when the app is hidden; it is taken again on return.
async function setWake(on) {
  ui.wantWake = on;
  if (!on) {
    const lock = ui.wake;
    ui.wake = null;
    await lock?.release().catch(() => {});
    return;
  }
  if (ui.wake || !('wakeLock' in navigator)) return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    ui.wake = lock;
    lock.addEventListener('release', () => {
      if (ui.wake === lock) ui.wake = null;
      if (ui.view === 'recipe') render();
    });
  } catch {
    ui.wantWake = false;
    toast(t('wakeRefused'));
  }
}

// ---------- edit sheet ----------

function renderSheet() {
  const item = ui.editId && itemById(ui.editId);
  if (!item) {
    if (sheet.open) sheet.close();
    sheet.dataset.key = '';
    ui.editId = null;
    return;
  }
  const key = `${ui.editMode}:${item.id}`;
  if (sheet.open && sheet.dataset.key === key) return; // keep what is being typed
  sheet.dataset.key = key;
  sheet.setAttribute('aria-label', ui.editMode === 'recipe' ? t('editRecipe') : t('titleTagsNote'));
  sheet.innerHTML = ui.editMode === 'recipe' ? recipeForm(item) : itemForm(item);
  if (!sheet.open) {
    sheet.showModal();
    if (ui.editNew) sheet.querySelector('#r-title')?.focus();
    else if (ui.editIntro) sheet.querySelector('#f-tags')?.focus();
    else sheet.querySelector('.sheet-head button')?.focus();
  }
}

function itemForm(item) {
  const known = S.tagCounts(doc.items).map(([t]) => t);
  const suggestions = known.length
    ? `<div class="chips tag-suggest" aria-label="${t('yourTags')}">${known
        .slice(0, 40)
        .map((t) => `<button type="button" class="chip${item.tags.includes(t) ? ' on' : ''}" data-action="sheet-tag" data-value="${esc(t)}">#${esc(t)}</button>`)
        .join('')}</div>`
    : '';
  const page = item.meta?.title && item.meta.title !== item.title ? `<p class="field-note">${t('pageTitle', esc(item.meta.title))}</p>` : '';
  return `<form method="dialog" id="edit-form" class="edit">
    <div class="sheet-head">
      <h2>${ui.editIntro ? esc(ui.editIntro) : t('edit')}</h2>
      <button type="button" class="icon-btn small" data-action="sheet-close" aria-label="${t('close')}">${ICON.close}</button>
    </div>
    ${item.url ? `<a class="sheet-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(S.prettyUrl(item.url))}</a>` : ''}
    ${ui.editIntro && item.url && !item.meta ? `<p class="field-note">${syncConfig ? t('afterSync') : t('withoutSync')}</p>` : ''}
    <label for="f-title">${t('title')}</label>
    <input id="f-title" name="title" type="text" value="${esc(item.title)}" placeholder="${esc(item.meta?.title || item.sharedTitle || (item.url ? S.prettyUrl(item.url) : ''))}">
    ${page}
    <label for="f-tags">${t('tags')} <span class="hint">${t('tagsHint')}</span></label>
    <input id="f-tags" name="tags" type="text" value="${esc(item.tags.join(', '))}" autocapitalize="off" spellcheck="false">
    ${suggestions}
    <label for="f-note">${t('note')}</label>
    <textarea id="f-note" name="note" rows="3">${esc(item.note)}</textarea>
    <label for="f-url">${t('address')}${item.url ? '' : ` <span class="hint">${t('addressHint')}</span>`}</label>
    <input id="f-url" name="url" type="url" value="${esc(item.url)}" autocapitalize="off" spellcheck="false">
    <label class="check-row"><input type="checkbox" name="done"${item.status === 'done' ? ' checked' : ''}> ${t('tried')}</label>
    <div class="sheet-actions">
      <button type="button" class="btn${ui.confirmDelete ? ' danger' : ''}" data-action="delete">${ui.confirmDelete ? t('confirmDelete') : t('delete')}</button>
      <button type="submit" class="btn primary">${t('done')}</button>
    </div>
  </form>`;
}

function recipeForm(item) {
  const f = ui.editBase ?? S.recipeToForm(null);
  const reset = item.recipe && item.meta?.recipe ? `<button type="button" class="btn" data-action="recipe-reset">${t('restorePage')}</button>` : '<span></span>';
  return `<form method="dialog" id="recipe-form" class="edit">
    <div class="sheet-head">
      <h2>${t('recipe')}</h2>
      <button type="button" class="icon-btn small" data-action="sheet-close" aria-label="${t('close')}">${ICON.close}</button>
    </div>
    <p class="field-note">${t('formHelp')}</p>
    ${item.url ? '' : `<label for="r-title">${t('title')}</label>
    <input id="r-title" name="title" type="text" value="${esc(item.title)}">`}
    <label for="r-yields">${t('servings')}</label>
    <input id="r-yields" name="yields" type="text" value="${esc(f.yields)}" placeholder="${esc(t('servingsExample'))}">
    <label for="r-ingredients">${t('ingredients')}</label>
    <textarea id="r-ingredients" name="ingredients" rows="8">${esc(f.ingredients)}</textarea>
    <label for="r-steps">${t('steps')}</label>
    <textarea id="r-steps" name="steps" rows="10">${esc(f.steps)}</textarea>
    <div class="sheet-actions">
      ${reset}
      <button type="submit" class="btn primary">${t('done')}</button>
    </div>
  </form>`;
}

function openEdit(id, mode = 'item', intro = '', isNew = false) {
  ui.editId = id;
  ui.editMode = mode;
  ui.editIntro = intro;
  ui.editBase = mode === 'recipe' ? S.recipeToForm(S.recipeOf(itemById(id))) : null;
  ui.confirmDelete = false;
  ui.editNew = isNew;
  pushNav('edit');
  render();
}

function saveSheet() {
  if (!ui.editId) return;
  if (ui.editMode === 'recipe') {
    const form = sheet.querySelector('#recipe-form');
    if (!form) return;
    const f = new FormData(form);
    if (f.has('title')) S.updateItem(doc, ui.editId, { title: f.get('title') }, Date.now());
    const typed = { yields: f.get('yields'), ingredients: f.get('ingredients'), steps: f.get('steps') };
    // Unchanged: nothing to save, even when the recipe from the page
    // arrived while the form was open.
    if (S.stableJson(typed) !== S.stableJson(ui.editBase)) S.editRecipe(doc, ui.editId, typed, Date.now());
    persist();
    return;
  }
  const form = sheet.querySelector('#edit-form');
  if (!form) return;
  const f = new FormData(form);
  S.updateItem(
    doc,
    ui.editId,
    {
      title: f.get('title'),
      tags: f.get('tags'),
      note: f.get('note'),
      url: f.get('url'),
      status: f.get('done') ? 'done' : 'todo',
    },
    Date.now(),
  );
  persist();
}

function closeSheet() {
  // A new recipe without a page closed before anything was typed goes.
  const item = ui.editNew && ui.editId && itemById(ui.editId);
  ui.editNew = false;
  if (item && S.isBlank(item)) {
    S.deleteItem(doc, item.id, Date.now());
    persist();
    ui.editIntro = '';
    ui.editBase = null;
    goHome();
    return;
  }
  ui.editId = null;
  ui.editIntro = '';
  ui.editBase = null;
  ui.confirmDelete = false;
  if (navDepth() && history.state?.screen === 'edit') history.back();
  render();
}

// ---------- settings ----------

// Settings show the controls; explanations wait in collapsed parts.
function settingsView() {
  const base = new URL('./', location.href).href;
  const bookmarklet = `javascript:(()=>{window.open('${base}?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'przepisy')})()`;
  const tags = S.tagCounts(doc.items);
  const code = (text) => `<a href="https://github.com/gchrupala/przepisy" target="_blank" rel="noopener">${text}</a>`;
  return `<header class="bar">
      <button class="icon-btn" type="button" data-action="back" aria-label="${t('back')}">${ICON.back}</button>
      <h1>${t('settings')}</h1>
      <span></span>
    </header>
    ${notices()}
    ${syncSection()}
    ${langSection()}
    ${textSizeSection()}
    <section>
      <h2>${t('backup')}</h2>
      <div class="row">
        <button class="btn" type="button" data-action="export">${t('download')}</button>
        <label class="btn file-btn">${t('load')}<input type="file" accept="application/json,.json" data-action="import" hidden></label>
      </div>
      ${ui.importMsg ? `<p class="field-note" role="status">${esc(ui.importMsg)}</p>` : ''}
    </section>
    ${tags.length ? tagsSection(tags) : ''}
    <section>
      <h2>${t('help')}</h2>
      ${more('help-android', t('helpAndroid'), `<p>${t('android')}</p>`)}
      ${more(
        'help-ios',
        t('helpIos'),
        `<p>${t('iosIntro')}</p>
        <ol>
          <li>${t('iosStep1')}</li>
          <li>${t('iosStep2', `<code>${esc(base)}?url=</code>`)}</li>
          <li>${t('iosStep3')}</li>
        </ol>
        <p class="field-note">${t('iosNote')}</p>`,
      )}
      ${more('help-computer', t('helpComputer'), `<p>${t('bookmarklet', `<a class="btn bookmarklet" href="${esc(bookmarklet)}" data-action="bookmarklet">+ Przepisy</a>`)}</p>`)}
      ${more('help-source', t('whereFrom'), `<p>${t('whereFromBody')}</p><p class="field-note">${t('whereFromNote')}</p>`)}
    </section>
    <p class="version">${t('version', VERSION, code)}</p>`;
}

// A collapsed part; the id keeps it open across renders.
const more = (id, summary, body) => `<details id="${id}"><summary>${summary}</summary>${body}</details>`;

// The language names stay in their own language, and the heading is in
// both, so the switch is easy to find in a language one cannot read.
const LANG_NAMES = { pl: 'Polski', en: 'English' };

function langSection() {
  const other = LANGS.find((l) => l !== getLang());
  const option = (value, label) =>
    `<button class="btn${prefs.lang === value ? ' on' : ''}" type="button" data-action="lang" data-value="${value}" aria-pressed="${prefs.lang === value}">${label}</button>`;
  return `<section>
    <h2>${t('language')} · ${STRINGS[other].language}</h2>
    <div class="row">${option('auto', t('langAuto'))}${LANGS.map((l) => option(l, LANG_NAMES[l])).join('')}</div>
  </section>`;
}

function textSizeSection() {
  const current = document.documentElement.dataset.text;
  const labels = { normal: t('textNormal'), large: t('textLarge'), larger: t('textLarger') };
  const option = (value) =>
    `<button class="btn${current === value ? ' on' : ''}" type="button" data-action="text-size" data-value="${value}" aria-pressed="${current === value}">${labels[value]}</button>`;
  return `<section>
    <h2>${t('textSize')}</h2>
    <div class="row">${TEXT_SIZES.map(option).join('')}</div>
  </section>`;
}

function tagsSection(tags) {
  return `<section>
    <h2>${t('tags')}</h2>
    <ul class="tag-list">${tags
      .map(
        ([tag, n]) => `<li><span>#${esc(tag)} <span class="count">${n}</span></span>
        <span class="row"><button class="btn small" type="button" data-action="rename-tag" data-value="${esc(tag)}">${t('rename')}</button>
        <button class="btn small" type="button" data-action="remove-tag" data-value="${esc(tag)}">${t('delete')}</button></span></li>`,
      )
      .join('')}</ul>
  </section>`;
}

const SYNC_FROM = { 'doczytania:sync': 'doczytania', 'myo:sync': 'myo' };

function syncSection() {
  const c = syncConfig;
  const error = c ? c.error : ui.syncError;
  const errorHtml = error ? `<p class="error" role="alert">${esc(syncErrorText(error))}</p>` : '';
  const head = `<h2>${t('syncHead')}</h2>`;
  if (c) {
    const status = sync.busy ? t('syncing') : c.lastSyncAt ? t('lastSync', ago(c.lastSyncAt)) : t('neverSynced');
    return `<section>${head}
      <p>${t('connectedTo', esc(c.repo), esc(syncPath(c.person)))}</p>
      <p class="field-note" role="status">${esc(status)}</p>
      ${errorHtml}
      <div class="row">
        <button class="btn" type="button" data-action="sync-now"${sync.busy ? ' disabled' : ''}>${t('syncNow')}</button>
        <button class="btn${ui.confirmDisconnect ? ' danger' : ''}" type="button" data-action="sync-off">${ui.confirmDisconnect ? t('confirmDisconnect') : t('disconnect')}</button>
      </div>
      ${ui.confirmDisconnect ? `<p class="field-note">${t('disconnectNote')}</p>` : ''}
    </section>`;
  }
  const from = ui.syncToken && !ui.syncError && SYNC_FROM[ui.syncFrom] ? `<p class="field-note">${t('filledFrom', SYNC_FROM[ui.syncFrom])}</p>` : '';
  const newRepo = '<a href="https://github.com/new?name=app-data&amp;visibility=private" target="_blank" rel="noopener">github.com/new</a>';
  const newToken =
    '<a href="https://github.com/settings/personal-access-tokens/new?name=Przepisy&amp;description=Przepisy+sync&amp;expires_in=366&amp;contents=write" target="_blank" rel="noopener">github.com/settings/personal-access-tokens</a>';
  return `<section>${head}
    <p class="field-note">${t('syncShort')}</p>
    ${more(
      'sync-how',
      t('syncHow'),
      `<p>${t('syncIntro')}</p>
      <ol>
        <li>${t('syncStep1', newRepo)}</li>
        <li>${t('syncStep2', newToken)}</li>
        <li>${t('syncStep3')}</li>
      </ol>`,
    )}
    ${from}
    <form id="sync-form" class="edit" novalidate>
      <label for="sync-repo">${t('repo')}</label>
      <input id="sync-repo" type="text" placeholder="${t('repoPlaceholder')}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(ui.syncRepo ?? DEFAULT_SYNC_REPO)}">
      <label for="sync-person">${t('person')}</label>
      <input id="sync-person" type="text" placeholder="${t('personPlaceholder')}" autocomplete="off" spellcheck="false" value="${esc(ui.syncPerson ?? '')}">
      <label for="sync-token">${t('token')}</label>
      <input id="sync-token" class="token" type="text" placeholder="github_pat_…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(ui.syncToken ?? '')}">
      ${errorHtml}
      <button class="btn primary wide" type="submit"${ui.syncConnecting ? ' disabled' : ''}>${ui.syncConnecting ? t('connecting') : t('connect')}</button>
    </form>
  </section>`;
}

// ---------- toast ----------

function toast(text, action, run) {
  clearTimeout(ui.toastTimer);
  ui.toast = { text, action, run };
  ui.toastTimer = setTimeout(() => {
    ui.toast = null;
    renderToast();
  }, 6000);
  renderToast();
}

function renderToast() {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  const host = sheet.open ? sheet : document.body;
  if (el.parentNode !== host) host.append(el);
  el.className = ui.toast ? 'toast show' : 'toast';
  el.innerHTML = ui.toast
    ? `<span>${esc(ui.toast.text)}</span>${ui.toast.action ? `<button type="button" class="link" data-action="toast">${esc(ui.toast.action)}</button>` : ''}`
    : '';
}

// ---------- navigation (the phone's back gesture) ----------

const navDepth = () => Number(history.state?.depth ?? 0);

function pushNav(screen, extra = {}) {
  try {
    history.pushState({ screen, depth: navDepth() + 1, ...extra }, '');
  } catch {
    // Embedded frames may refuse; buttons still work.
  }
}

window.addEventListener('popstate', () => {
  const state = history.state ?? {};
  const screen = state.screen ?? 'list';
  if (screen !== 'edit' && ui.editId) {
    const item = ui.editNew && itemById(ui.editId);
    if (item && S.isBlank(item)) {
      S.deleteItem(doc, item.id, Date.now());
      persist();
    }
    ui.editNew = false;
    ui.editId = null;
    ui.editIntro = '';
    ui.editBase = null;
  }
  if (screen === 'list') ui.view = 'list';
  else if (screen === 'settings') ui.view = 'settings';
  else if (screen === 'recipe') {
    ui.view = 'recipe';
    ui.recipeId = state.id;
  }
  if (ui.view !== 'recipe' && ui.wantWake) setWake(false);
  render();
});

function goSettings() {
  ui.view = 'settings';
  ui.confirmDisconnect = false;
  pushNav('settings');
  render();
  window.scrollTo(0, 0);
}

function goBack() {
  if (navDepth()) history.back();
  else {
    if (ui.wantWake) setWake(false);
    ui.view = 'list';
    render();
  }
}

// Back to the list from anywhere (after deleting the recipe shown).
function goHome() {
  const depth = navDepth();
  if (ui.wantWake) setWake(false);
  ui.view = 'list';
  ui.editId = null;
  if (depth) history.go(-depth);
  render();
}

// ---------- adding recipes ----------

function addLink(input, { fromShare = false } = {}) {
  const now = Date.now();
  const res = S.addItem(doc, input, now);
  if (!res) {
    toast(t('notALink'));
    return null;
  }
  sync.metaChecks = 0;
  persist();
  prefs.tag = '';
  if (!res.existed && prefs.status === 'done') prefs.status = 'all';
  savePrefs();
  ui.query = '';
  if (fromShare) {
    openRecipe(res.item.id);
    openEdit(res.item.id, 'item', res.existed ? t('alreadySaved') : t('saved'));
  } else if (res.existed) {
    openRecipe(res.item.id);
    toast(t('wasSaved'));
  } else {
    render();
    toast(t('savedToast'), t('open'), () => openRecipe(res.item.id));
  }
  return res;
}

// A recipe without a page: it opens with the recipe form.
function addManual() {
  const item = S.addManual(doc, {}, Date.now());
  ui.query = '';
  openRecipe(item.id);
  openEdit(item.id, 'recipe', '', true);
}

// Recipes shared from other apps (Web Share Target, manifest) and from the
// bookmarklet arrive as ?url=&title=&text= in the address.
function takeSharedLink() {
  const params = new URLSearchParams(location.search);
  if (!['url', 'text', 'title'].some((k) => params.has(k))) return;
  const shared = S.extractShared({ url: params.get('url'), title: params.get('title'), text: params.get('text') });
  try {
    history.replaceState({ screen: 'list', depth: 0 }, '', location.pathname);
  } catch {
    // The parameters then stay in the address bar; harmless.
  }
  if (shared) addLink(shared, { fromShare: true });
  else toast(t('noLinkShared'));
}

// ---------- sharing a recipe ----------

// The system share sheet with the recipe as text (and the address of the
// page in it); where there is none, the text goes to the clipboard.
// A recipient with Przepisy can share the message on to it: the address
// in the text is enough to add the recipe.
async function shareRecipe(item) {
  if (!item) return;
  const data = { title: titleOf(item), text: S.recipeText(item, getLang()) };
  if (navigator.share && (navigator.canShare?.(data) ?? true)) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return; // closed by the user
    }
  }
  try {
    await navigator.clipboard.writeText(data.text);
    toast(t('copied'));
  } catch {
    toast(t('shareFailed'));
  }
}

// ---------- backup ----------

function exportDoc() {
  const blob = new Blob([`${JSON.stringify(doc, null, 1)}\n`], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `przepisy-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importDoc(file) {
  try {
    const parsed = S.parseDoc(JSON.parse(await file.text()));
    if (!parsed) throw new Error();
    const before = doc.items.length;
    doc = S.mergeDocs(doc, parsed);
    persist();
    ui.importMsg = t('imported', doc.items.length - before);
  } catch {
    ui.importMsg = t('notBackup');
  }
  render();
}

// ---------- events ----------

app.addEventListener('click', onClick);
sheet.addEventListener('click', onClick);

function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id = el.closest('[data-id]')?.dataset.id;
  const value = el.dataset.value;
  switch (action) {
    case 'settings':
      goSettings();
      break;
    case 'back':
      goBack();
      break;
    case 'sync-now':
      syncNow();
      break;
    case 'sync-off':
      if (!ui.confirmDisconnect) {
        ui.confirmDisconnect = true;
        render();
        setTimeout(() => {
          ui.confirmDisconnect = false;
          if (ui.view === 'settings') render();
        }, 4000);
        break;
      }
      ui.confirmDisconnect = false;
      syncConfig = null;
      saveSyncConfig();
      render();
      break;
    case 'status':
      prefs.status = el.dataset.status;
      savePrefs();
      render();
      break;
    case 'tag':
      prefs.tag = prefs.tag === value ? '' : value;
      savePrefs();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'clear-filters':
      prefs.tag = '';
      ui.query = '';
      savePrefs();
      render();
      break;
    case 'clear-query':
      ui.query = '';
      render();
      document.getElementById('q')?.focus();
      break;
    case 'paste':
      navigator.clipboard
        .readText()
        .then((text) => {
          const shared = S.extractShared({ text });
          if (shared) addLink(shared);
          else toast(t('noLinkClipboard'));
        })
        .catch(() => toast(t('noClipboard')));
      break;
    case 'open':
      openRecipe(id);
      break;
    case 'new-recipe':
      addManual();
      break;
    case 'toggle':
      if (S.toggleDone(doc, id, Date.now())) {
        persist();
        render();
      }
      break;
    case 'scale':
      rescale(id, Number(el.dataset.step));
      break;
    case 'wake':
      setWake(!ui.wake).then(render);
      break;
    case 'edit':
      openEdit(ui.recipeId);
      break;
    case 'share':
      shareRecipe(itemById(ui.recipeId));
      break;
    case 'lang':
      prefs.lang = value;
      savePrefs();
      applyLang();
      ui.importMsg = '';
      render();
      break;
    case 'text-size':
      prefs.text = value;
      savePrefs();
      applyTextSize();
      render();
      break;
    case 'edit-recipe':
      openEdit(id, 'recipe');
      break;
    case 'recipe-reset': {
      const target = ui.editId ?? ui.recipeId;
      S.updateItem(doc, target, { recipe: null }, Date.now());
      persist();
      if (ui.editId) closeSheet();
      else render();
      break;
    }
    case 'sheet-close':
      saveSheet();
      closeSheet();
      break;
    case 'sheet-tag': {
      const input = sheet.querySelector('#f-tags');
      const tags = S.parseTags(input.value.includes(',') || !input.value.trim() ? input.value : input.value.replace(/\s+/g, ', '));
      const next = tags.includes(value) ? tags.filter((t) => t !== value) : [...tags, value];
      input.value = next.join(', ');
      el.classList.toggle('on', next.includes(value));
      break;
    }
    case 'delete': {
      if (!ui.confirmDelete) {
        ui.confirmDelete = true;
        el.classList.add('danger');
        el.textContent = t('confirmDelete');
        break;
      }
      const item = S.deleteItem(doc, ui.editId, Date.now());
      persist();
      ui.confirmDelete = false;
      goHome();
      if (item) {
        toast(t('deleted'), t('undo'), () => {
          S.restoreItem(doc, item);
          persist();
          render();
        });
      }
      break;
    }
    case 'toast': {
      const run = ui.toast?.run;
      ui.toast = null;
      renderToast();
      run?.();
      break;
    }
    case 'bookmarklet':
      e.preventDefault();
      toast(t('dragBookmarklet'));
      break;
    case 'export':
      exportDoc();
      break;
    case 'rename-tag': {
      const to = prompt(t('renameTag', value), value);
      if (to == null || !to.trim()) break;
      S.renameTag(doc, value, to, Date.now());
      persist();
      render();
      break;
    }
    case 'remove-tag': {
      if (!confirm(t('removeTag', value))) break;
      S.renameTag(doc, value, '', Date.now());
      if (prefs.tag === value) prefs.tag = '';
      persist();
      render();
      break;
    }
  }
}

// The toast lives in the sheet while it is open.
document.body.addEventListener('click', (e) => {
  if (e.target.closest('#toast [data-action="toast"]') && !app.contains(e.target) && !sheet.contains(e.target)) onClick(e);
});

// Pictures from recipe sites that do not load are hidden.
document.addEventListener(
  'error',
  (e) => {
    if (e.target instanceof HTMLImageElement) e.target.hidden = true;
  },
  true,
);

app.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  ui.query = e.target.value;
  renderResults();
});

app.addEventListener('change', (e) => {
  const key = e.target.dataset.check;
  if (key) {
    if (e.target.checked) ui.checked.add(key);
    else ui.checked.delete(key);
    return;
  }
  if (e.target.dataset.action === 'sort') {
    prefs.sort = e.target.value === 'opened' ? 'opened' : 'added';
    savePrefs();
    renderResults();
    return;
  }
  if (e.target.dataset.action === 'import' && e.target.files?.[0]) importDoc(e.target.files[0]);
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'search-form') {
    const shared = S.extractShared({ text: ui.query });
    if (shared && !/\s/.test(ui.query.trim())) addLink(shared);
    else document.getElementById('q')?.blur();
  } else if (e.target.id === 'sync-form') {
    connectSync(
      document.getElementById('sync-repo').value,
      document.getElementById('sync-person').value,
      document.getElementById('sync-token').value,
    );
  }
});

// A link pasted into the search field is added at once when nothing else
// was typed there.
app.addEventListener('paste', (e) => {
  if (e.target.id !== 'q' || e.target.value.trim()) return;
  const text = e.clipboardData?.getData('text') ?? '';
  const shared = S.extractShared({ text });
  if (!shared || text.trim().split(/\s+/).length > 12) return;
  e.preventDefault();
  addLink(shared);
});

sheet.addEventListener('submit', (e) => {
  e.preventDefault();
  saveSheet();
  closeSheet();
});

// Escape or a tap outside the sheet: save and close.
sheet.addEventListener('cancel', (e) => {
  e.preventDefault();
  saveSheet();
  closeSheet();
});
sheet.addEventListener('click', (e) => {
  if (e.target === sheet) {
    saveSheet();
    closeSheet();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    swRegistration?.update().catch(() => {});
    if (syncConfig) syncNow();
    if (ui.wantWake && ui.view === 'recipe') setWake(true).then(render);
  } else if (sync.timer) {
    // Push pending changes before the app goes to the background.
    syncNow();
  }
});

window.addEventListener('online', () => syncNow());

// Another tab of the app changed the data.
window.addEventListener('storage', (e) => {
  if (e.key !== S.STORAGE_KEY) return;
  doc = S.loadDoc(storage);
  render();
});

// ---------- start ----------

let swRegistration = null;

try {
  history.replaceState({ screen: 'list', depth: 0 }, '');
} catch {
  // See pushNav.
}
render();
takeSharedLink();
if (syncConfig) syncNow();

if ('serviceWorker' in navigator && window.isSecureContext) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // A new version took over: reload into it, unless the user is editing.
    if (!hadController || reloading || ui.editId) return;
    reloading = true;
    window.location.reload();
  });
  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => {
      swRegistration = reg;
    })
    .catch(() => {});
}
