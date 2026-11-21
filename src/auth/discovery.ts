// Pure OAuth metadata discovery. fetch injected (mock in tests). The AS's well-known
// endpoints already carry the /api/auth/mcp/ prefix — do not re-prefix.
import type { OAuthEndpoints } from './oauth';

export type GetJson = (url: string) => Promise<{ status: number; json: unknown }>;

function endpoint(value: unknown, authority: URL, name: string): string {
  if (typeof value !== 'string' || !value) throw new Error('discovery: missing endpoints');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`discovery: invalid ${name} endpoint`);
  }
  if (
    url.protocol !== authority.protocol ||
    url.origin !== authority.origin ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error(`discovery: invalid ${name} endpoint`);
  }
  return url.href;
}

export async function discoverEndpoints(
  authOrigin: string,
  getJson: GetJson
): Promise<OAuthEndpoints> {
  const authority = new URL(authOrigin);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(authority.hostname);
  if (
    (authority.protocol !== 'https:' && !(authority.protocol === 'http:' && loopback)) ||
    authority.username ||
    authority.password ||
    authority.pathname !== '/' ||
    authority.search ||
    authority.hash
  ) {
    throw new Error('discovery: invalid authorization server origin');
  }
  const origin = authority.origin;
  const res = await getJson(`${origin}/.well-known/oauth-authorization-server`);
  if (res.status < 200 || res.status >= 300) throw new Error(`discovery: HTTP ${res.status}`);
  const d = (res.json ?? {}) as Record<string, unknown>;
  if (d.issuer !== undefined && d.issuer !== origin) throw new Error('discovery: issuer mismatch');
  const registrationEndpoint = endpoint(d.registration_endpoint, authority, 'registration');
  const authorizationEndpoint = endpoint(d.authorization_endpoint, authority, 'authorization');
  const tokenEndpoint = endpoint(d.token_endpoint, authority, 'token');
  const revocationEndpoint =
    d.revocation_endpoint === undefined
      ? undefined
      : endpoint(d.revocation_endpoint, authority, 'revocation');
  return { registrationEndpoint, authorizationEndpoint, tokenEndpoint, revocationEndpoint };
}
