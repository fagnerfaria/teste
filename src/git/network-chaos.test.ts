import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import nodeHttp from 'isomorphic-git/http/node';
import type { HttpClient, MergeDriverCallback } from 'isomorphic-git';
import { createGitClient } from './git-client';
import { mergeNote } from './merge-note';
import { startGitServer, type GitServer } from './git-test-server';
import { createSyncController, type SyncStatus } from '../sync-controller';

const driver: MergeDriverCallback = ({ contents }) => {
  const [b, o, t] = contents;
  const r = mergeNote(b, o, t);
  return { cleanMerge: r.clean, mergedText: r.text };
};
let base: string;
let server: GitServer;
let url: string;
const opt = () => ({ url, token: 'synthetic' });
const healthy = createGitClient({ fs, http: nodeHttp }, driver);
const runner = (dir: string, client = healthy, onStatus?: (s: SyncStatus) => void) =>
  createSyncController({ client, fs, dir, now: () => new Date().toISOString(), onStatus });
beforeEach(async () => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-net-chaos-'));
  const b = path.join(base, 'bare');
  fs.mkdirSync(b);
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(b, 'chaos.git')]);
  server = await startGitServer(b);
  url = server.url('chaos.git');
});
afterEach(async () => {
  await server.close();
  fs.rmSync(base, { recursive: true, force: true });
});

describe('network failure at each Git HTTP stage', () => {
  it.each([1, 2, 3, 4])(
    'recovers from a disconnect at HTTP request #%i without dropping local changes',
    async (failAt) => {
      const A = path.join(base, 'writerA');
      fs.mkdirSync(A);
      fs.writeFileSync(path.join(A, 'case.md'), '# baseline\n');
      await runner(A).syncNow(opt());
      const B = path.join(base, 'writerB');
      fs.mkdirSync(B);
      await runner(B).syncNow(opt());
      const localEdit = '# private synthetic edit after disconnect\n';
      fs.writeFileSync(path.join(B, 'case.md'), localEdit);
      let requests = 0;
      let didFail = false;
      const transport: HttpClient = {
        request: async (args) => {
          requests++;
          if (requests === failAt) {
            didFail = true;
            throw new Error('SyntheticNetworkDisconnect_' + failAt);
          }
          return nodeHttp.request(args);
        },
      };
      const faulty = createGitClient({ fs, http: transport }, driver);
      const statuses: SyncStatus[] = [];
      const controller = runner(B, faulty, (s) => statuses.push(s));
      let gotError: unknown;
      try {
        await controller.syncNow(opt());
      } catch (e) {
        gotError = e;
      }
      expect(didFail).toBe(true);
      expect(gotError).toBeInstanceOf(Error);
      expect(fs.readFileSync(path.join(B, 'case.md'), 'utf8')).toBe(localEdit);
      expect(statuses.at(-1)).toBe('error');
      expect(fs.existsSync(path.join(B, '.git', 'index.lock'))).toBe(false);
      // Normal retry is allowed to finish; validate through a clean, third client clone.
      await runner(B).syncNow(opt());
      const C = path.join(base, 'readerC');
      fs.mkdirSync(C);
      await runner(C).syncNow(opt());
      expect(fs.readFileSync(path.join(C, 'case.md'), 'utf8')).toBe(localEdit);
      console.log(
        'AGENTAGE_NETWORK_RECOVERY',
        JSON.stringify({ failAt, requests, recovered: true })
      );
    },
    90000
  );
});
