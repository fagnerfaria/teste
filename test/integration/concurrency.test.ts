import { afterEach, describe, expect, it, vi } from 'vitest';
import { obsidianMockFactory } from '../fakes/obsidian';
vi.mock('obsidian', () => obsidianMockFactory());

import { bootReady, signIn, MEMORY, type Handles } from './_helpers';

describe('single-flight at Agentage plugin boundary', () => {
  let h: Handles | undefined;
  afterEach(async () => {
    vi.restoreAllMocks();
    if (h) await h.teardown();
    h = undefined;
  });

  it('preview runs after an in-flight sync instead of touching Git concurrently', async () => {
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    let release!: () => void;
    const held = new Promise<void>((done) => {release=done;});
    const run = vi.fn(async () => {
      await held;
      return {action:'synced',committed:false,pushed:true,conflicted:[]};
    });
    const preview = vi.fn(async()=>({incoming:0,outgoing:0,firstSync:false}));
    vi.spyOn(h.plugin as unknown as {buildController:()=>unknown},'buildController')
      .mockImplementation(()=>({syncNow:run,preview}));
    const active = h.plugin.syncNow();
    await vi.waitFor(()=>expect(run).toHaveBeenCalledTimes(1));
    const during = (h.plugin as unknown as {
      previewSync:()=>Promise<{incoming:number;outgoing:number;firstSync:boolean}>
    }).previewSync();
    try{
      await new Promise((resolve)=>setTimeout(resolve,40));
      expect(preview).not.toHaveBeenCalled();
    }finally{release();await Promise.allSettled([active,during]);}
    expect(preview).toHaveBeenCalledTimes(1);
  });

  it('sync waits for an in-flight Git preview', async () => {
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    let release!: () => void;
    const held = new Promise<void>((done) => {release=done;});
    const preview = vi.fn(async()=>{await held;return {incoming:0,outgoing:0,firstSync:false};});
    const run = vi.fn(async()=>({action:'synced',committed:false,pushed:true,conflicted:[]}));
    vi.spyOn(h.plugin as unknown as {buildController:()=>unknown},'buildController')
      .mockImplementation(()=>({syncNow:run,preview}));
    const active = (h.plugin as unknown as {
      previewSync:()=>Promise<{incoming:number;outgoing:number;firstSync:boolean}>
    }).previewSync();
    await vi.waitFor(()=>expect(preview).toHaveBeenCalledTimes(1));
    const during = h.plugin.syncNow();
    try{
      await new Promise((resolve)=>setTimeout(resolve,40));
      expect(run).not.toHaveBeenCalled();
    }finally{release();await Promise.allSettled([active,during]);}
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('serializes overlapping manual/periodic sync calls before accessing Git', async () => {
    h = await bootReady();
    await signIn(h);
    await h.plugin.selectVault(MEMORY);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release=resolve; });
    const inner = vi.fn(async () => {
      await gate;
      return { action: 'synced', committed: false, pushed: true, conflicted: [] };
    });
    const plugin = h.plugin as unknown as { buildController: () => unknown };
    const factory = vi.spyOn(plugin, 'buildController').mockImplementation(
      () => ({ syncNow: inner })
    );
    const first = h.plugin.syncNow();
    const second = h.plugin.syncNow();
    try {
      await vi.waitFor(() => expect(inner).toHaveBeenCalled());
      expect(factory).toHaveBeenCalledTimes(1);
      expect(inner).toHaveBeenCalledTimes(1);
    } finally {
      release();
      await Promise.allSettled([first, second]);
    }
  });
});