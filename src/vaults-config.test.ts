import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyVaultsConfig } from './vaults-config';

let dir: string;
const read = () => JSON.parse(fs.readFileSync(path.join(dir, 'vaults.json'), 'utf8'));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-cfg-'));
  process.env.AGENTAGE_CONFIG_DIR = dir;
});
afterEach(() => {
  delete process.env.AGENTAGE_CONFIG_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('applyVaultsConfig (R2 managed write, R3 preserve hand-edits + other vaults)', () => {
  it('creates vaults.json with the managed entry + default', async () => {
    const res = await applyVaultsConfig({
      configDirSetting: '~/.agentage',
      name: 'personal',
      makeDefault: true,
      path: '/vault',
      syncEnabled: true,
      remote: 'agentage',
      mcp: ['local'],
    });
    expect(res.ok).toBe(true);
    const c = read();
    expect(c.version).toBe(1);
    expect(c.default).toBe('personal');
    expect(c.vaults.personal).toMatchObject({
      path: '/vault',
      mcp: ['local'],
      origin: [{ remote: 'agentage' }],
    });
  });

  it('preserves other vaults and hand-edited keys (interval/ignore/extra) on rewrite', async () => {
    fs.writeFileSync(
      path.join(dir, 'vaults.json'),
      JSON.stringify({
        version: 1,
        default: 'work',
        vaults: {
          work: { path: '/work', mcp: ['local'] },
          personal: {
            path: '/old',
            origin: [{ remote: 'agentage', interval: 30, ignore: ['x'] }],
            mcp: ['local'],
            custom: 'keepme',
          },
        },
      })
    );
    await applyVaultsConfig({
      configDirSetting: '~/.agentage',
      name: 'personal',
      makeDefault: false,
      path: '/vault',
      syncEnabled: true,
      remote: 'agentage',
      mcp: ['local', 'remote'],
    });
    const c = read();
    expect(c.vaults.work).toEqual({ path: '/work', mcp: ['local'] }); // other vault untouched
    expect(c.default).toBe('work'); // not made default
    const p = c.vaults.personal;
    expect(p.path).toBe('/vault'); // managed
    expect(p.mcp).toEqual(['local', 'remote']); // managed
    expect(p.origin[0]).toMatchObject({ remote: 'agentage', interval: 30, ignore: ['x'] }); // hand-edits preserved
    expect(p.custom).toBe('keepme'); // extra key preserved
  });

  it('removes origin when sync is off and mcp when empty', async () => {
    await applyVaultsConfig({
      configDirSetting: '~/.agentage',
      name: 'personal',
      makeDefault: true,
      path: '/v',
      syncEnabled: true,
      remote: 'agentage',
      mcp: ['local'],
    });
    await applyVaultsConfig({
      configDirSetting: '~/.agentage',
      name: 'personal',
      makeDefault: false,
      path: '/v',
      syncEnabled: false,
      remote: 'agentage',
      mcp: [],
    });
    const p = read().vaults.personal;
    expect(p.origin).toBeUndefined();
    expect(p.mcp).toBeUndefined();
    expect(read().default).toBeUndefined(); // un-defaulted
  });
});

it('carries custom fields across a rename and protects an occupied destination', async () => {
  const file = path.join(dir, 'vaults.json');
  const vaults = { old: { custom: 'keep', origin: [{ remote: 'custom', interval: 9 }] }, work: {} };
  fs.writeFileSync(file, JSON.stringify({ version: 1, default: 'old', vaults }));
  const args = {
    configDirSetting: dir,
    previousName: 'old',
    name: 'work',
    makeDefault: false,
    path: '/new',
    syncEnabled: true,
    remote: '',
    mcp: [],
  };
  expect((await applyVaultsConfig(args)).ok).toBe(false);
  expect(read().vaults).toEqual(vaults);
  expect((await applyVaultsConfig({ ...args, name: 'new' })).ok).toBe(true);
  expect(read().vaults).toEqual({ new: { ...vaults.old, path: '/new' }, work: {} });
  expect(read().default).toBeUndefined();
});

it.each(['{', '[]', '{"vaults":[]}'])(
  'preserves invalid config %s for recovery',
  async (content) => {
    const file = path.join(dir, 'vaults.json');
    fs.writeFileSync(file, content);
    const result = await applyVaultsConfig({
      configDirSetting: dir,
      name: 'personal',
      makeDefault: false,
      path: '/vault',
      syncEnabled: false,
      remote: '',
      mcp: [],
    });
    expect(result.ok).toBe(false);
    expect(fs.readFileSync(file, 'utf8')).toBe(content);
  }
);
