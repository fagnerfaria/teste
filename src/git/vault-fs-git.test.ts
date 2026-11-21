import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import nodefs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import git, { type FsClient, type MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';

// VaultFs imports TFile + normalizePath from 'obsidian' (no runtime package in Node).
vi.mock('obsidian', () => ({
  TFile: class TFile {},
  normalizePath: (p: string) => {
    const n = p
      .replace(/\\/g, '/')
      .replace(/\/{2,}/g, '/')
      .replace(/^\/+|\/+$/g, '');
    return n === '' ? '/' : n;
  },
}));

import { startGitServer, type GitServer } from './git-test-server';
import { VaultFs } from './vault-fs';
import { createGitClient } from './git-client';
import { mergeNote } from './merge-note';

const author = { name: 'tester', email: 't@e.io' };
const onAuth = () => ({ headers: { Authorization: 'Bearer test-token' } });
const mergeDriver: MergeDriverCallback = ({ contents }) => {
  const [b, o, t] = contents;
  const { text, clean } = mergeNote(b, o, t);
  return { cleanMerge: clean, mergedText: text };
};

// A minimal Obsidian DataAdapter over a tmp dir — the desktop FileSystemAdapter (and the
// mobile CapacitorAdapter) expose this same surface, so VaultFs runs identically here.
function makeVaultFs(
  rootDir: string,
  staleSeedStat?: { type: 'file'; size: number; ctime: number; mtime: number }
): FsClient {
  const real = (p: string) => (p === '/' || p === '' ? rootDir : path.join(rootDir, p));
  const adapter = {
    async read(p: string): Promise<string> {
      return nodefs.readFileSync(real(p), 'utf8');
    },
    async readBinary(p: string): Promise<ArrayBuffer> {
      const b = nodefs.readFileSync(real(p));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
    async write(p: string, data: string): Promise<void> {
      nodefs.mkdirSync(path.dirname(real(p)), { recursive: true });
      nodefs.writeFileSync(real(p), data);
    },
    async writeBinary(p: string, data: ArrayBuffer): Promise<void> {
      nodefs.mkdirSync(path.dirname(real(p)), { recursive: true });
      nodefs.writeFileSync(real(p), Buffer.from(data));
    },
    async stat(p: string) {
      if (p === 'seed.md' && staleSeedStat) return staleSeedStat;
      try {
        const s = nodefs.statSync(real(p));
        return {
          type: (s.isDirectory() ? 'folder' : 'file') as 'folder' | 'file',
          size: s.size,
          ctime: s.ctimeMs,
          mtime: s.mtimeMs,
        };
      } catch {
        return null;
      }
    },
    async list(p: string) {
      const dir = real(p);
      const prefix = p === '/' || p === '' ? '' : p.replace(/\/$/, '') + '/';
      const files: string[] = [];
      const folders: string[] = [];
      for (const name of nodefs.readdirSync(dir)) {
        if (nodefs.statSync(path.join(dir, name)).isDirectory()) folders.push(prefix + name);
        else files.push(prefix + name);
      }
      return { files, folders };
    },
    async mkdir(p: string): Promise<void> {
      nodefs.mkdirSync(real(p), { recursive: true });
    },
    async rmdir(p: string, recursive: boolean): Promise<void> {
      nodefs.rmSync(real(p), { recursive, force: true });
    },
    async remove(p: string): Promise<void> {
      nodefs.rmSync(real(p), { force: true });
    },
  };
  const vault = { adapter, configDir: '.obsidian', getAbstractFileByPath: () => null };
  return new VaultFs(vault as never, '.git') as unknown as FsClient;
}

let root: string;
let tmp: string;
let srv: GitServer;
let url: string;

async function seedBare(): Promise<void> {
  const S = path.join(tmp, 'seed');
  nodefs.mkdirSync(S, { recursive: true });
  await git.init({ fs: nodefs, dir: S, defaultBranch: 'main' });
  await git.addRemote({ fs: nodefs, dir: S, remote: 'origin', url });
  nodefs.writeFileSync(path.join(S, 'seed.md'), '# seed\n');
  await git.add({ fs: nodefs, dir: S, filepath: 'seed.md' });
  await git.commit({ fs: nodefs, dir: S, message: 'seed', author });
  await git.push({ fs: nodefs, http: nodeHttp, dir: S, remote: 'origin', ref: 'main', onAuth });
}

beforeEach(async () => {
  root = nodefs.mkdtempSync(path.join(os.tmpdir(), 'gitsrv-'));
  tmp = nodefs.mkdtempSync(path.join(os.tmpdir(), 'vfswork-'));
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(root, 'app.git')]);
  srv = await startGitServer(root);
  url = srv.url('app.git');
  await seedBare();
});
afterEach(async () => {
  await srv.close();
  nodefs.rmSync(root, { recursive: true, force: true });
  nodefs.rmSync(tmp, { recursive: true, force: true });
});

// This is the real desktop+mobile fs path (dir='' = vault root, .git inside it). The 54
// other tests use node:fs; nothing exercised VaultFs against the engine — the gap that let
// a broken fs layer ship silently (clone/push never fired in Obsidian).
describe('VaultFs ↔ git engine round-trip (the prod fs path)', () => {
  it('clones through VaultFs: the worktree file lands on the adapter', async () => {
    const A = path.join(tmp, 'A');
    nodefs.mkdirSync(A, { recursive: true });
    const client = createGitClient({ fs: makeVaultFs(A), http: nodeHttp }, mergeDriver);
    await client.clone({ dir: '', gitdir: '.git', url, token: 'test-token' });
    expect(nodefs.readFileSync(path.join(A, 'seed.md'), 'utf8')).toContain('# seed');
    expect(nodefs.existsSync(path.join(A, '.git', 'HEAD'))).toBe(true);
  });

  it('commits + pushes a local edit through VaultFs; a second VaultFs clone sees it', async () => {
    const A = path.join(tmp, 'A');
    nodefs.mkdirSync(A, { recursive: true });
    const ca = createGitClient({ fs: makeVaultFs(A), http: nodeHttp }, mergeDriver);
    const ctx = { dir: '', gitdir: '.git', url, token: 't' };
    await ca.clone(ctx);
    nodefs.writeFileSync(path.join(A, 'note.md'), '# from VaultFs\n');
    await ca.add(ctx, 'note.md');
    await ca.commit(ctx, 'add note');
    await ca.push(ctx);

    const B = path.join(tmp, 'B');
    nodefs.mkdirSync(B, { recursive: true });
    const cb = createGitClient({ fs: makeVaultFs(B), http: nodeHttp }, mergeDriver);
    await cb.clone({ dir: '', gitdir: '.git', url, token: 't' });
    expect(nodefs.readFileSync(path.join(B, 'note.md'), 'utf8')).toContain('# from VaultFs');
  });
  it('cleanly merges independent changes through VaultFs with an empty dir', async () => {
    const A = path.join(tmp, 'cleanmerge-A');
    const B = path.join(tmp, 'cleanmerge-B');
    const C = path.join(tmp, 'cleanmerge-C');
    for (const d of [A, B, C]) nodefs.mkdirSync(d, { recursive: true });
    const ctx = { dir: '', gitdir: '.git', url, token: 'test' };
    const ca = createGitClient({ fs: makeVaultFs(A), http: nodeHttp }, mergeDriver);
    const cb = createGitClient({ fs: makeVaultFs(B), http: nodeHttp }, mergeDriver);
    const cc = createGitClient({ fs: makeVaultFs(C), http: nodeHttp }, mergeDriver);
    await ca.clone(ctx);
    await cb.clone(ctx);
    nodefs.writeFileSync(path.join(A, 'from-A.md'), '# from A\n');
    await ca.add(ctx, 'from-A.md');
    await ca.commit(ctx, 'A independent');
    await ca.push(ctx);
    nodefs.writeFileSync(path.join(B, 'from-B.md'), '# from B\n');
    await cb.add(ctx, 'from-B.md');
    await cb.commit(ctx, 'B independent');
    const outcome = await cb.pull(ctx);
    expect(outcome.conflicted).toEqual([]);
    expect(nodefs.readFileSync(path.join(B, 'from-A.md'), 'utf8')).toBe('# from A\n');
    expect(nodefs.readFileSync(path.join(B, 'from-B.md'), 'utf8')).toBe('# from B\n');
    await cb.push(ctx);
    await cc.clone(ctx);
    expect(nodefs.readFileSync(path.join(C, 'from-A.md'), 'utf8')).toBe('# from A\n');
    expect(nodefs.readFileSync(path.join(C, 'from-B.md'), 'utf8')).toBe('# from B\n');
  });
  it('exposes conflict markers with the production VaultFs shim and valid metadata', async () => {
    const A = path.join(tmp, 'standard-conflict-A');
    const B = path.join(tmp, 'standard-conflict-B');
    nodefs.mkdirSync(A, { recursive: true });
    nodefs.mkdirSync(B, { recursive: true });
    const ctx = { dir: '', gitdir: '.git', url, token: 'test' };
    const aFs = makeVaultFs(A);
    const bFs = makeVaultFs(B);
    const ca = createGitClient({ fs: aFs, http: nodeHttp }, mergeDriver);
    const cb = createGitClient({ fs: bFs, http: nodeHttp }, mergeDriver);
    await ca.clone(ctx);
    await cb.clone(ctx);
    nodefs.writeFileSync(path.join(A, 'seed.md'), '# client A\n');
    await ca.add(ctx, 'seed.md');
    await ca.commit(ctx, 'client A');
    await ca.push(ctx);
    nodefs.writeFileSync(path.join(B, 'seed.md'), '# client B\n');
    await cb.add(ctx, 'seed.md');
    await cb.commit(ctx, 'client B');
    const pulled = await cb.pull(ctx);
    const content = nodefs.readFileSync(path.join(B, 'seed.md'), 'utf8');
    console.log('VAULTFS_CONFLICT', JSON.stringify({ pulled, content }));
    expect(pulled.conflicted).toContain('seed.md');
    expect(content).toContain('<<<<<<<');
    expect(content).toContain('client A');
    expect(content).toContain('client B');
  });
  it('preserves stale-metadata local edits through the real VaultFs adapter', async () => {
    const A = path.join(tmp, 'racy-A');
    const B = path.join(tmp, 'racy-B');
    nodefs.mkdirSync(A, { recursive: true });
    nodefs.mkdirSync(B, { recursive: true });
    const ctx = { dir: '', gitdir: '.git', url, token: 'synthetic-test' };
    const aFs = makeVaultFs(A);
    const bFs = makeVaultFs(B);
    const aClient = createGitClient({ fs: aFs, http: nodeHttp }, mergeDriver);
    const bClient = createGitClient({ fs: bFs, http: nodeHttp }, mergeDriver);
    await aClient.clone(ctx);
    await bClient.clone(ctx);
    const bOriginal = nodefs.statSync(path.join(B, 'seed.md'));
    const stale = {
      type: 'file' as const,
      size: bOriginal.size,
      ctime: bOriginal.ctimeMs,
      mtime: bOriginal.mtimeMs,
    };
    const bStaleFs = makeVaultFs(B, stale);
    const bStaleClient = createGitClient({ fs: bStaleFs, http: nodeHttp }, mergeDriver);
    nodefs.writeFileSync(path.join(B, 'seed.md'), '# client B\n');
    const matrix = await bStaleClient.statusMatrix(ctx);
    const row = matrix.find((x) => x[0] === 'seed.md');
    expect(row).toBeDefined();
    expect(row![2]).not.toBe(row![1]);
    nodefs.writeFileSync(path.join(A, 'seed.md'), '# client A\n');
    await aClient.add(ctx, 'seed.md');
    await aClient.commit(ctx, 'A edited');
    await aClient.push(ctx);
    // Commit local B before pull exactly as the production sync controller does.
    await bStaleClient.add(ctx, 'seed.md');
    await bStaleClient.commit(ctx, 'B preserved');
    const pulled = await bStaleClient.pull(ctx);
    expect(pulled.conflicted).toContain('seed.md');
    expect(nodefs.readFileSync(path.join(B, 'seed.md'), 'utf8')).toContain('client B');
    expect(nodefs.readFileSync(path.join(B, 'seed.md'), 'utf8')).toContain('client A');
  });
});
