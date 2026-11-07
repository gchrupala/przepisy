import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';

const T0 = new Date(2026, 10, 7, 12, 0, 0).getTime();
const min = (n) => T0 + n * 60000;
let seq = 0;
const rnd = () => ((seq = (seq + 0.137) % 1), seq);

const PAGE_RECIPE = {
  yields: '4 porcje',
  time: 45,
  ingredients: [
    { name: 'Ciasto', items: ['200 g mąki', '2 jajka'] },
    { name: 'Farsz', items: ['300 g twarogu'] },
  ],
  steps: [{ name: '', items: ['Zagnieść ciasto.', 'Ugotować pierogi.'] }],
};

test('tracking parameters go, real ones stay', () => {
  assert.equal(S.cleanUrl('https://example.com/a?utm_source=x&id=5&fbclid=abc#:~:text=foo'), 'https://example.com/a?id=5');
  assert.equal(S.cleanUrl('https://www.instagram.com/p/abc/?igsh=XYZ'), 'https://www.instagram.com/p/abc/');
  assert.equal(S.cleanUrl('https://example.com/search?s=word'), 'https://example.com/search?s=word');
  assert.equal(S.cleanUrl('ftp://example.com/a'), null);
  assert.equal(S.cleanUrl('nie link'), null);
});

test('the same recipe under different spellings has one key', () => {
  const k = S.urlKey('https://www.example.com/przepis/?b=2&a=1#komentarze');
  assert.equal(k, 'example.com/przepis?a=1&b=2');
  assert.equal(S.urlKey('http://m.example.com/przepis?a=1&b=2&utm_source=t'), k);
});

test('shared text from Android apps gives an address and a title', () => {
  assert.deepEqual(S.extractShared({ text: 'Pierogi ruskie https://example.com/pierogi?utm_source=share' }), {
    url: 'https://example.com/pierogi',
    title: 'Pierogi ruskie',
  });
  assert.deepEqual(S.extractShared({ title: 'Szarlotka', text: 'https://example.com/b.' }), { url: 'https://example.com/b', title: 'Szarlotka' });
  assert.equal(S.extractShared({ text: 'sam tekst bez linku' }), null);
});

test('tags: commas or spaces, no hash, no duplicates, lower case', () => {
  assert.deepEqual(S.parseTags('Ciasta, #Wege, wege'), ['ciasta', 'wege']);
  assert.deepEqual(S.parseTags('#obiad  zupy'), ['obiad', 'zupy']);
  assert.deepEqual(S.parseTags(''), []);
});

test('servings: numbers of people, ranges, and yields that are not people', () => {
  assert.deepEqual(S.servingsOf('4'), { min: 4, max: 4 });
  assert.deepEqual(S.servingsOf('4 porcje'), { min: 4, max: 4 });
  assert.deepEqual(S.servingsOf('dla 2 osób'), { min: 2, max: 2 });
  assert.deepEqual(S.servingsOf('4-6 porcji'), { min: 4, max: 6 });
  assert.deepEqual(S.servingsOf('Serves 6'), { min: 6, max: 6 });
  assert.deepEqual(S.servingsOf('8 servings'), { min: 8, max: 8 });
  assert.equal(S.servingsOf('około 60 pierogów'), null);
  assert.equal(S.servingsOf('Makes 12'), null);
  assert.equal(S.servingsOf(''), null);
  assert.equal(S.yieldsLabel('4 porcje'), 'Dla 4 osób');
  assert.equal(S.yieldsLabel('1'), 'Dla 1 osoby');
  assert.equal(S.yieldsLabel('4-6'), 'Dla 4–6 osób');
  assert.equal(S.yieldsLabel('około 60 pierogów'), 'Ilość: około 60 pierogów');
  assert.equal(S.yieldsLabel(undefined), '');
  assert.equal(S.timeLabel(45), '45 min');
  assert.equal(S.timeLabel(90), '1 godz. 30 min');
  assert.equal(S.timeLabel(180), '3 godz.');
  assert.equal(S.timeLabel(null), '');
});

test('recipe text: one line per item, "# name" for parts, bullets and numbers go', () => {
  const text = S.sectionsToText(PAGE_RECIPE.ingredients);
  assert.equal(text, '# Ciasto\n200 g mąki\n2 jajka\n\n# Farsz\n300 g twarogu');
  assert.deepEqual(S.textToSections(text), PAGE_RECIPE.ingredients);
  assert.deepEqual(S.textToSections('1. Zagnieść ciasto.\n\n2) Ugotować.\n- sól\n  '), [
    { name: '', items: ['Zagnieść ciasto.', 'Ugotować.', 'sól'] },
  ]);
  assert.deepEqual(S.textToSections('# Pusta\n# Sos\nmasło'), [{ name: 'Sos', items: ['masło'] }]);
  assert.deepEqual(S.textToSections(''), []);
});

test('adding a recipe twice keeps one', () => {
  const doc = S.emptyDoc();
  const first = S.addItem(doc, { url: 'https://example.com/a?utm_source=x', tags: 'obiad' }, min(0), rnd);
  assert.equal(first.existed, false);
  assert.equal(first.item.url, 'https://example.com/a');
  assert.equal(first.item.status, 'todo');
  S.toggleDone(doc, first.item.id, min(1));
  assert.equal(doc.items[0].status, 'done');
  assert.equal(doc.items[0].doneAt, min(1));
  const again = S.addItem(doc, { url: 'https://www.example.com/a/', title: 'A', tags: 'zupy' }, min(2), rnd);
  assert.equal(again.existed, true);
  assert.equal(doc.items.length, 1);
  assert.equal(doc.items[0].status, 'done');
  assert.equal(doc.items[0].title, 'A');
  assert.deepEqual(doc.items[0].tags, ['obiad', 'zupy']);
  assert.equal(S.addItem(doc, { url: 'nie link' }, min(3), rnd), null);
});

test('updates stamp updatedAt only when something changed; a new address drops the page data', () => {
  const doc = S.emptyDoc();
  const { item } = S.addItem(doc, { url: 'https://example.com/a' }, min(0), rnd);
  S.updateItem(doc, item.id, { title: '' }, min(5));
  assert.equal(item.updatedAt, min(0));
  S.updateItem(doc, item.id, { title: 'Nowy', tags: 'x, y' }, min(5));
  assert.equal(item.updatedAt, min(5));
  item.meta = { fetchedAt: min(6), title: 'Strona', recipe: PAGE_RECIPE };
  S.updateItem(doc, item.id, { url: 'https://example.com/b' }, min(7));
  assert.equal(item.meta, undefined);
});

test('correcting a recipe by hand, and going back to the page recipe', () => {
  const doc = S.emptyDoc();
  const { item } = S.addItem(doc, { url: 'https://example.com/pierogi' }, min(0), rnd);
  item.meta = { fetchedAt: min(1), via: 'schema', recipe: PAGE_RECIPE };
  assert.equal(S.recipeOf(item), PAGE_RECIPE);
  assert.equal(S.recipeSource(item), 'schema');
  assert.equal(S.recipeSource({ meta: { ...item.meta, via: 'mistral' } }), 'mistral');

  // The form unchanged: no correction, nothing changes.
  S.editRecipe(doc, item.id, S.recipeToForm(PAGE_RECIPE), min(2));
  assert.equal(item.recipe, undefined);
  assert.equal(item.updatedAt, min(0));

  const form = S.recipeToForm(PAGE_RECIPE);
  S.editRecipe(doc, item.id, { ...form, yields: '6', steps: `${form.steps}\nPodawać z cebulką.` }, min(3));
  assert.equal(S.recipeSource(item), 'hand');
  assert.equal(S.recipeOf(item).yields, '6');
  assert.equal(S.recipeOf(item).time, 45);
  assert.deepEqual(S.recipeOf(item).steps[0].items.at(-1), 'Podawać z cebulką.');
  assert.equal(item.updatedAt, min(3));

  // Typing the page recipe back removes the correction.
  S.editRecipe(doc, item.id, form, min(4));
  assert.equal(item.recipe, undefined);
  assert.equal(S.recipeSource(item), 'schema');

  // Emptying everything hides a wrong page recipe.
  S.editRecipe(doc, item.id, { yields: '', ingredients: '', steps: '' }, min(5));
  assert.deepEqual(S.recipeOf(item), { ingredients: [], steps: [] });
  assert.equal(S.parseDoc(JSON.parse(JSON.stringify(doc))).items[0].recipe.steps.length, 0);
  S.updateItem(doc, item.id, { recipe: null }, min(6));
  assert.equal(S.recipeOf(item), PAGE_RECIPE);
});

test('a recipe typed in while there is none from the page', () => {
  const doc = S.emptyDoc();
  const { item } = S.addItem(doc, { url: 'https://www.instagram.com/p/abc/' }, min(0), rnd);
  item.meta = { fetchedAt: min(1), via: 'page', error: 'HTTPError: 403' };
  S.editRecipe(doc, item.id, { yields: '', ingredients: '', steps: '' }, min(2));
  assert.equal(item.recipe, undefined);
  S.editRecipe(doc, item.id, { yields: '2', ingredients: 'makaron\nczosnek', steps: 'Ugotować.' }, min(3));
  assert.deepEqual(S.recipeOf(item), {
    yields: '2',
    ingredients: [{ name: '', items: ['makaron', 'czosnek'] }],
    steps: [{ name: '', items: ['Ugotować.'] }],
  });
});

test('search ignores case and Polish accents, looks in ingredients and understands #tags', () => {
  const doc = S.emptyDoc();
  S.addItem(doc, { url: 'https://example.com/lodz', title: 'Zupa po łódzku', tags: 'zupy' }, min(0), rnd);
  S.addItem(doc, { url: 'https://example.com/b', title: 'Leczo', tags: 'wege' }, min(1), rnd);
  const third = S.addItem(doc, { url: 'https://example.com/z' }, min(2), rnd).item;
  third.meta = {
    fetchedAt: min(3),
    title: 'Placki z cukinii',
    recipe: { ingredients: [{ name: '', items: ['2 cukinie', '3 pomidorów'] }], steps: [] },
  };
  const titles = (opts) => S.filterItems(doc.items, opts).map(S.titleOf);
  assert.deepEqual(titles({ query: 'lodzku' }), ['Zupa po łódzku']);
  assert.deepEqual(titles({ query: 'cukinia' }), ['Placki z cukinii']);
  assert.deepEqual(titles({ query: 'POMIDORY' }), ['Placki z cukinii']);
  assert.deepEqual(titles({ query: '#wege' }), ['Leczo']);
  assert.deepEqual(titles({ tag: 'zupy' }), ['Zupa po łódzku']);
  S.toggleDone(doc, doc.items[0].id, min(10));
  assert.deepEqual(titles({ status: 'done' }), ['Zupa po łódzku']);
  assert.equal(S.filterItems(doc.items, { status: 'todo' }).length, 2);
  assert.deepEqual(S.tagCounts(doc.items), [['wege', 1], ['zupy', 1]]);
});

test('parseDoc drops broken items, tombstoned ones and unsafe images', () => {
  const doc = S.parseDoc({
    items: [
      {
        id: 'a',
        url: 'https://example.com/a',
        status: 'done',
        doneAt: 5,
        addedAt: 1,
        updatedAt: 5,
        tags: ['X'],
        meta: { fetchedAt: 3, image: 'javascript:alert(1)', recipe: { yields: ' 4 ', steps: [{ name: '', items: [' Krok ', ''] }, { items: [] }] } },
      },
      { id: 'b', url: 'javascript:alert(1)' },
      { id: 'c', url: 'https://example.com/c' },
      { id: 'a', url: 'https://example.com/dup' },
      { url: 'https://example.com/noid' },
    ],
    tombstones: { c: 10, bad: 'x' },
  });
  assert.deepEqual(
    doc.items.map((i) => [i.id, i.status, i.tags]),
    [['a', 'done', ['x']]],
  );
  assert.equal(doc.items[0].meta.image, undefined);
  assert.deepEqual(doc.items[0].meta.recipe, { yields: '4', ingredients: [], steps: [{ name: '', items: ['Krok'] }] });
  assert.deepEqual(doc.tombstones, { c: 10 });
  assert.equal(S.parseDoc({ machines: [] }), null);
  assert.equal(S.parseDoc(null), null);
});

function twoDevices() {
  const phone = S.emptyDoc();
  S.addItem(phone, { url: 'https://example.com/a', tags: 'obiad' }, min(0), rnd);
  const laptop = S.mergeDocs(S.emptyDoc(), phone);
  return { phone, laptop };
}

test('merging keeps recipes from both devices and the newer edit', () => {
  const { phone, laptop } = twoDevices();
  const id = phone.items[0].id;
  S.updateItem(phone, id, { title: 'Z telefonu' }, min(5));
  S.updateItem(laptop, id, { title: 'Z laptopa' }, min(6));
  S.addItem(laptop, { url: 'https://example.com/b' }, min(7), rnd);
  const m1 = S.mergeDocs(phone, laptop);
  const m2 = S.mergeDocs(laptop, phone);
  assert.equal(S.stableJson(m1), S.stableJson(m2));
  assert.equal(m1.items.length, 2);
  assert.equal(m1.items.find((i) => i.id === id).title, 'Z laptopa');
});

test('deleted recipes stay deleted after merging', () => {
  const { phone, laptop } = twoDevices();
  const id = phone.items[0].id;
  S.deleteItem(phone, id, min(5));
  S.updateItem(laptop, id, { title: 'Edycja' }, min(6));
  const m = S.mergeDocs(laptop, phone);
  assert.equal(m.items.length, 0);
  assert.equal(m.tombstones[id], min(5));
});

test('the recipe from the Action survives a later edit on a device, and a correction survives the Action', () => {
  const { phone, laptop } = twoDevices();
  const id = phone.items[0].id;
  // The Action filled in the recipe in the repository copy.
  const repo = structuredClone(phone);
  repo.items[0].meta = { fetchedAt: min(2), title: 'Pierogi', via: 'schema', recipe: PAGE_RECIPE };
  // Meanwhile the laptop marked it tried.
  S.toggleDone(laptop, id, min(3));
  const m = S.mergeDocs(laptop, repo);
  assert.equal(m.items[0].status, 'done');
  assert.deepEqual(S.recipeOf(m.items[0]), PAGE_RECIPE);
  // A correction on the phone, then the Action reads the page again.
  const phone2 = structuredClone(m);
  S.editRecipe(phone2, id, { ...S.recipeToForm(PAGE_RECIPE), yields: '8' }, min(4));
  const repo2 = structuredClone(m);
  repo2.items[0].meta = { ...repo2.items[0].meta, fetchedAt: min(5) };
  const m2 = S.mergeDocs(repo2, phone2);
  assert.equal(S.recipeOf(m2.items[0]).yields, '8');
  assert.equal(m2.items[0].meta.fetchedAt, min(5));
});

test('the same address saved on two devices becomes one recipe', () => {
  const phone = S.emptyDoc();
  const laptop = S.emptyDoc();
  const a = S.addItem(phone, { url: 'https://example.com/x', tags: 'a', note: 'z telefonu' }, min(0), rnd).item;
  const b = S.addItem(laptop, { url: 'https://www.example.com/x/', tags: 'b' }, min(1), rnd).item;
  const m1 = S.mergeDocs(phone, laptop);
  const m2 = S.mergeDocs(laptop, phone);
  assert.equal(S.stableJson(m1), S.stableJson(m2));
  assert.equal(m1.items.length, 1);
  assert.equal(m1.items[0].id, a.id);
  assert.deepEqual(m1.items[0].tags, ['a', 'b']);
  assert.ok(b.id in m1.tombstones);
  assert.equal(S.stableJson(S.mergeDocs(m1, phone)), S.stableJson(m1));
});

test('renaming and removing tags', () => {
  const doc = S.emptyDoc();
  S.addItem(doc, { url: 'https://example.com/1', tags: 'ciasto, wege' }, min(0), rnd);
  S.addItem(doc, { url: 'https://example.com/2', tags: 'ciasto' }, min(0), rnd);
  assert.equal(S.renameTag(doc, 'ciasto', 'Ciasta', min(1)), 2);
  assert.deepEqual(doc.items.map((i) => i.tags), [['ciasta', 'wege'], ['ciasta']]);
  S.renameTag(doc, 'wege', '', min(2));
  assert.deepEqual(doc.items[0].tags, ['ciasta']);
});
