// Sync with a JSON file in a private GitHub repository, through the GitHub
// REST API and a fine-grained personal access token. Each push is a commit,
// so the repository keeps the history of the data.
//
// One repository can hold the data of several people and apps: each person
// has a folder, and each app a file in it, such as grzegorz/przepisy.json and
// zosia/maxapki.json (MaxApki, https://github.com/gchrupala/Anki).
// parsePerson turns a name into the name of the folder, the same way in all
// the apps.

import { mergeDocs, parseDoc, stableJson } from './store.js';

const API = 'https://api.github.com';
export const SYNC_FILE = 'przepisy.json';

// kind: 'auth' (bad or expired token), 'forbidden' (no write access),
// 'notFound' (no such repository or no access to it), 'public' (the
// repository is public), 'conflict' (the file changed meanwhile),
// 'network' (offline or unreachable), 'bad' (anything else).
export class SyncError extends Error {
  constructor(kind, status = 0) {
    super(kind);
    this.kind = kind;
    this.status = status;
  }
}

const KIND_BY_STATUS = { 401: 'auth', 403: 'forbidden', 404: 'notFound', 409: 'conflict', 422: 'conflict' };

// "https://github.com/owner/name(.git)" or "owner/name" -> "owner/name", or
// null when it is neither.
export function parseRepo(input) {
  const s = String(input ?? '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '');
  return /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(s) ? s : null;
}

// A person's name -> the name of their folder: lower case, letters and
// digits of any script, anything else as a single hyphen; null when nothing
// is left. The same in every app that shares the repository.
export function parsePerson(input) {
  const s = String(input ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return s || null;
}

// The data file of a person (a name from parsePerson).
export const syncPath = (person) => `${person}/${SYNC_FILE}`;

// A path in the repository, for an address: each part encoded.
const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

// UTF-8 text <-> base64, which the contents API uses.
export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(b64) {
  const binary = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function gitHubRemote({ repo, token, path, fetch: fetchFn = (...a) => globalThis.fetch(...a) }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const fileUrl = `${API}/repos/${repo}/contents/${encodePath(path)}`;

  // no-store: a cached GET would return an old sha right after a push.
  async function call(url, options = {}) {
    try {
      return await fetchFn(url, { cache: 'no-store', ...options, headers: { ...headers, ...options.headers } });
    } catch {
      throw new SyncError('network');
    }
  }
  const fail = (res) => {
    throw new SyncError(KIND_BY_STATUS[res.status] ?? 'bad', res.status);
  };

  return {
    // The repository must exist, be reachable with the token and be private.
    async checkRepo() {
      const res = await call(`${API}/repos/${repo}`);
      if (!res.ok) fail(res);
      const info = await res.json();
      if (!info.private) throw new SyncError('public');
    },

    // { doc, sha } of the data file, or null when there is none yet.
    async pull() {
      const res = await call(fileUrl);
      if (res.status === 404) return null;
      if (!res.ok) fail(res);
      const meta = await res.json();
      let text = meta.content ? fromBase64(meta.content) : null;
      if (text === null) {
        // Files over 1 MB come without content; fetch them raw.
        const raw = await call(fileUrl, { headers: { Accept: 'application/vnd.github.raw+json' } });
        if (!raw.ok) fail(raw);
        text = await raw.text();
      }
      let doc;
      try {
        doc = JSON.parse(text);
      } catch {
        throw new SyncError('bad');
      }
      return { doc, sha: meta.sha };
    },

    // Writes the file; sha is the version it replaces (none for a new file).
    async push(doc, sha, message) {
      const body = { message, content: toBase64(`${JSON.stringify(doc, null, 1)}\n`) };
      if (sha) body.sha = sha;
      const res = await call(fileUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) fail(res);
      return (await res.json()).content?.sha ?? null;
    },
  };
}

// One sync: pull the file, merge it with the local data, apply the result
// locally and push it when the file differs. If the file changed between
// pull and push, start again (up to three times).
export async function syncOnce({ remote, getLocal, apply, now = Date.now() }) {
  for (let attempt = 1; ; attempt++) {
    const pulled = await remote.pull();
    const remoteDoc = pulled ? parseDoc(pulled.doc) : null;
    if (pulled && !remoteDoc) throw new SyncError('bad');
    const merged = mergeDocs(getLocal(), remoteDoc);
    apply(merged);
    if (remoteDoc && stableJson(merged) === stableJson(remoteDoc)) return { pushed: false };
    try {
      await remote.push(merged, pulled?.sha, `Przepisy: ${new Date(now).toISOString()}`);
      return { pushed: true };
    } catch (e) {
      if (e.kind !== 'conflict' || attempt >= 3) throw e;
    }
  }
}
