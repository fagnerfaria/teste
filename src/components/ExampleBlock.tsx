import { useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { Terminal } from "./Terminal";
import { useRunner, footerFor } from "@/hooks/use-runner";
import { useData } from "@/lib/store";
import type { ExampleLang } from "@/lib/content/track-types";

export function ExampleBlock({
 title, code: initial, lang="python",
}: { title:string; code:string; lang?:ExampleLang }) {
 const [code,setCode]=useState(initial);
 const [preview,setPreview]=useState("");
 const r=useRunner();
 const {timeoutMs}=useData();
 const executable=lang==="python"||lang==="javascript";
 const html=lang==="html";
 const shell=lang==="shell";
 const run=()=>{
   if(html){setPreview(code);return;}
   if(executable) void r.run(lang,code,{timeoutMs});
 };
 return <div className="card-surface space-y-2 p-3">
   <h4 className="font-bold">{title}</h4>
   {shell ? <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm" aria-label="Comandos ilustrativos">{code}</pre> :
   <CodeEditor value={code} onChange={setCode} lang={lang} minHeight={120} label={"Código de exemplo: "+title}/>}
   {shell && <p className="text-xs text-muted-foreground">Demonstração: estes comandos não são executados pelo CódigoLab. Use um terminal autorizado e revise cada comando.</p>}
   <div className="flex flex-wrap gap-2">
     {!shell && <button className="btn btn-primary" disabled={r.running} onClick={run}>{r.running?"Executando…":html?"↻ Mostrar visualização":"▶ Executar"}</button>}
     {r.running&&<button className="btn btn-danger" onClick={r.stop}>■ Parar</button>}
     {!shell&&<button className="btn btn-ghost" onClick={()=>{setCode(initial);setPreview("");}}>Restaurar código</button>}
     <button className="btn btn-ghost" onClick={()=>navigator.clipboard?.writeText(code).catch(()=>{})}>Copiar</button>
   </div>
   {html && <div className="space-y-1">
     <iframe title={"Visualização de "+title} sandbox="allow-scripts" srcDoc={preview} className="h-72 w-full rounded-lg border bg-card"/>
     <p className="text-xs text-muted-foreground">A visualização usa um iframe isolado. Clique em “Mostrar visualização” para executar HTML, CSS e JS do exemplo.</p>
   </div>}
   {executable && (r.running||r.chunks.length>0) &&
     <Terminal chunks={r.running&&!r.chunks.length?[{stream:"info",text:"Executando…\n"}]:r.chunks} footer={footerFor(r.last)}/>}
 </div>;
}
