/**
 * Cloudflare Pages Advanced Mode, publicação transitória por CDN.
 * Não altera o interpretador Python/JS. Servir dist nativamente no Pages
 * continua sendo o destino recomendado depois de conectar o GitHub.
 * CDN fixado no commit verificado: nova versão requer atualizar esta referência.
 */
const CSP = [
  "default-src 'self'",
  // O sandbox educacional usa Function e Pyodide; não é possível usar
  // script-src sem unsafe-eval/unsafe-inline sem refatorar os executores.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "connect-src 'self' https://cdn.jsdelivr.net https://raw.githubusercontent.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Caminho inválido", { status: 400 });
    }
    if (path.includes("..") || path.includes("\\") || path.includes("//")) {
      return new Response("Caminho inválido", { status: 400 });
    }
    const isDocument = path === "/" || !/\.[a-z0-9]{1,16}$/i.test(path);
    const asset = isDocument ? "/index.html" : path;
    const upstream = "https://cdn.jsdelivr.net/gh/fagnerfaria/teste@6c3eb30fc522baf3dfdd7c4b37b44c776358552b/dist" + asset;

    let response;
    try {
      response = await fetch(upstream, {
        cf: { cacheTtl: isDocument ? 30 : 1800, cacheEverything: true },
      });
    } catch {
      return new Response("Serviço de arquivos temporariamente indisponível", { status: 502 });
    }
    if (!response.ok) {
      return new Response("Arquivo indisponível", { status: response.status === 404 ? 404 : 502 });
    }
    const headers = new Headers(response.headers);
    if (asset.endsWith(".js")) headers.set("Content-Type", "text/javascript; charset=utf-8");
    else if (asset.endsWith(".css")) headers.set("Content-Type", "text/css; charset=utf-8");
    else if (asset.endsWith(".html")) headers.set("Content-Type", "text/html; charset=utf-8");
    else if (asset.endsWith(".json")) headers.set("Content-Type", "application/json; charset=utf-8");
    else if (asset.endsWith(".webmanifest")) headers.set("Content-Type", "application/manifest+json; charset=utf-8");
    else if (asset.endsWith(".svg")) headers.set("Content-Type", "image/svg+xml");

    headers.set("Cache-Control", isDocument || asset === "/sw.js" || asset.endsWith(".webmanifest")
      ? "no-cache, must-revalidate"
      : "public, max-age=31536000, immutable");
    headers.delete("age");
    headers.delete("etag");
    headers.delete("set-cookie");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Content-Security-Policy", CSP);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    return new Response(response.body, { status: 200, headers });
  },
};
