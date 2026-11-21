import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { mergeNote } from './merge-note';
import { startGitServer } from './git-test-server';
import { createGitClient } from './git-client';
import { createSyncController } from '../sync-controller';

const driver: MergeDriverCallback = ({ contents }) => {
  const [b, o, t] = contents;
  const m = mergeNote(b, o, t);
  return { cleanMerge: m.clean, mergedText: m.text };
};
const opt = (url: string) => ({ url, token: 'synthetic' });
const makeCtrl = (client: ReturnType<typeof createGitClient>, fileSystem: typeof fs, dir: string) =>
  createSyncController({ client, fs: fileSystem, dir, now: () => new Date().toISOString() });

describe('racy filesystem stat and data preservation', () => {
  it('detects a changed file even if filesystem reports identical metadata (same length + stale mtime)', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-racy-'));
    const bare = path.join(tmp, 'bare');
    fs.mkdirSync(bare);
    execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(bare, 'racy.git')]);
    const srv = await startGitServer(bare);
    try {
      const url = srv.url('racy.git');
      const healthy = createGitClient({ fs, http: nodeHttp }, driver);
      const A = path.join(tmp, 'A');
      fs.mkdirSync(A);
      fs.writeFileSync(path.join(A, 'same.md'), '# V1\ntext original\n');
      await makeCtrl(healthy, fs, A).syncNow(opt(url));
      const B = path.join(tmp, 'B');
      fs.mkdirSync(B);
      await makeCtrl(healthy, fs, B).syncNow(opt(url));
      const bFile = path.join(B, 'same.md');
      const cached = fs.statSync(bFile);
      fs.writeFileSync(bFile, '# V2\nfrom client B\n');
      expect(fs.readFileSync(bFile, 'utf8')).toContain('client B');
      // Simulate a cache/filesystem that keeps reporting the pre-edit stat.
      const staleFs = {
        promises: new Proxy(fs.promises, {
          get(target, p) {
            if (p === 'lstat')
              return async (name: string) => {
                if (name.replaceAll('\\', '/').endsWith('/same.md')) return cached;
                return target.lstat(name);
              };
            const v = Reflect.get(target, p);
            return typeof v === 'function' ? v.bind(target) : v;
          },
        }),
      } as typeof fs;
      const affected = createGitClient({ fs: staleFs, http: nodeHttp }, driver);
      const prior = await affected.statusMatrix({ dir: B, url, token: 'synthetic' });
      console.log('RACY_STALE_MATRIX', JSON.stringify(prior.filter((x) => x[0] === 'same.md')));
      fs.writeFileSync(path.join(A, 'same.md'), '# V2\nfrom client A\n');
      await makeCtrl(healthy, fs, A).syncNow(opt(url));
      const outcome = await makeCtrl(affected, staleFs, B).syncNow(opt(url));
      const finalText = fs.readFileSync(bFile, 'utf8');
      console.log('RACY_STALE_OUTCOME', JSON.stringify({ outcome, finalText }));
      expect(finalText).toContain('client B');
      expect(outcome.conflicted).toContain('same.md');
      expect(outcome.pushed).toBe(false);
    } finally {
      await srv.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }, 90000);
});
