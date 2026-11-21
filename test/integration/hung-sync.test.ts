import { afterEach, describe, expect, it, vi } from 'vitest';
import { obsidianMockFactory } from '../fakes/obsidian';
vi.mock('obsidian', () => obsidianMockFactory());
import { bootReady, signIn, MEMORY, syncStateOf, type Handles } from './_helpers';

describe('stalled sync watchdog', () => {
  let h: Handles | undefined;
  afterEach(async () => {
    if (h) await h.teardown();
    vi.restoreAllMocks();
    h = undefined;
  });

  it('warns after three minutes but never releases a Git operation that is still active', async () => {
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    let fire!: () => void;
    const windowObj = globalThis.window as unknown as {
      setTimeout: (callback: () => void, ms: number) => number;
      clearTimeout: (id: number) => void;
    };
    const timeout = vi.spyOn(windowObj, 'setTimeout').mockImplementation((callback) => {
      fire = callback;
      return 933 as number;
    });
    const clear = vi.spyOn(windowObj, 'clearTimeout');
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const work = vi.fn(async () => {
      if (work.mock.calls.length === 1) await blocked;
      return { action: 'synced', committed: false, pushed: true, conflicted: [] };
    });
    const controller = vi
      .spyOn(h.plugin as unknown as { buildController: () => unknown }, 'buildController')
      .mockImplementation(() => ({ syncNow: work }));
    const first = h.plugin.syncNow();
    await vi.waitFor(() => expect(work).toHaveBeenCalledTimes(1));
    expect(timeout).toHaveBeenCalledWith(expect.any(Function), 3 * 60_000);
    fire();
    expect(syncStateOf(h)).toBe('error');
    const manualRetry = h.plugin.syncNow();
    expect(controller).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledTimes(1);
    try {
      // A UI timeout must not create a second HTTP/Git operation.
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(work).toHaveBeenCalledTimes(1);
    } finally {
      release();
      await Promise.allSettled([first, manualRetry]);
    }
    expect(clear).toHaveBeenCalledWith(933);
    await h.plugin.syncNow();
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('disarms the watchdog after an ordinary fast successful sync', async () => {
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    const windowObj = globalThis.window as unknown as {
      setTimeout: (callback: () => void, ms: number) => number;
      clearTimeout: (id: number) => void;
    };
    const clear = vi.spyOn(windowObj, 'clearTimeout');
    const timeout = vi.spyOn(windowObj, 'setTimeout').mockImplementation(() => 934);
    vi.spyOn(
      h.plugin as unknown as { buildController: () => unknown },
      'buildController'
    ).mockImplementation(() => ({
      syncNow: async () => ({ action: 'synced', committed: false, pushed: true, conflicted: [] }),
    }));
    const result = await h.plugin.syncNow();
    expect(result.ok).toBe(true);
    expect(timeout).toHaveBeenCalledWith(expect.any(Function), 3 * 60_000);
    await vi.waitFor(() => expect(clear).toHaveBeenCalledWith(934));
  });
});
