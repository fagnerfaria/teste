/** Direct Upload assets. A short-lived project upload JWT is read only from stdin. */
import {readFile,readdir,writeFile}from'node:fs/promises';
import {extname,join}from'node:path';
import {hashFile}from'@cloudflare/deploy-helpers';
const token=(await new Promise(resolve=>{let value='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>value+=c);process.stdin.on('end',()=>resolve(value));})).trim();
if(!token)throw Error('Project upload JWT required on stdin');
const root='dist',entries=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(!['_worker.js','_redirects','_headers'].includes(entry.name)){entries.push({path,url:'/'+path.slice(root.length+1),hash:hashFile(path)});}}}
await walk(root);
const call=async(path,body)=>{const response=await fetch('https://api.cloudflare.com/client/v4'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});const data=await response.json();if(!response.ok||!data.success)throw Error('Cloudflare asset operation failed '+response.status+' '+JSON.stringify(data.errors));return data.result;};
const hashes=[...new Set(entries.map(e=>e.hash))];
const missing=new Set(await call('/pages/assets/check-missing',{hashes}));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.wasm':'application/wasm','.zip':'application/zip','.md':'text/plain','.mdx':'text/plain','.txt':'text/plain'};
const files=entries.filter((e,i,a)=>missing.has(e.hash)&&a.findIndex(x=>x.hash===e.hash)===i);
let batch=[],size=0,uploaded=0;
const flush=async()=>{if(!batch.length)return;await call('/pages/assets/upload',batch);uploaded+=batch.length;console.log('Assets uploaded:',uploaded,'/',files.length);batch=[];size=0;};
for(const entry of files){const value=(await readFile(entry.path)).toString('base64');if(size+value.length>18000000)await flush();batch.push({key:entry.hash,value,base64:true,metadata:{contentType:mime[extname(entry.path)]||'application/octet-stream'}});size+=value.length;}
await flush();await call('/pages/assets/upsert-hashes',{hashes});
await writeFile('/tmp/codigolab-deployment-manifest.json',JSON.stringify(Object.fromEntries(entries.map(e=>[e.url,e.hash]))));
console.log('Native assets ready:',entries.length,'files. Manifest prepared.');
