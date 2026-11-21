import { describe, it, expect, vi } from 'vitest';
import type { FsClient } from 'isomorphic-git';
import { createSyncController } from './sync-controller';
import type { GitClient } from './git/git-client';

const opts = { url: 'http://127.0.0.1/throwaway.git', token: 'test' };
const error = (message: string, code: string) => Object.assign(new Error(message), { code });

describe('filesystem + concurrency fault injection', () => {
  it('must not assume a vault is empty when reading its directory fails with EACCES', async () => {
    const clone = vi.fn(async () => {});
    const fakeGit = { clone } as unknown as GitClient;
    const fakeFs = {
      promises: {
        stat: async () => {
          throw error('git repository absent', 'ENOENT');
        },
        readdir: async () => {
          throw error('directory denied', 'EACCES');
        },
      },
    } as unknown as FsClient;
    const sut = createSyncController({
      client: fakeGit,
      fs: fakeFs,
      dir: 'synthetic-vault',
      now: () => '2026-11-17T00:00:00.000Z',
    });
    await expect(sut.syncNow(opts)).rejects.toThrow('directory denied');
    expect(clone).not.toHaveBeenCalled();
  });

  it('must not initialize a new repository when .git exists but stat is denied', async () => {
    const init = vi.fn(async () => {});
    const fakeGit = { init } as unknown as GitClient;
    const fakeFs = {
      promises: {
        stat: async () => {
          throw error('EACCES examining .git', 'EACCES');
        },
        readdir: async () => ['existing.md'],
      },
    } as unknown as FsClient;
    const sut = createSyncController({
      client: fakeGit,
      fs: fakeFs,
      dir: 'synthetic-vault',
      now: () => '2026-11-17T00:00:00.000Z',
    });
    await expect(sut.syncNow(opts)).rejects.toThrow('EACCES examining .git');
    expect(init).not.toHaveBeenCalled();
  });
  it('must not treat a HEAD permission failure as unborn branch', async () => {
    const pull = vi.fn(async () => ({ conflicted: [] }));
    const push = vi.fn(async () => ({ conflicted: [] }));
    const fakeGit = {
      remoteHasRef: async () => true,
      resolveRef: async () => {
        throw error('HEAD denied', 'EACCES');
      },
      statusMatrix: async () => [],
      pull,
      push,
    } as unknown as GitClient;
    const fakeFs = {
      promises: {
        stat: async () => ({ type: 'directory' }),
        readdir: async () => ['tracked.md', '.git'],
      },
    } as unknown as FsClient;
    const ctrl = createSyncController({
      client: fakeGit,
      fs: fakeFs,
      dir: 'synthetic-denied-head',
      now: () => '2026-11-17T00:00:00.000Z',
    });
    await expect(ctrl.syncNow(opts)).rejects.toThrow('HEAD denied');
    expect(pull).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
  it('documents that distinct controllers have independent locks (the plugin guards them)', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const clone = vi.fn(async () => {
      await held;
    });
    const fakeGit = { clone } as unknown as GitClient;
    const fakeFs = {
      promises: {
        stat: async () => {
          throw error('git repository absent', 'ENOENT');
        },
        readdir: async () => [],
      },
    } as unknown as FsClient;
    const deps = {
      client: fakeGit,
      fs: fakeFs,
      dir: 'synthetic-shared-vault',
      now: () => '2026-11-17T00:00:00.000Z',
    };
    const first = createSyncController(deps);
    const second = createSyncController(deps);
    const p1 = first.syncNow(opts);
    const p2 = second.syncNow(opts);
    try {
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(clone).toHaveBeenCalledTimes(2);
    } finally {
      release();
      await Promise.allSettled([p1, p2]);
    }
  });
});
