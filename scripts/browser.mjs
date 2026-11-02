import {chromium}from'playwright';
import{access,readFile,writeFile,chmod}from'node:fs/promises';
import{brotliDecompressSync}from'node:zlib';
import{tmpdir}from'node:os';
import{join}from'node:path';
export async function launchBrowser(){
 let executablePath=process.env.CHROMIUM_PATH;
 if(!executablePath){try{await access(chromium.executablePath())}catch{
  executablePath=join(tmpdir(),'codigolab-chromium');
  try{const data=await readFile(executablePath);if(data.byteLength<1000000)throw Error()}catch{
   await writeFile(executablePath,brotliDecompressSync(await readFile(new URL('../node_modules/@sparticuz/chromium/bin/chromium.br',import.meta.url))));await chmod(executablePath,0o755);
  }
 }}
 const proxyUrl=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
 const proxy=proxyUrl?{server:new URL(proxyUrl).origin,bypass:'127.0.0.1,localhost'}:undefined;
 return chromium.launch({headless:true,executablePath,proxy,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
}
