// Desktop auth.json shared with the Agentage CLI. Node imports stay lazy for mobile.
import type { AuthJsonWriter, AuthSession } from './token-store';
import { requirePrivateWindowsAuth } from './windows-auth-acl';

export interface AuthJsonState {
  siteFqdn: string;
  clientId: string;
  tokens: { accessToken: string; refreshToken?: string; expiresAt?: number };
  user?: { id: string; email: string };
}

async function authPath(setting: string): Promise<string> {
  const { homedir } = await import('node:os');
  const { join } = await import('node:path');
  const env = typeof process !== 'undefined' ? process.env?.AGENTAGE_CONFIG_DIR : undefined;
  const dir = env || setting || '~/.agentage';
  return join(dir === '~' || dir.startsWith('~/') ? homedir() + dir.slice(1) : dir, 'auth.json');
}

export async function readAuthJsonState(setting: string): Promise<AuthJsonState | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    const file = await authPath(setting);
    await requirePrivateWindowsAuth(dirname(file), false);
    const state = JSON.parse(await readFile(file, 'utf8')) as AuthJsonState;
    return state?.tokens?.accessToken ? state : null;
  } catch {
    return null;
  }
}

async function mutateAuth(
  setting: string,
  update: (current: AuthJsonState | null) => object | null
): Promise<void | false> {
  const fs = await import('node:fs/promises');
  const { dirname, join } = await import('node:path');
  const file = await authPath(setting);
  const dir = dirname(file);
  if (process.platform === 'win32') await requirePrivateWindowsAuth(dir, true);
  else await fs.mkdir(dir, { recursive: true, mode: 0o700 });

  const lock = file + '.lock';
  const temporaryDir = await fs.mkdtemp(join(dir, '.auth-'));
  const lockSource = join(temporaryDir, 'lock');
  const tempFile = join(temporaryDir, 'auth.json');
  const deadline = performance.now() + 15_000;
  let stamp = '';
  let acquired = false;
  try {
    while (!acquired) {
      // Match the CLI's PID/timestamp format. Publish the complete holder record atomically.
      stamp = process.pid + ' ' + Date.now();
      await fs.writeFile(lockSource, stamp, { mode: 0o600 });
      try {
        try {
          await fs.link(lockSource, lock);
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (!['ENOSYS', 'ENOTSUP', 'EOPNOTSUPP', 'EPERM', 'EXDEV'].includes(code ?? ''))
            throw error;
          await fs.writeFile(lock, stamp, { mode: 0o600, flag: 'wx' });
        }
        acquired = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        // The CLI can recover abandoned locks. The plugin never deletes another holder's lock.
        if (performance.now() >= deadline) throw new Error('Agentage credentials are busy.');
        await new Promise<void>((resolve) => setTimeout(resolve, 30));
      }
    }

    let current: AuthJsonState | null = null;
    try {
      current = JSON.parse(await fs.readFile(file, 'utf8')) as AuthJsonState | null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const next = update(current);
    if (!next) return false;
    await fs.writeFile(tempFile, JSON.stringify(next, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await fs.rename(tempFile, file);
  } finally {
    try {
      if (acquired && (await fs.readFile(lock, 'utf8')) === stamp) await fs.unlink(lock);
    } finally {
      await fs.rm(temporaryDir, { recursive: true, force: true });
    }
  }
}

function matchesSession(
  current: AuthJsonState | null,
  siteFqdn: string,
  expected: AuthSession
): boolean {
  return (
    current?.siteFqdn === siteFqdn &&
    current.clientId === expected.clientId &&
    current.tokens?.accessToken === expected.tokens.accessToken &&
    current.tokens?.refreshToken === expected.tokens.refreshToken &&
    (current.tokens?.expiresAt ?? 0) === expected.tokens.expiresAt
  );
}

/** AGENTAGE_CONFIG_DIR takes precedence over the setting, as it does in the CLI. */
export function createAuthJsonWriter(opts: {
  configDirSetting: string;
  siteFqdn: string;
}): AuthJsonWriter {
  const { configDirSetting, siteFqdn } = opts;
  return {
    write(state, expected) {
      return mutateAuth(configDirSetting, (current) => {
        if (expected && !matchesSession(current, siteFqdn, expected)) return null;
        return expected ? { ...current, ...state } : { siteFqdn, ...state };
      });
    },
    clear(expected) {
      return mutateAuth(configDirSetting, (current) => {
        if (expected && !matchesSession(current, siteFqdn, expected)) return null;
        return { siteFqdn };
      });
    },
  };
}
