import { validateBackup, type AppData } from "./store";
const LIMIT = 4 * 1024 * 1024;
const encoder = new TextEncoder();
const aad = encoder.encode("codigolab-progress:v1");
function parts(code: string) {
  const match = /^([a-f0-9]{64})\.([a-f0-9]{64})$/i.exec(code.trim());
  if (!match) throw new Error("Código inválido. Use o código completo criado no outro aparelho.");
  return { token: match[1]!.toLowerCase(), secret: Uint8Array.from(match[2]!.match(/../g)!, byte => parseInt(byte, 16)) };
}
const hex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
function base64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
const unbase64 = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
export function createSyncCode() {
  return `${hex(crypto.getRandomValues(new Uint8Array(32)))}.${hex(crypto.getRandomValues(new Uint8Array(32)))}`;
}
export async function encryptProgress(data: AppData, code: string) {
  if (!validateBackup(data)) throw new Error("O progresso local não passou na validação.");
  const plaintext = encoder.encode(JSON.stringify(data));
  if (plaintext.byteLength > LIMIT / 2) throw new Error("O progresso excede 2 MiB. Exporte um backup e reduza rascunhos antes de sincronizar.");
  const key = await crypto.subtle.importKey("raw", parts(code).secret, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, plaintext);
  return JSON.stringify({ v: 1, iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)) });
}
export async function decryptProgress(payload: string, code: string): Promise<AppData> {
  if (payload.length > LIMIT) throw new Error("Arquivo remoto acima do limite permitido.");
  try {
    const envelope = JSON.parse(payload);
    if (envelope.v !== 1 || typeof envelope.iv !== "string" || typeof envelope.ciphertext !== "string") throw new Error();
    const iv = unbase64(envelope.iv);
    if (iv.length !== 12) throw new Error();
    const key = await crypto.subtle.importKey("raw", parts(code).secret, "AES-GCM", false, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, key, unbase64(envelope.ciphertext));
    const data: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!validateBackup(data)) throw new Error();
    return data;
  } catch { throw new Error("Não foi possível abrir o progresso remoto. Confira o código; o conteúdo também pode estar corrompido."); }
}
export class SyncConflictError extends Error {
  constructor() { super("Outro aparelho publicou uma versão mais recente. Baixe e confira essa versão antes de publicar novamente."); this.name = "SyncConflictError"; }
}
type Request = typeof fetch;
const optionsFor = (code: string): RequestInit => ({ headers: { Authorization: `Bearer ${parts(code).token}` }, credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(15000) });
export async function syncAvailable(request: Request = fetch) {
  try { const response = await request("/api/progress/status", { cache: "no-store", signal: AbortSignal.timeout(5000) }); return response.ok && (await response.json()).available === true; }
  catch { return false; }
}
export async function pullProgress(code: string, request: Request = fetch): Promise<{ revision: number; data: AppData | null }> {
  const response = await request("/api/progress", optionsFor(code));
  if (response.status === 404) return { revision: 0, data: null };
  if (!response.ok) throw new Error("O serviço de sincronização não está disponível. Seu progresso local foi preservado.");
  const body = await response.json();
  if (!Number.isSafeInteger(body.revision) || body.revision < 1 || (body.payload !== null && typeof body.payload !== "string")) throw new Error("Resposta de sincronização inválida.");
  return { revision: body.revision, data: body.payload === null ? null : await decryptProgress(body.payload, code) };
}
export async function pushProgress(code: string, data: AppData, revision: number, request: Request = fetch) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Versão de sincronização inválida.");
  const payload = await encryptProgress(data, code);
  const response = await request("/api/progress", { ...optionsFor(code), method: "PUT", headers: { Authorization: `Bearer ${parts(code).token}`, "Content-Type": "application/json" }, body: JSON.stringify({ revision, payload }) });
  if (response.status === 409) throw new SyncConflictError();
  if (!response.ok) throw new Error("Não foi possível publicar o progresso. O backup local foi preservado.");
  const body = await response.json();
  if (!Number.isSafeInteger(body.revision) || body.revision <= revision) throw new Error("O servidor não confirmou uma nova versão válida.");
  return body.revision as number;
}
export async function deleteRemoteProgress(code: string, revision: number, request: Request = fetch) {
  const response = await request("/api/progress", { ...optionsFor(code), method: "DELETE", headers: { Authorization: `Bearer ${parts(code).token}`, "Content-Type": "application/json" }, body: JSON.stringify({ revision }) });
  if (response.status === 409) throw new SyncConflictError();
  if (!response.ok) throw new Error("Não foi possível apagar a cópia remota.");
  const body = await response.json();
  if (!Number.isSafeInteger(body.revision) || body.revision <= revision) throw new Error("O servidor não confirmou a exclusão na nova versão.");
  return body.revision as number;
}
