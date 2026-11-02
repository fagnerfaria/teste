/* CódigoLab: cache de arquivos educacionais próprios; APIs e progresso cifrado nunca são armazenados. */
const CACHE='codigolab-shell-__BUILD_ID__';
const STATIC=['/','/index.html','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('codigolab-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/sw.js'||url.pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).catch(async()=>await caches.match('/index.html')||new Response('Sem conexão. Conecte-se para carregar o CódigoLab.',{status:503})));
  return;
 }
 if(!url.pathname.startsWith('/assets/')&&!url.pathname.startsWith('/vendor/')&&!url.pathname.startsWith('/content/')&&!STATIC.includes(url.pathname))return;
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{
  if(response.ok&&response.type==='basic')event.waitUntil(caches.open(CACHE).then(c=>c.put(req,response.clone())).catch(()=>{}));
  return response;
 })));
});
