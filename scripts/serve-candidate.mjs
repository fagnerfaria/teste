/** Local replica of Pages ASSETS + D1 for browser integration checks. No remote data. */
import {createServer}from'node:http';
import{readFile}from'node:fs/promises';
import{resolve,extname}from'node:path';
import{DatabaseSync}from'node:sqlite';
import worker from'../cloudflare/_worker.js';
export async function serveCandidate(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE progress (id TEXT PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT,updated_at INTEGER NOT NULL)');
 db.exec('CREATE TABLE progress_limits(id TEXT PRIMARY KEY,window INTEGER NOT NULL,count INTEGER NOT NULL)');
 const PROGRESS={prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)||null},async run(){const result=db.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}}}}}}}};
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.md':'text/plain','.mdx':'text/plain'};
 const root=resolve('dist');
 const env={PROGRESS,ASSETS:{async fetch(req){const pathname=new URL(req.url).pathname;if(pathname==='/index.html')return new Response(null,{status:301,headers:{location:'/'}});const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+'/'))return new Response('Not found',{status:404});try{return new Response(await readFile(path),{headers:{'content-type':types[extname(path)]||'application/octet-stream'}})}catch{return new Response('Not found',{status:404})}}}};
 const server=createServer(async(req,res)=>{
  try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const url='http://127.0.0.1:'+server.address().port+(req.url||'/');
   const response=await worker.fetch(new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),env);
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end(String(error));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return{url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve()}))};
}
