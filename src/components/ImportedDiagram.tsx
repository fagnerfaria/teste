import {useEffect,useId,useState} from 'react';
let engine:Promise<typeof import('mermaid')['default']>|undefined;
function diagramEngine(){
 if(!engine)engine=import('mermaid').then(module=>{
  const mermaid=module.default;
  mermaid.initialize({startOnLoad:false,securityLevel:'strict',maxTextSize:20000,flowchart:{htmlLabels:false},theme:'neutral'});
  return mermaid;
 });
 return engine;
}
/** Diagrams are SVG data inside an iframe with no scripts, origin or network. */
export function ImportedDiagram({code}:{code:string}){
 const id=useId().replace(/[^a-zA-Z0-9]/g,'');const [svg,setSvg]=useState('');const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;setSvg('');setError('');
  if(code.length>20000){setError('Diagrama extenso: consulte o código abaixo.');return;}
  diagramEngine().then(mermaid=>mermaid.render('diagram'+id,code)).then(result=>{if(active)setSvg(result.svg);}).catch(()=>{if(active)setError('Diagrama apresentado em formato textual por incompatibilidade de sintaxe.');});
  return()=>{active=false;};
 },[code,id]);
 const document='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src \'none\'; base-uri \'none\'; form-action \'none\'"><style>body{margin:0;background:white;padding:8px}svg{max-width:100%;height:auto}</style></head><body>'+svg+'</body></html>';
 return <figure className="my-4 space-y-2 rounded-lg border p-2">
 {svg?<iframe title="Diagrama do material incorporado" sandbox="" srcDoc={document} className="h-96 w-full rounded bg-white"/>:<p role="status" className="text-xs">{error||'Preparando diagrama…'}</p>}
 <details><summary className="cursor-pointer text-xs font-semibold">Código e descrição do diagrama</summary><pre className="overflow-x-auto whitespace-pre-wrap p-2 text-xs"><code>{code}</code></pre></details>
 </figure>;
}
