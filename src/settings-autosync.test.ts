import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, buildVaultEntry } from './settings';

describe('Obsidian-only background sync does not change managed memory-core remote', () => {
  it('retains remote origin when the local scheduler is turned off', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      syncEnabled: true,
      autoSyncEnabled: false,
    };
    const entry = buildVaultEntry(s, 'synthetic-vault');
    expect(entry.origin).toEqual([{ remote: 'agentage', interval: 5 }]);
  });

  it('retains remote origin with manual-only interval zero', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      syncEnabled: true,
      origin: { ...DEFAULT_SETTINGS.origin, interval: 0 },
    };
    const entry = buildVaultEntry(s, 'synthetic-vault');
    expect(entry.origin).toEqual([{ remote: 'agentage' }]);
  });
});
