import assert from "node:assert/strict";
import worker from "../cloudflare/_worker.js";
const originalFetch=globalThis.fetch;
const upstreamRequests=[];
globalThis.fetch=async(url)=>{
 upstreamRequests.push(String(url));
 const js=String(url).endsWith("/assets/index-TEST.js");
 return new Response(js?"export const ready = true;":"<h1>Teste</h1>",{
   status:200,headers:{"content-type":js?"text/javascript":"text/html; charset=utf-8",
     "cache-control":"public, max-age=604800",age:"3000"}
 });
};
try{
 const response=await worker.fetch(new Request("https://codigolab.pages.dev/lab"));
 assert.equal(response.status,200);
 assert.equal(response.headers.get("referrer-policy"),"strict-origin-when-cross-origin",
  "Página pública precisa proteger referências entre origens");
 assert.equal(response.headers.get("cache-control"),"no-cache, must-revalidate",
  "HTML não pode herdar cache de uma semana do CDN");
 assert.ok(response.headers.get("content-security-policy"),
  "A página precisa declarar política CSP");
 assert.equal(response.headers.get("age"),null,"Não copiar idade de cache do CDN");
 const js=await worker.fetch(new Request("https://codigolab.pages.dev/assets/index-TEST.js"));
 assert.equal(js.headers.get("content-type"),"text/javascript; charset=utf-8",
   "Um arquivo .js deve ser servido como JavaScript e nunca HTML");
 assert.equal(await js.text(),"export const ready = true;",
   "O Worker precisa retornar o conteúdo do arquivo original");
 assert.ok(upstreamRequests.at(-1)?.endsWith("/assets/index-TEST.js"),
   "A URL do script deve chegar ao CDN sem ser trocada por index.html");
 assert.match(upstreamRequests.at(-1)||"", /@[0-9a-f]{40}\/dist\/assets\/index-TEST\.js$/,
   "O CDN deve apontar para um commit imutável, não para branch com cache antigo");
 const manifest=await worker.fetch(new Request("https://codigolab.pages.dev/manifest.webmanifest"));
 assert.equal(manifest.headers.get("content-type"),"application/manifest+json; charset=utf-8",
   "Manifest PWA não pode voltar como HTML nem texto sem MIME correto");
 assert.ok(upstreamRequests.at(-1)?.endsWith("/manifest.webmanifest"),
   "Manifest deve ser buscado como arquivo, não index.html");
 const svg=await worker.fetch(new Request("https://codigolab.pages.dev/icon.svg"));
 assert.equal(svg.headers.get("content-type"),"image/svg+xml",
   "Ícone de instalação deve ter MIME de SVG");
 const sw=await worker.fetch(new Request("https://codigolab.pages.dev/sw.js"));
 assert.equal(sw.headers.get("cache-control"),"no-cache, must-revalidate",
   "Service worker precisa atualizar, não ficar congelado por um ano");
 console.log("Política HTTP, PWA e assets validada");
}finally{globalThis.fetch=originalFetch}
