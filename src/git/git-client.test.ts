import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import git, { type MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { startGitServer, type GitServer } from './git-test-server';
import { createGitClient } from './git-client';
import { mergeNote } from './merge-note';

const author = { name: 'tester', email: 't@e.io' };
const onAuth = () => ({ headers: { Authorization: 'Bearer test-token' } });
const mergeDriver: MergeDriverCallback = ({ contents }) => {
  const [b, o, t] = contents;
  const { text, clean } = mergeNote(b, o, t);
  return { cleanMerge: clean, mergedText: text };
};
const client = createGitClient({ fs, http: nodeHttp }, mergeDriver);

let root: string;
let tmp: string;
let srv: GitServer;
let url: string;

async function seedBare(): Promise<void> {
  const S = path.join(tmp, 'seed');
  fs.mkdirSync(S, { recursive: true });
  await git.init({ fs, dir: S, defaultBranch: 'main' });
  await git.addRemote({ fs, dir: S, remote: 'origin', url });
  fs.writeFileSync(path.join(S, 'seed.md'), '# seed\n');
  await git.add({ fs, dir: S, filepath: 'seed.md' });
  await git.commit({ fs, dir: S, message: 'seed', author });
  await git.push({ fs, http: nodeHttp, dir: S, remote: 'origin', ref: 'main', onAuth });
}

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gitsrv-'));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'work-'));
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(root, 'app.git')]);
  srv = await startGitServer(root);
  url = srv.url('app.git');
  await seedBare();
});
afterEach(async () => {
  await srv.close();
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('git-client (R8 clone, R11 push, R13 never-force)', () => {
  it('clones the vault full single-branch; token never in the URL', async () => {
    const B = path.join(tmp, 'B');
    await client.clone({ dir: B, url, token: 'test-token' });
    expect(fs.readFileSync(path.join(B, 'seed.md'), 'utf8')).toContain('# seed');
    expect(url).not.toContain('test-token'); // R9: token only via onAuth header
  });

  it('commits and pushes a local edit; a second clone sees it', async () => {
    const B = path.join(tmp, 'B');
    await client.clone({ dir: B, url, token: 't' });
    fs.writeFileSync(path.join(B, 'note.md'), '# from B\n');
    await client.add({ dir: B, url, token: 't' }, 'note.md');
    await client.commit({ dir: B, url, token: 't' }, 'add note');
    await client.push({ dir: B, url, token: 't' });

    const C = path.join(tmp, 'C');
    await client.clone({ dir: C, url, token: 't' });
    expect(fs.readFileSync(path.join(C, 'note.md'), 'utf8')).toContain('# from B');
  });

  it('on a non-ff push, re-pulls + merges + re-pushes (never force); both edits land', async () => {
    const A = path.join(tmp, 'A');
    const B = path.join(tmp, 'B');
    await client.clone({ dir: A, url, token: 't' });
    await client.clone({ dir: B, url, token: 't' });

    // A pushes first
    fs.writeFileSync(path.join(A, 'a.md'), 'A\n');
    await client.add({ dir: A, url, token: 't' }, 'a.md');
    await client.commit({ dir: A, url, token: 't' }, 'A commit');
    await client.push({ dir: A, url, token: 't' });

    // B commits on the now-stale base, then pushes -> auto-recovers (no force)
    fs.writeFileSync(path.join(B, 'b.md'), 'B\n');
    await client.add({ dir: B, url, token: 't' }, 'b.md');
    await client.commit({ dir: B, url, token: 't' }, 'B commit');
    await client.push({ dir: B, url, token: 't' }); // must not throw, must not force

    const D = path.join(tmp, 'D');
    await client.clone({ dir: D, url, token: 't' });
    expect(fs.existsSync(path.join(D, 'a.md'))).toBe(true);
    expect(fs.existsSync(path.join(D, 'b.md'))).toBe(true);
  });
});

describe('changedFileCount (sync preview)', () => {
  it('counts added + modified blobs between two commits (subdirs recurse, dirs not counted)', async () => {
    const B = path.join(tmp, 'B');
    const ctx = { dir: B, url, token: 't' };
    await client.clone(ctx);
    const before = await client.resolveRef(ctx, 'main');

    fs.writeFileSync(path.join(B, 'seed.md'), '# seed v2\n'); // modified
    fs.mkdirSync(path.join(B, 'notes'), { recursive: true });
    fs.writeFileSync(path.join(B, 'notes', 'new.md'), 'new\n'); // added, in a subdir
    await client.add(ctx, 'seed.md');
    await client.add(ctx, 'notes/new.md');
    await client.commit(ctx, 'edit');
    const after = await client.resolveRef(ctx, 'main');

    expect(await client.changedFileCount(ctx, before, after)).toBe(2);
    // Symmetric: the reverse direction sees the same paths (one now a deletion).
    expect(await client.changedFileCount(ctx, after, before)).toBe(2);
  });

  it('returns 0 when both oids are the same commit', async () => {
    const B = path.join(tmp, 'B');
    const ctx = { dir: B, url, token: 't' };
    await client.clone(ctx);
    const head = await client.resolveRef(ctx, 'main');
    expect(await client.changedFileCount(ctx, head, head)).toBe(0);
  });
});

// AUTH_LAB_REPRO_20261117: Synthetic HTTP 401/403 with the real Git smart HTTP backend.
describe('HTTP authentication failure (isolated lab)', () => {
  it('retries a 401 with a refreshed token instead of UserCanceledError', async () => {
    const expected = 'Basic ' + btoa('x-access-token:fresh-token');
    const statuses: number[] = [];
    const guardedHttp: typeof nodeHttp = {
      request: async (args) => {
        const actual = await nodeHttp.request(args);
        if (args.url.includes('/info/refs?') && args.headers?.Authorization !== expected) {
          statuses.push(401);
          return { ...actual, statusCode: 401 };
        }
        statuses.push(actual.statusCode);
        return actual;
      },
    };
    let refreshCalls = 0;
    // This is the proposed interface under test: in 0.12.4 extra input is ignored.
    const deps = {
      fs,
      http: guardedHttp,
      refreshAuth: async () => {
        refreshCalls++;
        return 'fresh-token';
      },
    } as Parameters<typeof createGitClient>[0];
    const recoveryClient = createGitClient(deps, mergeDriver);
    const target = path.join(tmp, 'recovery401');
    await recoveryClient.clone({ dir: target, url, token: 'stale-token' });
    expect(fs.readFileSync(path.join(target, 'seed.md'), 'utf8')).toContain('# seed');
    expect(refreshCalls).toBe(1);
    expect(statuses).toContain(401);
    expect(statuses).toContain(200);
  });

  it('distinguishes HTTP 403 from a user-canceled authentication', async () => {
    const statuses: number[] = [];
    const forbiddenHttp: typeof nodeHttp = {
      request: async (args) => {
        const actual = await nodeHttp.request(args);
        if (args.url.includes('/info/refs?')) {
          statuses.push(403);
          return { ...actual, statusCode: 403 };
        }
        return actual;
      },
    };
    const forbiddenClient = createGitClient({ fs, http: forbiddenHttp }, mergeDriver);
    let actualError: unknown;
    try {
      await forbiddenClient.clone({
        dir: path.join(tmp, 'forbidden403'),
        url,
        token: 'valid-but-forbidden',
      });
    } catch (e) {
      actualError = e;
    }
    expect(actualError).toBeInstanceOf(Error);
    const code = (actualError as { code?: string }).code;
    console.log('AUTH_LAB_403_ERROR_CODE=' + String(code ?? (actualError as Error).name));
    expect(code).not.toBe('UserCanceledError');
    expect(statuses).toContain(403);
  });
});
// AUTH_LAB_PUSH_20261117: Rejected credential during git push, not only clone.
describe('HTTP 401 on push (isolated lab)', () => {
  it('renews a rejected credential and pushes a real commit without force', async () => {
    const expected = 'Basic ' + btoa('x-access-token:fresh-push-token');
    let challengePush = false;
    let status401Count = 0;
    const guardedHttp: typeof nodeHttp = {
      request: async (args) => {
        const actual = await nodeHttp.request(args);
        if (
          challengePush &&
          args.url.includes('/info/refs?service=git-receive-pack') &&
          args.headers?.Authorization !== expected
        ) {
          status401Count++;
          return { ...actual, statusCode: 401 };
        }
        return actual;
      },
    };
    let refreshCalls = 0;
    const guardedClient = createGitClient(
      {
        fs,
        http: guardedHttp,
        refreshAuth: async () => {
          refreshCalls++;
          return 'fresh-push-token';
        },
      },
      mergeDriver
    );
    const dest = path.join(tmp, 'B_push_auth');
    const ctx = { dir: dest, url, token: 'old-token' };
    await guardedClient.clone(ctx);
    fs.writeFileSync(path.join(dest, 'auth-recovered.md'), 'pushed after refresh\n');
    await guardedClient.add(ctx, 'auth-recovered.md');
    await guardedClient.commit(ctx, 'auth recovery push');
    challengePush = true;
    await guardedClient.push(ctx);
    expect(refreshCalls).toBe(1);
    expect(status401Count).toBeGreaterThan(0);
    expect(ctx.token).toBe('fresh-push-token');
    const check = path.join(tmp, 'C_push_verify');
    await client.clone({ dir: check, url, token: 'not-enforced' });
    expect(fs.readFileSync(path.join(check, 'auth-recovered.md'), 'utf8')).toBe(
      'pushed after refresh\n'
    );
  });

  it('does not loop indefinitely when a refreshed credential is also rejected', async () => {
    let refreshCalls = 0;
    const unauthorizedHttp: typeof nodeHttp = {
      request: async (args) => {
        const actual = await nodeHttp.request(args);
        if (args.url.includes('/info/refs?')) return { ...actual, statusCode: 401 };
        return actual;
      },
    };
    const failureClient = createGitClient(
      {
        fs,
        http: unauthorizedHttp,
        refreshAuth: async () => {
          refreshCalls++;
          return 'still-invalid';
        },
      },
      mergeDriver
    );
    await expect(
      failureClient.clone({
        dir: path.join(tmp, 'rejected_again'),
        url,
        token: 'invalid',
      })
    ).rejects.toMatchObject({ code: 'UserCanceledError' });
    expect(refreshCalls).toBe(1);
  });
});
