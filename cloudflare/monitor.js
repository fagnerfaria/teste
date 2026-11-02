/** Fixed-origin health checks, no student data, credentials or third-party telemetry. */
export async function checkSite(request=fetch){
 const origin='https://codigolab.pages.dev';
 const probes=[['site','/',false],['build','/health.json',false],['python','/vendor/pyodide/pyodide.asm.wasm',true],['sqlite','/vendor/sql/sql-wasm.wasm',true],['sync','/api/progress/status',false]];
 const results=await Promise.all(probes.map(async([name,path,head])=>{
  const start=Date.now();try{
   const response=await request(origin+path,{method:head?'HEAD':'GET',cache:'no-store',signal:AbortSignal.timeout(15000)});
   let ok=response.status===200;
   if(name==='site')ok=ok&&(await response.text()).includes('id="root"');
   if(name==='build')ok=ok&&(await response.json()).service==='codigolab';
   if(name==='sync')ok=ok&&(await response.json()).available===true;
   if(head)ok=ok&&(response.headers.get('content-type')||'').includes('application/wasm');
   return{name,ok,http:response.status,durationMs:Date.now()-start};
  }catch{return{name,ok:false,http:0,durationMs:Date.now()-start}}
 }));
 return{checkedAt:Date.now(),status:results.every(p=>p.ok)?'ok':'degraded',results};
}
export default{
 async scheduled(_event,env){
  const result=await checkSite();
  await env.PROGRESS.prepare('INSERT INTO health_checks(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(JSON.stringify(result)).run();
  console.log(JSON.stringify({service:'codigolab-health',status:result.status,checks:result.results.map(p=>({name:p.name,ok:p.ok}))}));
 },
 async fetch(){return new Response('Scheduled health checker',{status:404})}
};
