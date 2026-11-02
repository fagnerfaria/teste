/* CódigoLab: cache apenas de recursos locais; conteúdo remoto e dados pessoais não são armazenados. */
const CACHE="codigolab-shell-v1";
const STATIC=["/","/index.html","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("codigolab-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
  const url=new URL(req.url);
  if(url.pathname==="/sw.js")return;
  if(req.mode==="navigate"){
    event.respondWith(fetch(req).catch(async()=>await caches.match("/")||new Response("Sem conexão: abra o CódigoLab após conectar-se à internet.",{status:503,headers:{"content-type":"text/plain;charset=utf-8"}})));
    return;
  }
  if(!url.pathname.startsWith("/assets/")&&!STATIC.includes(url.pathname))return;
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{
    if(response.ok&&response.type==="basic"){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));
    }
    return response;
  })));
});
