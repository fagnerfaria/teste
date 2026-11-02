import assert from "node:assert/strict";
import worker from "../cloudflare/_worker.js";
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response("<h1>Teste</h1>",{
  status:200,headers:{"content-type":"text/html; charset=utf-8",
    "cache-control":"public, max-age=604800",age:"3000"}
});
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
 console.log("Política HTTP do Worker validada");
}finally{globalThis.fetch=originalFetch}
