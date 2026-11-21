// Token persistence over a SecretStore (Obsidian secretStorage / localStorage), never
// vaults.json. Pure over the adapter → unit-tested with an in-memory fake.
import type { TokenSet } from './oauth';

export interface SecretStore {
  get(id: string): string | null;
  set(id: string, value: string): void;
}

export const ACCESS_TOKEN_SECRET = 'agentage-memory-access-token';
export const REFRESH_TOKEN_SECRET = 'agentage-memory-refresh-token';
export const EXPIRES_AT_SECRET = 'agentage-memory-token-expires-at';
export const CLIENT_ID_SECRET = 'agentage-memory-oauth-client-id';

function saveSecretTokens(store: SecretStore, t: TokenSet): void {
  store.set(ACCESS_TOKEN_SECRET, t.accessToken);
  store.set(REFRESH_TOKEN_SECRET, t.refreshToken);
  store.set(EXPIRES_AT_SECRET, String(t.expiresAt));
}

function loadSecretTokens(store: SecretStore): TokenSet | null {
  const accessToken = store.get(ACCESS_TOKEN_SECRET);
  const refreshToken = store.get(REFRESH_TOKEN_SECRET);
  if (!accessToken || !refreshToken) return null;
  const expiresAt = Number(store.get(EXPIRES_AT_SECRET));
  return { accessToken, refreshToken, expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0 };
}

function clearSecretTokens(store: SecretStore): void {
  // secretStorage/localStorage have no delete here → blank the values.
  store.set(ACCESS_TOKEN_SECRET, '');
  store.set(REFRESH_TOKEN_SECRET, '');
  store.set(EXPIRES_AT_SECRET, '');
  store.set(CLIENT_ID_SECRET, '');
}

function getClientId(store: SecretStore): string | null {
  const v = store.get(CLIENT_ID_SECRET);
  return v && v.length > 0 ? v : null;
}
function setClientId(store: SecretStore, id: string): void {
  store.set(CLIENT_ID_SECRET, id);
}

export interface AuthSession {
  clientId: string;
  tokens: TokenSet;
}

export interface AuthJsonWriter {
  write(state: AuthSession, expected?: AuthSession): Promise<void | false>;
  clear(expected?: AuthSession): Promise<void | false>;
}

export interface AuthStore {
  load(): TokenSet | null;
  getClientId(): string | null;
  setClientId(id: string): void;
  save(t: TokenSet, expected?: AuthSession): Promise<void | false>;
  clear(expected?: AuthSession): Promise<void | false>;
}

/** authJson is null on mobile / no-FS (secretStorage only). */
export function createAuthStore(secrets: SecretStore, authJson: AuthJsonWriter | null): AuthStore {
  function hasSession(expected: AuthSession): boolean {
    const tokens = loadSecretTokens(secrets);
    return (
      getClientId(secrets) === expected.clientId &&
      tokens?.accessToken === expected.tokens.accessToken &&
      tokens?.refreshToken === expected.tokens.refreshToken &&
      tokens?.expiresAt === expected.tokens.expiresAt
    );
  }

  return {
    load: () => loadSecretTokens(secrets),
    getClientId: () => getClientId(secrets),
    setClientId: (id) => setClientId(secrets, id),
    async save(t, expected) {
      if (expected && !hasSession(expected)) return false;
      const clientId = getClientId(secrets);
      if (authJson && clientId) {
        const state = { clientId, tokens: t };
        const result = expected
          ? await authJson.write(state, expected)
          : await authJson.write(state);
        if (expected && !hasSession(expected)) return false;
        if (result === false) {
          clearSecretTokens(secrets);
          return false;
        }
      }
      saveSecretTokens(secrets, t);
      return undefined;
    },
    async clear(expected) {
      if (expected && !hasSession(expected)) return false;
      const result = await authJson?.clear(expected);
      if (expected && !hasSession(expected)) return false;
      clearSecretTokens(secrets);
      return result;
    },
  };
}
