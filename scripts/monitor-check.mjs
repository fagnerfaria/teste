import assert from'node:assert/strict';import{checkSite}from'../cloudflare/monitor.js';
const good=async(url)=>url.endsWith('.wasm')?new Response(null,{headers:{'content-type':'application/wasm'}}):url.endsWith('health.json')?Response.json({service:'codigolab'}):url.endsWith('/status')?Response.json({available:true}):new Response('<div id="root"></div>');
assert.equal((await checkSite(good)).status,'ok');
const bad=await checkSite(async url=>url.endsWith('sql-wasm.wasm')?new Response('error',{status:502}):good(url));
assert.equal(bad.status,'degraded');assert.equal(bad.results.find(p=>p.name==='sqlite').ok,false);
console.log('Monitor distingue saúde completa de falha parcial dos motores.');
