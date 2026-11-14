import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLang, LANGS, pickLang, setLang, STRINGS, t } from '../js/i18n.js';

test('every text is in every language, of the same kind', () => {
  const keys = Object.keys(STRINGS.pl).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(STRINGS[lang]).sort(), keys, lang);
    for (const k of keys) {
      const [a, b] = [STRINGS.pl[k], STRINGS[lang][k]];
      assert.equal(typeof b, typeof a, `${lang}.${k}`);
      if (typeof a === 'function') assert.equal(b.length, a.length, `${lang}.${k} parameters`);
      else assert.ok(b.trim(), `${lang}.${k} is empty`);
    }
  }
});

test('the language: chosen, else the first known browser language, else English', () => {
  assert.equal(pickLang('pl', ['en-US']), 'pl');
  assert.equal(pickLang('en', ['pl-PL']), 'en');
  assert.equal(pickLang('auto', ['nl-NL', 'pl', 'en']), 'pl');
  assert.equal(pickLang('auto', ['en-GB', 'pl']), 'en');
  assert.equal(pickLang('auto', ['nl-NL']), 'en');
  assert.equal(pickLang(undefined, undefined), 'en');
});

test('t fills in parameters in the current language', () => {
  setLang('en');
  assert.equal(getLang(), 'en');
  assert.equal(t('imported', 3), 'Loaded. New recipes: 3.');
  assert.equal(t('emptyBody', (x) => `[${x}]`).endsWith('in [settings].'), true);
  setLang('xx');
  assert.equal(getLang(), 'pl');
  assert.equal(t('settings'), 'Ustawienia');
  assert.equal(t('noSuchKey'), 'noSuchKey');
});
