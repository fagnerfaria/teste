import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { HttpClient, MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { createGitClient } from './git/git-client';
import { withHttpDeadline } from './git/http-deadline';
import { startGitServer, type GitServer } from './git/git-test-server';
import { mergeNote } from './git/merge-note';
import { createSyncController, type SyncStatus } from './sync-controller';

const mergeDriver: MergeDriverCallback = ({ contents }) => {
  const [base, ours, theirs] = contents;
  const { text, clean } = mergeNote(base, ours, theirs);
  return { cleanMerge: clean, mergedText: text };
};

let root: string;
let tmp: string;
let server: GitServer;
let url: string;

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-http-deadline-root-'));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-http-deadline-work-'));
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(root, 'repo.git')]);
  server = await startGitServer(root);
  url = server.url('repo.git');
});

afterEach(async () => {
  await server.close();
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

const makeDir = (name: string) => {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

describe('P5.3-B HTTP timeout with real local Git and state integrity', () => {
  it('keeps local commit and retries safely on same controller after a transport timeout', async () => {
    const local = makeDir('local');
    fs.writeFileSync(path.join(local, 'note.md'), 'version 1\n');
    const normalClient = createGitClient({ fs, http: nodeHttp }, mergeDriver);
    const context = { url, token: 'synthetic-no-real-credentials' };
    const seeded = await createSyncController({
      client: normalClient,
      fs,
      dir: local,
      now: () => '2026-11-20T01:00:00.000Z',
    }).syncNow(context);
    expect(seeded.pushed).toBe(true);

    fs.writeFileSync(path.join(local, 'note.md'), 'version 1\nversion 2 retained\n');
    let syntheticSocketStalled = false;
    let abortWasDelivered = false;
    const intermittentTransport: HttpClient = {
      request: async (args) => {
        if (!syntheticSocketStalled && args.url.includes('/git-receive-pack')) {
          syntheticSocketStalled = true;
          return new Promise((_resolve, reject) => {
            args.signal?.addEventListener(
              'abort',
              () => {
                abortWasDelivered = true;
                reject(new Error('synthetic HTTP socket destroyed'));
              },
              { once: true }
            );
          });
        }
        return nodeHttp.request(args);
      },
    };
    const statuses: SyncStatus[] = [];
    const cancellableClient = createGitClient(
      {
        fs,
        http: withHttpDeadline(intermittentTransport, 2500),
      },
      mergeDriver
    );
    const controller = createSyncController({
      client: cancellableClient,
      fs,
      dir: local,
      now: () => '2026-11-20T01:01:00.000Z',
      onStatus: (status) => statuses.push(status),
    });

    await expect(controller.syncNow(context)).rejects.toThrow(/timed out/i);
    expect(abortWasDelivered).toBe(true);
    expect(syntheticSocketStalled).toBe(true);
    expect(controller.isRunning()).toBe(false);
    expect(statuses).toContain('error');

    const headAfterTimeout = execFileSync('git', ['-C', local, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    const remoteHeadBeforeRetry = execFileSync(
      'git',
      ['--git-dir', path.join(root, 'repo.git'), 'rev-parse', 'refs/heads/main'],
      { encoding: 'utf8' }
    ).trim();
    expect(headAfterTimeout).not.toBe(remoteHeadBeforeRetry);
    expect(fs.readFileSync(path.join(local, 'note.md'), 'utf8')).toContain('version 2 retained');

    const recovered = await controller.syncNow(context);
    expect(recovered.action).toBe('synced');
    expect(recovered.pushed).toBe(true);
    const remoteHeadAfterRetry = execFileSync(
      'git',
      ['--git-dir', path.join(root, 'repo.git'), 'rev-parse', 'refs/heads/main'],
      { encoding: 'utf8' }
    ).trim();
    expect(remoteHeadAfterRetry).toBe(headAfterTimeout);
    const otherClient = makeDir('other-client');
    await normalClient.clone({ dir: otherClient, ...context });
    expect(fs.readFileSync(path.join(otherClient, 'note.md'), 'utf8')).toContain(
      'version 2 retained'
    );
    expect(controller.isRunning()).toBe(false);
    expect(statuses[statuses.length - 1]).toBe('idle');
  });
});
