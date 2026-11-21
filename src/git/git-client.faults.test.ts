import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { MergeDriverCallback } from 'isomorphic-git';
import type { HttpClient } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { startGitServer, type GitServer } from './git-test-server';
import { createGitClient } from './git-client';

const driver: MergeDriverCallback = ({ contents }) => ({
  cleanMerge: true,
  mergedText: contents[2],
});
let root: string;
let local: string;
let srv: GitServer;
let url: string;

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-fault-git-'));
  local = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-fault-local-'));
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(root, 'fault.git')]);
  srv = await startGitServer(root);
  url = srv.url('fault.git');
});
afterEach(async () => {
  await srv.close();
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 25, retryDelay: 100 });
  fs.rmSync(local, { recursive: true, force: true, maxRetries: 25, retryDelay: 100 });
});

const faultHttp = (status: number): HttpClient => ({
  request: async (args) => {
    const r = await nodeHttp.request(args);
    if (args.url.includes('info/refs'))
      return { ...r, statusCode: status, statusMessage: 'Synthetic Fault' };
    return r;
  },
});
const repo = (name: string) => ({ dir: path.join(local, name), url, token: 'token-fake' });

describe('real Git HTTP fault injection', () => {
  it('must not call a 403-forbidden remote an empty repository', async () => {
    const c = createGitClient({ fs, http: faultHttp(403) }, driver);
    await expect(c.remoteHasRef(repo('forbidden'))).rejects.toBeInstanceOf(Error);
  });
  it('must not call a 503-down remote an empty repository', async () => {
    const c = createGitClient({ fs, http: faultHttp(503) }, driver);
    await expect(c.remoteHasRef(repo('unavailable'))).rejects.toBeInstanceOf(Error);
  });
  it.each([400, 401, 403, 404, 408, 429, 500, 502, 503, 504])(
    'must reject HTTP %s when checking the remote reference, rather than reporting empty',
    async (status) => {
      const c = createGitClient({ fs, http: faultHttp(status) }, driver);
      await expect(c.remoteHasRef(repo('http' + status))).rejects.toBeInstanceOf(Error);
    }
  );

  it('must not regard a similarly prefixed branch as main', async () => {
    const normal = createGitClient({ fs, http: nodeHttp }, driver);
    const seed = repo('branch-seed');
    fs.mkdirSync(seed.dir, { recursive: true });
    fs.writeFileSync(path.join(seed.dir, 'note.md'), '# seed\n');
    await normal.init(seed);
    await normal.addRemote(seed);
    await normal.add(seed, 'note.md');
    await normal.commit(seed, 'base');
    await normal.push(seed);
    const bare = path.join(root, 'fault.git');
    const head = execFileSync('git', ['--git-dir', bare, 'rev-parse', 'refs/heads/main'], {
      encoding: 'utf8',
    }).trim();
    execFileSync('git', ['--git-dir', bare, 'update-ref', 'refs/heads/main-backup', head]);
    execFileSync('git', ['--git-dir', bare, 'update-ref', '-d', 'refs/heads/main']);
    expect(await normal.remoteHasRef(seed)).toBe(false);
  });
  it('must reject a 503 fetch rather than reusing a stale local origin/main', async () => {
    const clean = createGitClient({ fs, http: nodeHttp }, driver);
    const seed = repo('seed');
    fs.mkdirSync(seed.dir, { recursive: true });
    fs.writeFileSync(path.join(seed.dir, 'note.md'), '# seed\n');
    await clean.init(seed);
    await clean.addRemote(seed);
    await clean.add(seed, 'note.md');
    await clean.commit(seed, 'seed');
    await clean.push(seed);
    const dest = repo('clone');
    await clean.clone(dest);
    const old = await clean.remoteOid(dest);
    expect(old).toMatch(/^[0-9a-f]{40}$/);
    const broken = createGitClient({ fs, http: faultHttp(503) }, driver);
    await expect(broken.remoteOid(dest)).rejects.toBeInstanceOf(Error);
  });
});
