import {
  VAULTS_SCHEMA_URL,
  type McpScope,
  type VaultEntryPreview,
  type VaultsConfigPreview,
} from './settings';

// Reads/writes the real memory-core config at ~/.agentage/vaults.json (desktop only).
// The plugin owns only the keys the UI controls (path, origin presence + remote, mcp,
// default) and PRESERVES everything else in the entry — so hand-edits in the file
// (interval, ignore, a custom remote URL, extra keys) survive plugin writes.
// Other vaults (CLI-managed) are untouched. Writes are atomic (tmp + rename).

export interface ApplyArgs {
  /** configDir setting, e.g. '~/.agentage' (AGENTAGE_CONFIG_DIR wins if set). */
  configDirSetting: string;
  name: string;
  previousName?: string;
  makeDefault: boolean;
  /** working-copy path for this vault. */
  path: string;
  /** whether an origin (sync) entry should exist. */
  syncEnabled: boolean;
  /** desired remote ('' = keep whatever the file has, else default to "agentage"). */
  remote: string;
  mcp: McpScope[];
}

export interface ApplyResult {
  ok: boolean;
  path: string;
  error?: string;
}

const expandHome = (p: string, home: string): string =>
  p === '~' || p.startsWith('~/') ? home + p.slice(1) : p;

const envConfigDir = (): string | undefined =>
  typeof process !== 'undefined' ? process.env?.AGENTAGE_CONFIG_DIR : undefined;

export const resolveConfigFile = (
  configDirSetting: string,
  home: string,
  join: (...p: string[]) => string
): string =>
  join(expandHome(envConfigDir() || configDirSetting || '~/.agentage', home), 'vaults.json');

/** Upsert this vault into ~/.agentage/vaults.json, preserving unmanaged keys + other vaults. */
export const applyVaultsConfig = async (args: ApplyArgs): Promise<ApplyResult> => {
  const os = await import('node:os');
  const path = await import('node:path');
  const fs = await import('node:fs/promises');
  const file = resolveConfigFile(args.configDirSetting, os.homedir(), path.join);
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });

    let config: VaultsConfigPreview = { $schema: VAULTS_SCHEMA_URL, version: 1, vaults: {} };
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Invalid vault configuration.');
      const existing = parsed as Partial<VaultsConfigPreview>;
      if (
        existing.vaults !== undefined &&
        (!existing.vaults || typeof existing.vaults !== 'object' || Array.isArray(existing.vaults))
      )
        throw new Error('Invalid vault entries.');
      config = { ...config, ...existing, vaults: existing.vaults ?? {} };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const previous = args.previousName;
    const renaming = previous && previous !== args.name && Object.hasOwn(config.vaults, previous);
    if (renaming && Object.hasOwn(config.vaults, args.name)) {
      throw new Error('A vault with the requested name already exists.');
    }
    const sourceName = renaming ? previous : args.name;
    const cur = Object.hasOwn(config.vaults, sourceName) ? config.vaults[sourceName] : {};
    const next: VaultEntryPreview = { ...cur, path: args.path };
    if (args.mcp.length) next.mcp = [...args.mcp];
    else delete next.mcp;
    if (args.syncEnabled) {
      const prev: { remote?: string; interval?: number; ignore?: string[] } =
        Array.isArray(cur.origin) && cur.origin[0] ? cur.origin[0] : {};
      next.origin = [{ ...prev, remote: args.remote.trim() || prev.remote || 'agentage' }];
    } else {
      delete next.origin;
    }

    if (renaming) delete config.vaults[previous];
    config.vaults = { ...config.vaults, [args.name]: next };
    if (args.makeDefault) config.default = args.name;
    else if (config.default === sourceName || config.default === args.name) delete config.default;

    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(config, null, 2) + '\n', 'utf8');
    await fs.rename(tmp, file);
    return { ok: true, path: file };
  } catch (e) {
    return { ok: false, path: file, error: (e as Error).message };
  }
};
