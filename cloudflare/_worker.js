/**
 * CódigoLab — Cloudflare Pages Advanced Mode
 * Implanta-se como `_worker.js`. Solução provisória sem integração GitHub;
 * lê arquivos estáticos já compilados no branch público codigolab-dist.
 * Recomendação futura: configurar integração GitHub oficial e servir
 * `dist/` diretamente no Pages, eliminando este proxy.
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    const asset = path === "/" || !/\.[a-z0-9]{1,8}$/i.test(path) ? "/index.html" : path;
    const upstream = "https://cdn.jsdelivr.net/gh/fagnerfaria/teste@codigolab-dist/dist" + asset;
    const response = await fetch(upstream, { cf: { cacheTtl: 1800, cacheEverything: true } });
    if (!response.ok) {
      return new Response("Arquivo indisponível (" + response.status + ")", { status: 502 });
    }
    const headers = new Headers(response.headers);
    if (asset.endsWith(".js")) headers.set("Content-Type", "text/javascript; charset=utf-8");
    else if (asset.endsWith(".css")) headers.set("Content-Type", "text/css; charset=utf-8");
    else if (asset.endsWith(".html")) headers.set("Content-Type", "text/html; charset=utf-8");
    else if (asset.endsWith(".json")) headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.delete("set-cookie");
    return new Response(response.body, { status: 200, headers });
  },
};
