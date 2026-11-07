import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';
import { fromBase64, gitHubRemote, parsePerson, parseRepo, SyncError, syncOnce, syncPath, toBase64 } from '../js/sync.js';

const T0 = new Date(2026, 10, 7, 12, 0, 0).getTime();
const min = (n) => T0 + n * 60000;

// An in-memory stand-in for the data file on GitHub.
function fakeRemote() {
  const file = { doc: null, sha: null, version: 0 };
  return {
    file,
    async pull() {
      return file.doc ? { doc: structuredClone(file.doc), sha: file.sha } : null;
    },
    async push(doc, sha) {
      if ((sha ?? null) !== file.sha) throw new SyncError('conflict', 409);
      file.version += 1;
      file.doc = structuredClone(doc);
      file.sha = `sha${file.version}`;
      return file.sha;
    },
  };
}

function device() {
  const d = {
    doc: S.emptyDoc(),
    sync: (remote, now) => syncOnce({ remote, getLocal: () => d.doc, apply: (doc) => (d.doc = doc), now }),
  };
  return d;
}

test('repository names, folders and base64 with Polish letters', () => {
  assert.equal(parseRepo(' https://github.com/gchrupala/app-data.git/ '), 'gchrupala/app-data');
  assert.equal(parseRepo('app-data'), null);
  assert.equal(parsePerson(' Grzegorz  Chrupała '), 'grzegorz-chrupała');
  assert.equal(parsePerson(' - / '), null);
  assert.equal(syncPath('grzegorz'), 'grzegorz/przepisy.json');
  const text = '{"title":"Żółta łódź"}';
  assert.equal(fromBase64(toBase64(text)), text);
});

test('two devices end with the same links; nothing is pushed when nothing changed', async () => {
  const remote = fakeRemote();
  const phone = device();
  const laptop = device();
  S.addItem(phone.doc, { url: 'https://example.com/a' }, min(0));
  assert.deepEqual(await phone.sync(remote, min(1)), { pushed: true });
  S.addItem(laptop.doc, { url: 'https://example.com/b' }, min(2));
  await laptop.sync(remote, min(3));
  await phone.sync(remote, min(4));
  assert.equal(phone.doc.items.length, 2);
  assert.equal(S.stableJson(phone.doc), S.stableJson(laptop.doc));
  assert.deepEqual(await laptop.sync(remote, min(5)), { pushed: false });
  assert.equal(remote.file.version, 2);
});

test('a push that loses a race pulls again and merges', async () => {
  const remote = fakeRemote();
  const phone = device();
  S.addItem(phone.doc, { url: 'https://example.com/a' }, min(0));
  const realPush = remote.push;
  let raced = false;
  remote.push = async (doc, sha) => {
    if (!raced) {
      raced = true;
      remote.file.doc = { przepisy: 1, items: [{ id: 'x', url: 'https://example.com/x', addedAt: 1, updatedAt: 1 }], tombstones: {} };
      remote.file.sha = 'other';
    }
    return realPush(doc, sha);
  };
  await phone.sync(remote, min(1));
  assert.deepEqual(remote.file.doc.items.map((i) => i.url), ['https://example.com/x', 'https://example.com/a']);
});

test('a file that is not a Przepisy document stops the sync', async () => {
  const remote = fakeRemote();
  remote.file.doc = { machines: [] };
  remote.file.sha = 's';
  await assert.rejects(device().sync(remote, min(0)), (e) => e.kind === 'bad');
});

test('the GitHub remote: errors by status, private repositories only, pushes with sha', async () => {
  const calls = [];
  const responses = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    const [status, body] = responses.shift();
    return { ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
  };
  const remote = gitHubRemote({ repo: 'o/r', token: 't', path: 'grzegorz-chrupała/przepisy.json', fetch });
  responses.push([200, { private: false }]);
  await assert.rejects(remote.checkRepo(), (e) => e.kind === 'public');
  responses.push([401, {}]);
  await assert.rejects(remote.checkRepo(), (e) => e.kind === 'auth');
  responses.push([404, {}]);
  assert.equal(await remote.pull(), null);
  assert.match(calls.at(-1).url, /contents\/grzegorz-chrupa%C5%82a\/przepisy\.json$/);
  responses.push([201, { content: { sha: 'new' } }]);
  assert.equal(await remote.push(S.emptyDoc(), 'old', 'msg'), 'new');
  const body = JSON.parse(calls.at(-1).options.body);
  assert.equal(body.sha, 'old');
  assert.equal(JSON.parse(fromBase64(body.content)).przepisy, 1);
  assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer t');
});
