import { afterEach, describe, expect, it, vi } from 'vitest';
import { obsidianMockFactory } from '../fakes/obsidian';
vi.mock('obsidian', () => obsidianMockFactory());

import { Plugin } from 'obsidian';
import { bootReady, signIn, MEMORY, type Handles } from './_helpers';

type Tick = { intervalMs: number; fire: () => void };
function captureTicks(): Tick[] {
  const ticks: Tick[] = [];
  vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, interval) => {
    ticks.push({ intervalMs: interval ?? 0, fire: () => callback() });
    return 1234 as unknown as ReturnType<typeof setInterval>;
  });
  return ticks;
}

describe('automatic periodic sync (headless Obsidian lifecycle)', () => {
  let h: Handles | undefined;
  afterEach(async () => {
    if (h) await h.teardown();
    vi.restoreAllMocks();
    h = undefined;
  });

  it.each([0, -1, 0.001, 1e15])(
    'never schedules unsafe or disabled interval %s minutes',
    async (interval) => {
      const ticks = captureTicks();
      vi.spyOn(Plugin.prototype, 'loadData').mockResolvedValue({
        vault: '',
        vaultName: '',
        syncEnabled: true,
        origin: { remote: 'agentage', interval, ignore: [] },
      });
      h = await bootReady();
      expect(ticks).toHaveLength(0);
    }
  );
  it('does not register a timer when only Obsidian background sync is disabled', async () => {
    const ticks = captureTicks();
    vi.spyOn(Plugin.prototype, 'loadData').mockResolvedValue({
      vault: '',
      syncEnabled: true,
      autoSyncEnabled: false,
      origin: { remote: 'agentage', interval: 5, ignore: [] },
    });
    h = await bootReady();
    expect(h.plugin.settings.syncEnabled).toBe(true);
    expect(h.plugin.settings.autoSyncEnabled).toBe(false);
    expect(ticks).toHaveLength(0);
  });
  it('registers the configured 5-minute timer on startup', async () => {
    const ticks = captureTicks();
    const register = vi.spyOn(Plugin.prototype, 'registerInterval');
    h = await bootReady();
    expect(register).toHaveBeenCalledTimes(1);
    expect(ticks).toHaveLength(1);
    expect(ticks[0].intervalMs).toBe(5 * 60_000);
  });

  it('synchronizes changes on the next tick, not after each create/modify/delete event', async () => {
    const ticks = captureTicks();
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    const sync = vi.spyOn(h.plugin, 'syncNow').mockResolvedValue({
      ok: true,
      message: 'synthetic success',
    });
    h.vault.trigger('create', 'periodic.md', '# v1');
    h.vault.trigger('modify', 'periodic.md', '# v2');
    h.vault.trigger('delete', 'periodic.md');
    expect(sync).not.toHaveBeenCalled();
    ticks[0].fire();
    await Promise.resolve();
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('survives 500 timer ticks without concurrent Git and resumes after the active job', async () => {
    const ticks = captureTicks();
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const underlying = vi.fn(async () => {
      if (underlying.mock.calls.length === 1) await held;
      return { action: 'synced', committed: false, pushed: true, conflicted: [] };
    });
    const factory = vi
      .spyOn(h.plugin as unknown as { buildController: () => unknown }, 'buildController')
      .mockImplementation(() => ({ syncNow: underlying }));
    ticks[0].fire();
    for (let i = 0; i < 500; i++) ticks[0].fire();
    try {
      await vi.waitFor(() => expect(underlying).toHaveBeenCalledTimes(1));
      expect(factory).toHaveBeenCalledTimes(1);
    } finally {
      release();
    }
    await vi.waitFor(() =>
      expect((h!.plugin as unknown as { inFlightSync?: unknown }).inFlightSync).toBeUndefined()
    );
    ticks[0].fire();
    await vi.waitFor(() => expect(underlying).toHaveBeenCalledTimes(2));
  });
  it('interval zero is manual-only even at startup', async () => {
    captureTicks();
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    const cfg = (
      h.plugin as unknown as {
        settings: { syncEnabled: boolean; origin: { interval: number } };
      }
    ).settings;
    cfg.syncEnabled = true;
    cfg.origin.interval = 0;
    const sync = vi
      .spyOn(h.plugin, 'syncNow')
      .mockResolvedValue({ ok: true, message: 'synthetic' });
    (h.plugin as unknown as { autoSyncOnReady: (modal: boolean) => void }).autoSyncOnReady(false);
    await Promise.resolve();
    expect(sync).not.toHaveBeenCalled();
  });
  it('respects syncEnabled=false for startup automatic sync (not only the timer)', async () => {
    captureTicks();
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    const cfg = (h.plugin as unknown as { settings: { syncEnabled: boolean } }).settings;
    cfg.syncEnabled = false;
    const sync = vi
      .spyOn(h.plugin, 'syncNow')
      .mockResolvedValue({ ok: true, message: 'synthetic' });
    (h.plugin as unknown as { autoSyncOnReady: (modal: boolean) => void }).autoSyncOnReady(false);
    await Promise.resolve();
    expect(sync).not.toHaveBeenCalled();
  });
  it('does not sync without login or without a selected memory', async () => {
    const ticks = captureTicks();
    h = await bootReady();
    const sync = vi.spyOn(h.plugin, 'syncNow').mockResolvedValue({
      ok: true,
      message: 'synthetic success',
    });
    ticks[0].fire();
    expect(sync).not.toHaveBeenCalled();
    await signIn(h);
    ticks[0].fire();
    expect(sync).not.toHaveBeenCalled();
  });

  it('reconfigures the interval from 5 to 15 minutes without reloading the plugin', async () => {
    const ticks = captureTicks();
    h = await bootReady();
    const windowObj = globalThis.window as unknown as { clearInterval: (id: number) => void };
    const clear = vi.spyOn(windowObj, 'clearInterval');
    const plugin = h.plugin as unknown as {
      settings: { origin: { interval: number } };
      refreshAutoSyncSchedule: () => void;
    };
    expect(ticks[0].intervalMs).toBe(5 * 60_000);
    plugin.settings.origin.interval = 15;
    plugin.refreshAutoSyncSchedule();
    expect(clear).toHaveBeenCalledWith(1234);
    expect(ticks).toHaveLength(2);
    expect(ticks[1].intervalMs).toBe(15 * 60_000);
  });

  it('disables and re-enables the timer without restarting Obsidian', async () => {
    const ticks = captureTicks();
    h = await bootReady();
    const windowObj = globalThis.window as unknown as { clearInterval: (id: number) => void };
    const clear = vi.spyOn(windowObj, 'clearInterval');
    const plugin = h.plugin as unknown as {
      settings: { syncEnabled: boolean; origin: { interval: number } };
      refreshAutoSyncSchedule: () => void;
    };
    expect(ticks).toHaveLength(1);
    plugin.settings.syncEnabled = false;
    plugin.refreshAutoSyncSchedule();
    expect(clear).toHaveBeenCalledWith(1234);
    expect(ticks).toHaveLength(1);
    plugin.settings.syncEnabled = true;
    plugin.settings.origin.interval = 1;
    plugin.refreshAutoSyncSchedule();
    expect(ticks).toHaveLength(2);
    expect(ticks[1].intervalMs).toBe(60_000);
    plugin.settings.origin.interval = 0;
    plugin.refreshAutoSyncSchedule();
    expect(clear).toHaveBeenCalledTimes(2);
    expect(ticks).toHaveLength(2);
  });
  it('honors disabled background sync and interval zero at runtime', async () => {
    const ticks = captureTicks();
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    const sync = vi.spyOn(h.plugin, 'syncNow').mockResolvedValue({
      ok: true,
      message: 'synthetic success',
    });
    const cfg = (
      h.plugin as unknown as {
        settings: { syncEnabled: boolean; origin: { interval: number } };
      }
    ).settings;
    cfg.syncEnabled = false;
    ticks[0].fire();
    expect(sync).not.toHaveBeenCalled();
    cfg.syncEnabled = true;
    cfg.origin.interval = 0;
    ticks[0].fire();
    expect(sync).not.toHaveBeenCalled();
  });
});
