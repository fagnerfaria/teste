import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const copy=async(source,target)=>{await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await copyFile(source,target);};
for(const name of ['pyodide.js','pyodide.asm.js','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json'])await copy('node_modules/pyodide/'+name,'public/vendor/pyodide/'+name);
for(const name of ['sql-wasm.js','sql-wasm.wasm'])await copy('node_modules/sql.js/dist/'+name,'public/vendor/sql/'+name);
await copy('node_modules/esbuild-wasm/esbuild.wasm','public/vendor/esbuild.wasm');
await copy('node_modules/esbuild-wasm/LICENSE.md','public/vendor/esbuild-LICENSE.txt');
await copy('node_modules/sql.js/LICENSE','public/vendor/sql-LICENSE.txt');
await copy('cloudflare/_worker.js','public/_worker.js');
let commit=process.env.CODIGOLAB_SOURCE_REVISION||'development';try{if(!process.env.CODIGOLAB_SOURCE_REVISION)commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
const dependencies=JSON.parse(await readFile('package.json','utf8')).dependencies;
await writeFile('public/health.json',JSON.stringify({service:'codigolab',commit,builtAt:new Date().toISOString(),engines:{python:dependencies.pyodide,sqlite:dependencies['sql.js'],bundler:dependencies['esbuild-wasm']}}));
await writeFile('public/sw-build.js',(await readFile('public/sw.js','utf8')).replace('__BUILD_ID__',commit.slice(0,12)+'-'+Date.now()));
console.log('Assets nativos preparados: Python, SQLite, bundler e Worker.');
