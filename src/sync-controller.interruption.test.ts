import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { HttpClient, MergeDriverCallback } from 'isomorphic-git';
import nodeHttp from 'isomorphic-git/http/node';
import { createGitClient } from './git/git-client';
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
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-interrupt-root-'));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-interrupt-work-'));
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', path.join(root, 'repo.git')]);
  server = await startGitServer(root);
  url = server.url('repo.git');
});

afterEach(async () => {
  await server.close();
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

const dir = (name: string) => {
  const result = path.join(tmp, name);
  fs.mkdirSync(result, { recursive: true });
  return result;
};
const opts = () => ({ url, token: 'synthetic-token' });

describe('P5.3 interrupted push and recovery after controller restart', () => {
  it('keeps a committed local change after receive-pack interruption and pushes it on a fresh controller', async () => {
    const local = dir('local');
    fs.writeFileSync(path.join(local, 'note.md'), 'version 1\n');
    const normalClient = createGitClient({ fs, http: nodeHttp }, mergeDriver);
    const initial = await createSyncController({
      client: normalClient,
      fs,
      dir: local,
      now: () => '2026-11-17T12:00:00.000Z',
    }).syncNow(opts());
    expect(initial.action).toBe('seeded');
    expect(initial.pushed).toBe(true);

    fs.writeFileSync(path.join(local, 'note.md'), 'version 1\nversion 2\n');
    let interrupted = false;
    const interruptHttp: HttpClient = {
      request: async (args) => {
        if (!interrupted && args.url.includes('/git-receive-pack')) {
          interrupted = true;
          throw new Error('Synthetic network interruption during receive-pack');
        }
        return nodeHttp.request(args);
      },
    };
    const interruptedStatuses: SyncStatus[] = [];
    const failingClient = createGitClient({ fs, http: interruptHttp }, mergeDriver);
    const failedController = createSyncController({
      client: failingClient,
      fs,
      dir: local,
      now: () => '2026-11-17T12:01:00.000Z',
      onStatus: (status) => interruptedStatuses.push(status),
    });

    await expect(failedController.syncNow(opts())).rejects.toThrow(
      'Synthetic network interruption'
    );
    expect(interrupted).toBe(true);
    expect(interruptedStatuses).toContain('error');

    const localHeadAfterFailure = execFileSync('git', ['-C', local, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    const remoteHeadAfterFailure = execFileSync(
      'git',
      ['--git-dir', path.join(root, 'repo.git'), 'rev-parse', 'refs/heads/main'],
      { encoding: 'utf8' }
    ).trim();
    expect(localHeadAfterFailure).not.toBe(remoteHeadAfterFailure);
    expect(fs.readFileSync(path.join(local, 'note.md'), 'utf8')).toContain('version 2');

    // A fresh controller instance models an Obsidian/plugin process restart.
    const restartedController = createSyncController({
      client: normalClient,
      fs,
      dir: local,
      now: () => '2026-11-17T12:02:00.000Z',
    });
    const recovered = await restartedController.syncNow(opts());
    expect(recovered.action).toBe('synced');
    expect(recovered.pushed).toBe(true);

    const remoteHeadAfterRecovery = execFileSync(
      'git',
      ['--git-dir', path.join(root, 'repo.git'), 'rev-parse', 'refs/heads/main'],
      { encoding: 'utf8' }
    ).trim();
    expect(remoteHeadAfterRecovery).toBe(localHeadAfterFailure);
    const verifier = dir('verifier');
    await normalClient.clone({ dir: verifier, url, token: 'synthetic-token' });
    expect(fs.readFileSync(path.join(verifier, 'note.md'), 'utf8')).toContain('version 2');
  });
});
