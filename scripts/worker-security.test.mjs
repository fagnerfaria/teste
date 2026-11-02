import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../cloudflare/_worker.js';
const sql = new DatabaseSync(':memory:');
sql.exec('CREATE TABLE progress (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT, updated_at INTEGER NOT NULL)');
const PROGRESS = { prepare(text) { return { bind(...args) { return {
 async first() { return sql.prepare(text).get(...args)||null; },
 async run() { const r=sql.prepare(text).run(...args); return {meta:{changes:Number(r.changes)}}; }
}; } }; } };
const seen=[];
const env={PROGRESS, ASSETS:{async fetch(req){seen.push(new URL(req.url).pathname);return new Response(new URL(req.url).pathname.endsWith('.js')?'export const ready=true':'<h1>Academia</h1>',{headers:{'content-type':new URL(req.url).pathname.endsWith('.js')?'text/javascript':'text/html'}})}}};
sql.exec('CREATE TABLE progress_limits (id TEXT PRIMARY KEY,window INTEGER NOT NULL,count INTEGER NOT NULL)');
const token='a'.repeat(64), other='b'.repeat(64);
const req=(method='GET',body,auth=token,path='/api/progress')=>new Request('https://codigolab.pages.dev'+path,{method,headers:{...(auth?{authorization:'Bearer '+auth}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const payload=JSON.stringify({v:1,iv:'A'.repeat(16),ciphertext:'B'.repeat(32)});
assert.equal((await worker.fetch(req('GET',undefined,null),env)).status,401,'Sincronização precisa autenticação');
assert.equal((await worker.fetch(req('PUT',{revision:0,payload}),env)).status,200,'Primeira publicação deve funcionar');
assert.deepEqual(await (await worker.fetch(req(),env)).json(),{revision:1,payload});
assert.equal((await worker.fetch(req('GET',undefined,other),env)).status,404,'Chaves não podem ler outros dados');
assert.equal((await worker.fetch(req('PUT',{revision:0,payload}),env)).status,409,'Não pode perder atualização por concorrência');
assert.equal((await worker.fetch(req('PUT',{revision:1,payload:'texto puro'}),env)).status,400,'Somente envelope cifrado válido');
assert.equal((await worker.fetch(req('PUT',{revision:1,payload}),env)).status,200);
assert.equal((await worker.fetch(req('DELETE',{revision:1}),env)).status,409);
assert.equal((await worker.fetch(req('DELETE',{revision:2}),env)).status,200);
assert.deepEqual(await (await worker.fetch(req(),env)).json(),{revision:3,payload:null});
assert.equal((await worker.fetch(req('PUT',{revision:0,payload}),env)).status,409,'Tombstone não pode reiniciar revisão');
assert.equal((await worker.fetch(req('PUT',{revision:3,payload}),env)).status,200);
assert.equal((await worker.fetch(req('PUT',{revision:2,payload}),env)).status,409,'Cliente anterior à exclusão não pode sobrescrever nova cópia');
assert.equal((await worker.fetch(req('GET',undefined,null,'/api/progress/status'),{})).status,503);
const html=await worker.fetch(new Request('https://codigolab.pages.dev/workspace'),env);
assert.equal(html.status,200);assert.equal(seen.at(-1),'/index.html','SPA precisa arquivos nativos');
assert.match(html.headers.get('content-security-policy'),/wasm-unsafe-eval/);
assert.match(html.headers.get('cache-control'),/no-cache/);
const asset=await worker.fetch(new Request('https://codigolab.pages.dev/assets/index-test.js'),env);
assert.match(await asset.text(),/export const/);assert.equal(seen.at(-1),'/assets/index-test.js');
assert.equal((await worker.fetch(new Request('https://codigolab.pages.dev/api/absent'),env)).status,404,'API desconhecida não pode virar HTML');
assert.equal((await worker.fetch(new Request('https://codigolab.pages.dev/%ZZ'),env)).status,400);
assert.equal((await worker.fetch(req(),env)).headers.get('cache-control'),'no-store');
console.log('Worker: assets nativos, autenticação, isolamento, CAS, exclusão e CSP aprovados');
const unsafeEnvelope=JSON.stringify({v:1,iv:'A'.repeat(16),ciphertext:'B'.repeat(32),extra:'💻'});
assert.equal((await worker.fetch(req('PUT',{revision:4,payload:unsafeEnvelope}),env)).status,400,'Envelope não admite campos extras ou Unicode fora da cifra');
const cross=new Request(req(),{headers:{authorization:'Bearer '+token,origin:'https://external.invalid'}});
assert.equal((await worker.fetch(cross,env)).status,403);
for(let index=0;index<6;index++){
 const input=req('PUT',{revision:0,payload},index.toString(16).padStart(64,'0'));
 input.headers.set('CF-Connecting-IP','203.0.113.20');
 assert.equal((await worker.fetch(input,env)).status,index<5?200:429,'Limitar criação de novas cópias por IP, sem interferir em atualizações');
}
console.log('Abuso: origem externa, envelope extra e limite de novas cópias aprovados');
