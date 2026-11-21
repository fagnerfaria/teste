import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { createGitClient } from './git-client';
import { mergeNote } from './merge-note';
import { startFakeGitHttpServer, type FakeGitHttpServer } from './fake-git-http';

const freshToken = 'fresh-token-from-refresh';
const expectedAuthorization = 'Basic ' + btoa('x-access-token:' + freshToken);
const mergeDriver: MergeDriverCallback = ({ contents }) => {
  const [base, ours, theirs] = contents;
  const { text, clean } = mergeNote(base, ours, theirs);
  return { cleanMerge: clean, mergedText: text };
};

let root: string;
let local: string;
let server: FakeGitHttpServer;
let url: string;

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-real-http-auth-'));
  local = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-real-http-work-'));
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(root, 'repo.git')]);
  server = await startFakeGitHttpServer(root, { expectedAuthorization });
  url = server.url('repo.git');
});

afterEach(async () => {
  await server.close();
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(local, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

describe('Agentage GitClient against isolated native Git smart-HTTP', () => {
  it('refreshes a rejected push credential, sends Basic auth only in headers, and a second client clones the pushed note', async () => {
    let refreshCalls = 0;
    const client = createGitClient(
      {
        fs,
        http: nodeHttp,
        refreshAuth: async () => {
          refreshCalls++;
          return freshToken;
        },
      },
      mergeDriver
    );
    const ctx = { dir: local, url, token: 'stale-token' };

    await client.init(ctx);
    await client.addRemote(ctx);
    fs.writeFileSync(path.join(local, 'native-http.md'), '# native HTTP auth\n');
    await client.add(ctx, 'native-http.md');
    await client.commit(ctx, 'native HTTP authentication test');
    await client.push(ctx);

    expect(refreshCalls).toBe(1);
    expect(ctx.token).toBe(freshToken);
    expect(url).not.toContain('stale-token');
    expect(url).not.toContain(freshToken);
    expect(server.requests.some((r) => r.authorizationPresent && !r.authorizationValid)).toBe(true);
    expect(server.requests.some((r) => r.authorizationValid)).toBe(true);
    expect(server.requests.every((r) => !('authorization' in r))).toBe(true);

    const verifyDir = path.join(local, 'verify');
    await client.clone({ dir: verifyDir, url, token: freshToken });
    expect(fs.readFileSync(path.join(verifyDir, 'native-http.md'), 'utf8')).toContain(
      '# native HTTP auth'
    );
    expect(
      server.requests.every(
        (r) => r.remoteAddress === '127.0.0.1' || r.remoteAddress === '::ffff:127.0.0.1'
      )
    ).toBe(true);
  });
});
