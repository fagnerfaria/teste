/** CódigoLab: assets nativos do Pages e sincronização cifrada opcional em D1. */
const CSP = [
 "default-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net",
 "worker-src 'self' blob:", "connect-src 'self' https://cdn.jsdelivr.net https://raw.githubusercontent.com",
 "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com",
 "img-src 'self' data: blob:", "frame-src 'self' blob:", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
].join('; ');
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const validPayload=payload=>{
 if(typeof payload!=='string'||payload.length>4194304)return false;
 try{const v=JSON.parse(payload);return v&&Object.keys(v).length===3&&Object.keys(v).every(k=>['v','iv','ciphertext'].includes(k))&&v.v===1&&typeof v.iv==='string'&&/^[A-Za-z0-9+/]{16}$/.test(v.iv)&&typeof v.ciphertext==='string'&&v.ciphertext.length>=24&&/^[A-Za-z0-9+/]+={0,2}$/.test(v.ciphertext)&&v.ciphertext.length%4===0;}catch{return false;}
};
async function progress(request,env,url){
 if(url.pathname==='/api/progress/status')return json({available:!!env.PROGRESS},env.PROGRESS?200:503);
 if(!env.PROGRESS)return json({error:'Sincronização indisponível.'},503);
 if(!['GET','PUT','DELETE'].includes(request.method))return json({error:'Método não permitido.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Origem não permitida.'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)return json({error:'Código de sincronização necessário.'},401);
 const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 const db=env.PROGRESS.withSession?env.PROGRESS.withSession('first-primary'):env.PROGRESS;
 if(request.method==='GET'){
  const row=await db.prepare('SELECT revision,payload FROM progress WHERE id = ?').bind(id).first();
  return row?json({revision:row.revision,payload:row.payload}):json({error:'Nenhum progresso publicado.'},404);
 }
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'JSON necessário.'},415);
 if(Number(request.headers.get('content-length'))>5242880)return json({error:'Backup excede o limite.'},413);
 let input;try{const text=await request.text();if(text.length>5242880)return json({error:'Backup excede o limite.'},413);input=JSON.parse(text);}catch{return json({error:'JSON inválido.'},400);}
 if(!Number.isSafeInteger(input?.revision)||input.revision<0)return json({error:'Revisão inválida.'},400);
 if(request.method==='DELETE'){
  const result=await db.prepare('UPDATE progress SET payload = NULL, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(Date.now(),id,input.revision).run();
  return result.meta.changes?json({revision:input.revision+1}):json({error:'Conflito: baixe a versão atual antes de excluir.'},409);
 }
 if(!validPayload(input.payload))return json({error:'Envelope cifrado inválido ou maior que 4 MiB.'},400);
 const revision=input.revision+1;let result;
 const capacity=419430400;
 if(input.revision===0){
  const existing=await db.prepare('SELECT revision FROM progress WHERE id = ?').bind(id).first();
  if(existing)return json({error:'Conflito: baixe a versão atual antes de publicar.'},409);
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  const rateId=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('codigolab:rate:v1:'+ip))),b=>b.toString(16).padStart(2,'0')).join('');
  const window=Math.floor(Date.now()/3600000);
  const rate=await db.prepare('INSERT INTO progress_limits (id,window,count) VALUES (?,?,1) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window RETURNING count').bind(rateId,window).first();
  if(rate.count>5)return json({error:'Limite de criação atingido. Tente novamente mais tarde.'},429);
  await db.prepare('DELETE FROM progress_limits WHERE window < ?').bind(window-24).run();
 }

 if(input.revision===0){
  result=await db.prepare('INSERT INTO progress (id,revision,payload,updated_at) SELECT ?,1,?,? WHERE (SELECT COUNT(*) FROM progress) < 10000 AND COALESCE((SELECT SUM(length(CAST(payload AS BLOB))) FROM progress),0)+length(CAST(? AS BLOB)) <= ? ON CONFLICT(id) DO NOTHING').bind(id,input.payload,Date.now(),input.payload,capacity).run();
 }else{
  result=await db.prepare('UPDATE progress SET revision = ?, payload = ?, updated_at = ? WHERE id = ? AND revision = ? AND COALESCE((SELECT SUM(length(CAST(payload AS BLOB))) FROM progress),0)-COALESCE(length(CAST(payload AS BLOB)),0)+length(CAST(? AS BLOB)) <= ?').bind(revision,input.payload,Date.now(),id,input.revision,input.payload,capacity).run();
 }
 if(result.meta.changes)return json({revision});
 const current=await db.prepare('SELECT revision FROM progress WHERE id = ?').bind(id).first();
 return current&&current.revision!==input.revision?json({error:'Conflito: baixe a versão atual antes de publicar.'},409):json({error:'Capacidade temporariamente indisponível. Seu progresso local foi preservado.'},503);
}
export default {
 async fetch(request,env={}){
  const url=new URL(request.url);let path;try{path=decodeURIComponent(url.pathname);}catch{return new Response('Caminho inválido',{status:400});}
  if(path.includes('..')||path.includes('\\')||path.includes('//')||path.includes('%'))return new Response('Caminho inválido',{status:400});
  if(path==='/api/monitor'){try{const row=await env.PROGRESS?.prepare('SELECT payload FROM health_checks WHERE id = 1').first();return json(row?JSON.parse(row.payload):{status:'pending'});}catch{return json({status:'unavailable'},503);}}
  if(path==='/api/health')return json({status:'ok',service:'codigolab',storage:!!env.PROGRESS});
  if(path==='/api/progress'||path==='/api/progress/status'){
   try{return await progress(request,env,url);}catch{return json({error:'Serviço de sincronização temporariamente indisponível.'},503);}
  }
  if(path.startsWith('/api/'))return json({error:'Rota não encontrada.'},404);
  if(!['GET','HEAD'].includes(request.method))return new Response('Método não permitido',{status:405});
  if(!env.ASSETS)return new Response('Assets não configurados',{status:503});
  const document=path==='/'||! /\.[a-z0-9]{1,16}$/i.test(path);
  const target=new URL(url);if(document)target.pathname='/index.html';
  const response=await env.ASSETS.fetch(new Request(target,request));
  const headers=new Headers(response.headers);
  headers.set('Cache-Control',document||(path==='/sw.js'||path==='/sw-build.js')||path.endsWith('.webmanifest')?'no-cache, must-revalidate':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'public, max-age=3600');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Content-Security-Policy',CSP);
  headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
 }
};
