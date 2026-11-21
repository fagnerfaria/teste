import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAuthJsonWriter, readAuthJsonState } from './auth-json';

let root: string;
let dir: string;
const read = () => JSON.parse(fs.readFileSync(path.join(dir, 'auth.json'), 'utf8'));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentage-auth-'));
  dir = path.join(root, 'config');
  process.env.AGENTAGE_CONFIG_DIR = dir;
});
afterEach(() => {
  delete process.env.AGENTAGE_CONFIG_DIR;
  fs.rmSync(root, { recursive: true, force: true });
});

describe('auth-json (desktop, never vaults.json)', () => {
  it('writes auth.json (not vaults.json) atomically at mode 0600 with the CLI shape', async () => {
    const w = createAuthJsonWriter({ configDirSetting: '~/.agentage', siteFqdn: 'agentage.io' });
    await w.write({
      clientId: 'cid',
      tokens: { accessToken: 'AT', refreshToken: 'RT', expiresAt: 9 },
    });
    expect(fs.existsSync(path.join(dir, 'vaults.json'))).toBe(false);
    const c = read();
    expect(c).toMatchObject({
      siteFqdn: 'agentage.io',
      clientId: 'cid',
      tokens: { accessToken: 'AT', refreshToken: 'RT', expiresAt: 9 },
    });
    if (process.platform !== 'win32')
      expect(fs.statSync(path.join(dir, 'auth.json')).mode & 0o777).toBe(0o600); // Windows permissions use ACLs
    expect(fs.existsSync(path.join(dir, 'auth.json.tmp'))).toBe(false); // atomic, no leftover
  });

  it('clear leaves only the siteFqdn', async () => {
    const w = createAuthJsonWriter({ configDirSetting: '~/.agentage', siteFqdn: 'agentage.io' });
    await w.write({
      clientId: 'cid',
      tokens: { accessToken: 'AT', refreshToken: 'RT', expiresAt: 9 },
    });
    await w.clear();
    expect(read()).toEqual({ siteFqdn: 'agentage.io' });
  });

  it('readAuthJsonState round-trips what the writer wrote (desktop hydration source)', async () => {
    const w = createAuthJsonWriter({ configDirSetting: '~/.agentage', siteFqdn: 'agentage.io' });
    await w.write({
      clientId: 'cid',
      tokens: { accessToken: 'AT', refreshToken: 'RT', expiresAt: 9 },
    });
    const state = await readAuthJsonState('~/.agentage');
    expect(state).toMatchObject({
      clientId: 'cid',
      tokens: { accessToken: 'AT', refreshToken: 'RT', expiresAt: 9 },
    });
  });

  it('readAuthJsonState returns null when the file is absent or tokenless (no false sign-in)', async () => {
    expect(await readAuthJsonState('~/.agentage')).toBeNull(); // nothing written yet
    const w = createAuthJsonWriter({ configDirSetting: '~/.agentage', siteFqdn: 'agentage.io' });
    await w.write({
      clientId: 'cid',
      tokens: { accessToken: 'AT', refreshToken: 'RT', expiresAt: 9 },
    });
    await w.clear(); // leaves only siteFqdn
    expect(await readAuthJsonState('~/.agentage')).toBeNull();
  });

  it('preserves CLI metadata and rejects a stale renewal after rotation', async () => {
    const w = createAuthJsonWriter({ configDirSetting: dir, siteFqdn: 'agentage.io' });
    const original = {
      clientId: 'cid',
      tokens: { accessToken: 'old', refreshToken: 'old-refresh', expiresAt: 1 },
    };
    const next = {
      ...original,
      tokens: { accessToken: 'new', refreshToken: 'new-refresh', expiresAt: 2 },
    };
    await w.write(original);
    fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ ...read(), kind: 'oauth' }));
    await w.write(next, original);
    expect(read()).toMatchObject({ ...next, kind: 'oauth', siteFqdn: 'agentage.io' });
    expect(await w.write(original, original)).toBe(false);
    expect(await w.clear(original)).toBe(false);
    expect(read().tokens).toEqual(next.tokens);
  });

  it('waits for the CLI lock and rejects renewal after the CLI signs out', async () => {
    const w = createAuthJsonWriter({ configDirSetting: dir, siteFqdn: 'agentage.io' });
    const original = {
      clientId: 'cid',
      tokens: { accessToken: 'old', refreshToken: 'old-refresh', expiresAt: 1 },
    };
    await w.write(original);
    const lock = path.join(dir, 'auth.json.lock');
    const stamp = process.pid + ' ' + Date.now();
    fs.writeFileSync(lock, stamp, { flag: 'wx' });
    const renewal = w.write(original, original);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      expect(fs.readFileSync(lock, 'utf8')).toBe(stamp);
      fs.unlinkSync(path.join(dir, 'auth.json'));
    } finally {
      fs.unlinkSync(lock);
    }
    expect(await renewal).toBe(false);
    expect(await readAuthJsonState(dir)).toBeNull();
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
