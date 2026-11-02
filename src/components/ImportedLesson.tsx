import {useEffect,useMemo,useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Link} from '@tanstack/react-router';
import {SNAPSHOT_DOCUMENTS} from '@/lib/content/snapshot-index';
import {parseExternalLesson,type ImportedQuiz,type ImportedCheckpoint} from '@/lib/content/mdx-reader';
import {EXTERNAL_SOURCES,buildSourceUrl,buildRawUrl,type ExternalItem} from '@/lib/content/external-library';
import {recordAttempt,useData,saveDraft} from '@/lib/store';
import {ExampleBlock} from './ExampleBlock';
import {ImportedDiagram} from './ImportedDiagram';

function SourceQuiz({quiz,id}:{quiz:ImportedQuiz;id:string}){
 const data=useData();const [answer,setAnswer]=useState<number|null>(null);const [checked,setChecked]=useState(false);
 const option=answer===null?undefined:quiz.options[answer];
 return <section className="my-4 space-y-3 rounded-lg border p-3"><h3 className="font-semibold">{quiz.question}</h3>
 <fieldset><legend className="sr-only">Alternativas</legend>{quiz.options.map((o,i)=><label key={i} className="flex gap-2 rounded p-2 hover:bg-muted"><input type="radio" name={id} checked={answer===i} onChange={()=>{setAnswer(i);setChecked(false);}}/><span>{o.text}</span></label>)}</fieldset>
 <button className="btn btn-primary" disabled={answer===null} onClick={()=>{setChecked(true);recordAttempt(id,!!option?.correct);}}>Conferir resposta</button>
 {checked&&<p role="status" className={option?.correct?'text-success':'text-destructive'}>{option?.correct?'Correto. ':'Revise e tente novamente. '}{option?.explanation}</p>}
 {data.passedExercises[id]&&<p className="text-sm text-success">✔ Questão aprovada e progresso salvo.</p>}
 </section>;
}

function SourceCheckpoint({checkpoint,id,title}:{checkpoint:ImportedCheckpoint;id:string;title:string}){
 const data=useData();
 const projectOnly=checkpoint.kind==='code'&&checkpoint.starterCode!==null&&/\b(?:import\s|export\s|interface\s|declare\s|type\s+\w+\s*=)/.test(checkpoint.starterCode);
 return <section className="space-y-2 rounded-lg border p-3"><h3 className="font-bold">Desafio prático da fonte</h3><p>{checkpoint.challenge}</p>
 {projectOnly?<div className="space-y-2"><pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs"><code>{checkpoint.starterCode}</code></pre><p className="text-xs text-muted-foreground">Desafio de projeto com imports ou tipos: depende do framework e do ambiente descritos nesta aula. O trecho é preservado para estudo e aplicação em projeto configurado; não é executado como script isolado.</p><Link to="/workspace" className="text-primary underline">Abrir editor de projetos →</Link></div>:checkpoint.starterCode!==null?<ExampleBlock title={title} lang={checkpoint.kind==='html'?'html':/\b(?:print\(|def )/.test(checkpoint.starterCode)?'python':'javascript'} code={checkpoint.starterCode}/>:<label className="block text-sm">Sua resposta e evidências (salvas neste navegador)<textarea className="mt-1 min-h-32 w-full rounded border bg-background p-3" value={data.drafts[id]||''} onChange={event=>saveDraft(id,event.target.value)}/></label>}
 {checkpoint.expected!==null?<p className="text-sm">Saída esperada: <code>{checkpoint.expected}</code>. Compare com o terminal após executar seu código.</p>:<p className="text-xs text-muted-foreground">Atividade de aplicação e autoavaliação. O leitor preserva o desafio original; não emite aprovação automática para este critério.</p>}
 <Link to="/lab" className="text-primary underline">Abrir laboratório de prática →</Link></section>;
}

export function ImportedLesson({item,onOpen}:{item:ExternalItem;onOpen:(sourceId:string,path:string)=>void}){
 const source=EXTERNAL_SOURCES.find(s=>s.id===item.sourceId)!;
 const snapshot=SNAPSHOT_DOCUMENTS.find(d=>d.sourceId===item.sourceId&&d.path===item.path);
 const [text,setText]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();let active=true;let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},12000);
  setText('');setError('');setBusy(true);
  let url:string;
  try{url=snapshot?.url||buildRawUrl(item.sourceId,item.path);}catch{setError('Este material deve ser lido na fonte original.');setBusy(false);clearTimeout(timer);return;}
  fetch(url,{signal:controller.signal,credentials:'omit'}).then(async response=>{
   if(!response.ok)throw new Error(`Conteúdo indisponível (HTTP ${response.status})`);
   const raw=await response.text();if(raw.length>1000000)throw new Error('Documento excede o limite do leitor');
   if(snapshot&&globalThis.crypto?.subtle){
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
    const digest=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==snapshot.sha256)throw new Error('Documento diferente do snapshot verificado. Recarregue a página.');
   }
   if(active)setText(raw);
  }).catch(e=>{if(active)setError(timedOut?'O carregamento excedeu 12 segundos. Tente novamente com conexão ativa.':e instanceof Error?e.message:'Falha ao abrir documento');})
  .finally(()=>{clearTimeout(timer);if(active)setBusy(false);});
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[item.sourceId,item.path,snapshot]);
 const parsed=useMemo(()=>parseExternalLesson(text),[text]);
 const base=snapshot?.original||buildSourceUrl(item.sourceId,item.path);
 const resolve=(href:string|undefined)=>{try{return new URL(href||base,base).href;}catch{return base;}};
 const follow=(href:string|undefined,event:React.MouseEvent)=>{
  if(!href)return;try{
   const target=new URL(href,base);const prefix=`https://github.com/${source.repository}/blob/`;
   if(target.href.startsWith(prefix)){
    const parts=target.pathname.split('/');const path=decodeURIComponent(parts.slice(5).join('/'));
    if(SNAPSHOT_DOCUMENTS.some(d=>d.sourceId===item.sourceId&&d.path===path)){event.preventDefault();onOpen(item.sourceId,path);}
   }
  }catch{/* external anchor remains an ordinary link */}
 };
 return <section className="mt-4 space-y-4 rounded-xl border bg-card p-3 sm:p-5" aria-label="Leitor do material incorporado">
  <div className="space-y-2 text-xs text-muted-foreground">
   <p>{snapshot?'Texto integral incorporado e verificado por SHA-256. Leitura sem requisição ao GitHub.':'Leitura sob demanda da fonte original.'} Autoria: {source.name} ({source.repository}).</p>
   <p>{source.licenseNote}</p>
   {snapshot&&<><p>Revisão: <code className="break-all">{snapshot.original.split('/blob/')[1]?.split('/')[0]}</code>. Textos preservados; exibição MDX adaptada sem executar código da origem. {item.sourceId==='aprenda-community'?'Conteúdo e adaptações da apresentação: CC BY-SA 4.0.':'Conteúdo: MIT.'}</p><a href={snapshot.url} download className="text-primary underline">Baixar arquivo original incorporado</a><a href="/content/manifest.json" target="_blank" rel="noopener noreferrer" className="ml-3 text-primary underline">Manifesto e licenças integrais</a></>}
  </div>
  {busy&&<p role="status">Carregando material…</p>}
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {!busy&&!error&&<>
   <div className="external-markdown max-w-none break-words text-sm leading-relaxed">
    <Markdown skipHtml remarkPlugins={[remarkGfm]} components={{
     a:({href,children})=><a href={resolve(href)} onClick={event=>follow(href,event)} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
     img:({alt})=><span className="text-muted-foreground">[Imagem disponível na origem: {alt||'ver original'}]</span>,
     pre:({children})=><div className="my-3 overflow-x-auto rounded bg-muted p-3">{children}</div>,
     code:({children,className})=>className==='language-mermaid'?<ImportedDiagram code={String(children).trim()}/>:<code className={className||'rounded bg-muted px-1 font-mono text-xs'}>{children}</code>,
    }}>{item.path.endsWith('.json')?'```json\n'+text+'\n```':parsed.markdown}</Markdown>
   </div>
   {parsed.metadata&&<details className="rounded-lg border p-3"><summary className="cursor-pointer font-semibold">Recursos, créditos e metadados originais</summary><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{parsed.metadata}</pre></details>}
   {parsed.quizzes.length>0&&<section><h2 className="text-lg font-bold">Pratique com as questões da fonte</h2>{parsed.quizzes.map((q,i)=><SourceQuiz key={item.path+':'+i} quiz={q} id={`imported:${item.sourceId}:${item.path}:quiz:${i}`}/>)}</section>}
   {parsed.checkpoints.map((checkpoint,i)=><SourceCheckpoint key={i} checkpoint={checkpoint} id={`imported:${item.sourceId}:${item.path}:checkpoint:${i}`} title={`Desafio ${i+1}: ${item.title}`}/>)}
  </>}
 </section>;
}
