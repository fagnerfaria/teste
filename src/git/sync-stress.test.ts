import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import type { MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { mergeNote } from './merge-note';
import { createGitClient } from './git-client';
import { startGitServer, type GitServer } from './git-test-server';
import { createSyncController } from '../sync-controller';

const driver: MergeDriverCallback = ({ contents }) => {
  const [base, ours, theirs] = contents;
  const { text, clean } = mergeNote(base, ours, theirs);
  return { cleanMerge: clean, mergedText: text };
};
const client = createGitClient({ fs, http: nodeHttp }, driver);
let temp: string;
let srv: GitServer;
let url: string;
const now = () => '2026-11-17T02:30:00.000Z';
const opts = () => ({ url, token: 'synthetic-not-real' });
const runner = (folder: string) => createSyncController({ client, fs, dir: folder, now });
const hash = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const mk = (p: string) => {
  const d = path.join(temp, p);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const timed = async (fn: () => Promise<unknown>) => {
  const start = performance.now();
  const x = await fn();
  return { result: x, elapsedMs: Math.round(performance.now() - start) };
};
beforeEach(async () => {
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-load-'));
  const rem = path.join(temp, 'bare');
  fs.mkdirSync(rem);
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(rem, 'load.git')]);
  srv = await startGitServer(rem);
  url = srv.url('load.git');
});
afterEach(async () => {
  await srv.close();
  fs.rmSync(temp, { recursive: true, force: true });
});

describe('bounded real-Git workloads (discardable HTTP Git server)', () => {
  it('syncs 100 notes + a 512KiB attachment, then edits/removes/renames and round-trips', async () => {
    const A = mk('A');
    for (let i = 0; i < 100; i++) {
      const d = path.join(A, 'notes', 'n' + String(i % 7));
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(
        path.join(d, 'file-' + String(i).padStart(3, '0') + '.md'),
        '# Mock ' +
          i +
          '\nfrontmatter: ' +
          i +
          '\n' +
          'conteudo sintetico abcdefghijklmnopqrstuvwxyz\n'.repeat(25)
      );
    }
    const attach = path.join(A, 'binary', 'random.bin');
    fs.mkdirSync(path.dirname(attach), { recursive: true });
    // Deterministic non-secret content, for a stable independent equality check.
    fs.writeFileSync(attach, Buffer.alloc(512 * 1024, 0xa5));
    const a = runner(A);
    const first = await timed(() => a.syncNow(opts()));
    const B = mk('B');
    const b = runner(B);
    const second = await timed(() => b.syncNow(opts()));
    expect(hash(path.join(B, 'binary', 'random.bin'))).toBe(hash(attach));
    expect(fs.readdirSync(path.join(B, 'notes', 'n0')).length).toBeGreaterThan(0);

    for (let i = 0; i < 20; i++) {
      const p = path.join(
        A,
        'notes',
        'n' + String(i % 7),
        'file-' + String(i).padStart(3, '0') + '.md'
      );
      fs.appendFileSync(p, '\nEdited safely ' + i);
    }
    for (let i = 20; i < 30; i++) {
      const p = path.join(
        A,
        'notes',
        'n' + String(i % 7),
        'file-' + String(i).padStart(3, '0') + '.md'
      );
      fs.unlinkSync(p);
    }
    const renamedFrom = path.join(A, 'notes', 'n2', 'file-002.md');
    const renamedTo = path.join(A, 'notes', 'n2', 'file-002-renamed.md');
    fs.renameSync(renamedFrom, renamedTo);
    const third = await timed(() => a.syncNow(opts()));
    const fourth = await timed(() => b.syncNow(opts()));
    expect(fs.existsSync(path.join(B, 'notes', 'n2', 'file-002.md'))).toBe(false);
    expect(hash(path.join(B, 'notes', 'n2', 'file-002-renamed.md'))).toBe(hash(renamedTo));
    for (let i = 20; i < 30; i++) {
      const p = path.join(
        B,
        'notes',
        'n' + String(i % 7),
        'file-' + String(i).padStart(3, '0') + '.md'
      );
      expect(fs.existsSync(p)).toBe(false);
    }
    console.log(
      'AGENTAGE_LOAD_RESULT',
      JSON.stringify({
        syntheticNotes: 100,
        attachmentBytes: 512 * 1024,
        firstSyncMs: first.elapsedMs,
        secondSyncMs: second.elapsedMs,
        modifyDeletePushMs: third.elapsedMs,
        remoteReceiveMs: fourth.elapsedMs,
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        integrity: 'sha256-match',
      })
    );
  }, 90000);

  it('preserves different local and remote modifications without losing either', async () => {
    const A = mk('client-a');
    fs.writeFileSync(path.join(A, 'base.md'), '# common\n');
    await runner(A).syncNow(opts());
    const B = mk('client-b');
    await runner(B).syncNow(opts());
    fs.writeFileSync(path.join(A, 'client-a-only.md'), '# A\n');
    fs.writeFileSync(path.join(B, 'client-b-only.md'), '# B\n');
    await runner(A).syncNow(opts());
    await runner(B).syncNow(opts());
    await runner(A).syncNow(opts());
    expect(fs.readFileSync(path.join(A, 'client-b-only.md'), 'utf8')).toBe('# B\n');
    expect(fs.readFileSync(path.join(B, 'client-a-only.md'), 'utf8')).toBe('# A\n');
    const third = mk('client-c');
    await runner(third).syncNow(opts());
    expect(fs.readFileSync(path.join(third, 'client-a-only.md'), 'utf8')).toBe('# A\n');
    expect(fs.readFileSync(path.join(third, 'client-b-only.md'), 'utf8')).toBe('# B\n');
  }, 90000);

  it('surfaces same-note conflicts and does not push unresolved changes', async () => {
    const A = mk('conflict-a');
    fs.writeFileSync(path.join(A, 'same.md'), '# V1\ntext original\n');
    await runner(A).syncNow(opts());
    const B = mk('conflict-b');
    await runner(B).syncNow(opts());
    fs.writeFileSync(path.join(A, 'same.md'), '# V2\nfrom client A\n');
    fs.writeFileSync(path.join(B, 'same.md'), '# V2\nfrom client B\n');
    await runner(A).syncNow(opts());
    const outcome = await runner(B).syncNow(opts());
    console.log(
      'AGENTAGE_CONFLICT_DIAGNOSTIC',
      JSON.stringify({
        outcome,
        localB: fs.readFileSync(path.join(B, 'same.md'), 'utf8'),
        localA: fs.readFileSync(path.join(A, 'same.md'), 'utf8'),
        directThreeWay: mergeNote(
          '# V1\ntext original\n',
          '# V2\nfrom client B\n',
          '# V2\nfrom client A\n'
        ),
      })
    );
    expect(outcome.pushed).toBe(false);
    expect(outcome.conflicted).toContain('same.md');
    const cc = fs.readFileSync(path.join(B, 'Agentage Sync Conflicts.md'), 'utf8');
    expect(cc).toContain('same.md');
    expect(fs.readFileSync(path.join(A, 'same.md'), 'utf8')).toContain('client A');
  }, 90000);
});
describe('same-size same-mtime edits (data-loss regression)', () => {
  it('must preserve a local edit whose size and mtime match the original', async () => {
    const A = mk('racy-a');
    fs.writeFileSync(path.join(A, 'same.md'), '# V1\ntext original\n');
    await runner(A).syncNow(opts());
    const B = mk('racy-b');
    await runner(B).syncNow(opts());
    const fB = path.join(B, 'same.md');
    const fixedTime = new Date('2020-01-01T00:00:00.000Z');
    fs.utimesSync(fB, fixedTime, fixedTime);
    await client.add({ dir: B, url, token: 'synthetic-not-real' }, 'same.md');
    const before = fs.statSync(fB);
    fs.writeFileSync(fB, '# V2\nfrom client B\n');
    fs.utimesSync(fB, before.atime, before.mtime);
    const after = fs.statSync(fB);
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    const initialMatrix = await client.statusMatrix({ dir: B, url, token: 'synthetic-not-real' });
    const entry = initialMatrix.find((row) => row[0] === 'same.md');
    console.log(
      'RACY_FILE_DIAG',
      JSON.stringify({
        originalSize: before.size,
        afterSize: after.size,
        originalMtime: before.mtimeMs,
        afterMtime: after.mtimeMs,
        matrix: entry,
      })
    );
    expect(entry).toBeDefined();
    expect(entry?.[2]).not.toBe(entry?.[1]);
    fs.writeFileSync(path.join(A, 'same.md'), '# V2\nfrom client A\n');
    await runner(A).syncNow(opts());
    const outcome = await runner(B).syncNow(opts());
    console.log('RACY_SYNC_RESULT', JSON.stringify(outcome));
    expect(outcome.pushed).toBe(false);
    expect(outcome.conflicted).toContain('same.md');
  }, 90000);
});
describe('high-volume large-vault performance', () => {
  it('performs a two-way Git round trip with 500 notes and a 16 MiB noncompressible file', async () => {
    const A = mk('heavy-a');
    for (let i = 0; i < 500; i++) {
      const dir = path.join(A, 'materials', 'group-' + String(i % 19));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'doc-' + String(i).padStart(4, '0') + '.md'),
        '# Synthetic document ' +
          i +
          '\n' +
          'legal test material without personal data\n'.repeat(14)
      );
    }
    fs.mkdirSync(path.join(A, 'attachments'));
    const binary = path.join(A, 'attachments', 'synthetic-random.bin');
    fs.writeFileSync(binary, crypto.randomBytes(16 * 1024 * 1024));
    const baseRss = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const seed = await timed(() => runner(A).syncNow(opts()));
    const B = mk('heavy-b');
    const clone = await timed(() => runner(B).syncNow(opts()));
    expect(hash(path.join(B, 'attachments', 'synthetic-random.bin'))).toBe(hash(binary));
    for (let i = 0; i < 75; i++) {
      const f = path.join(
        A,
        'materials',
        'group-' + String(i % 19),
        'doc-' + String(i).padStart(4, '0') + '.md'
      );
      fs.appendFileSync(f, '\nSynthetic change ' + i);
    }
    const push = await timed(() => runner(A).syncNow(opts()));
    const pull = await timed(() => runner(B).syncNow(opts()));
    for (let i = 0; i < 75; i++) {
      const f = path.join(
        B,
        'materials',
        'group-' + String(i % 19),
        'doc-' + String(i).padStart(4, '0') + '.md'
      );
      expect(fs.readFileSync(f, 'utf8')).toContain('Synthetic change ' + i);
    }
    console.log(
      'AGENTAGE_HEAVY_LOAD',
      JSON.stringify({
        files: 501,
        attachBytes: 16 * 1024 * 1024,
        seedMs: seed.elapsedMs,
        cloneMs: clone.elapsedMs,
        updateMs: push.elapsedMs,
        receiveMs: pull.elapsedMs,
        rssBeforeMb: baseRss,
        rssAfterMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        hashesMatch: true,
      })
    );
  }, 150000);
});
