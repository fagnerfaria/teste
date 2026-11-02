import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { unitById, unitsForTrack, trackById } from "@/lib/content/tracks";
import { ExampleBlock } from "@/components/ExampleBlock";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { recordAttempt, update, useData } from "@/lib/store";
import type { Exercise } from "@/lib/content/exercises";
export const Route=createFileRoute("/estudar/$id")({
 loader:({params})=>{if(!unitById(params.id))throw notFound();return {}},
 component:Estudar,
});
function Estudar(){
 const {id}=Route.useParams();
 const u=unitById(id)!;
 const d=useData();
 const [selected,setSelected]=useState<number|null>(null);
 const [checked,setChecked]=useState(false);
 const track=trackById(u.trackId)!;
 const ix=unitsForTrack(u.trackId).findIndex(x=>x.id===id);
 const items=unitsForTrack(u.trackId);
 const prev=items[ix-1], next=items[ix+1];
 const examId=u.challenge.kind==="code"?"unit:"+u.id:"quiz:"+u.id;
 const passed=!!d.passedExercises[examId];
 const done=!!d.completedLessons["unit:"+id];
 useEffect(()=>{setSelected(null);setChecked(false);},[id]);
 let exercise:Exercise|null=null;
 if(u.challenge.kind==="code"){
   exercise={id:examId,title:"Prática: "+u.title,level:2,lang:u.example.lang==="javascript"?"javascript":"python",
      prompt:u.challenge.prompt,starter:u.challenge.starter,tests:[{expected:u.challenge.expected}],
      hint:u.challenge.hint,solution:u.challenge.solution,
      solutionNotes:"Compare a saída real do seu código com o resultado esperado. Uma saída correta não prova que o algoritmo seja eficiente ou seguro."};
 }
 const markDone=()=>update(x=>({...x,completedLessons:{...x.completedLessons,["unit:"+id]:Date.now()}}));
 return <article className="space-y-5">
   <Link to="/trilhas/$id" params={{id:u.trackId}} className="text-sm text-primary">← {track.title}</Link>
   <header><p className="text-sm font-semibold text-muted-foreground">Aula {ix+1} de {items.length}</p><h1 className="text-3xl font-extrabold">{u.title}</h1></header>
   <section className="card-surface p-4"><h2 className="mb-2 font-bold">Ao concluir você saberá</h2><ul className="ml-5 list-disc text-sm">{u.objectives.map(o=><li key={o}>{o}</li>)}</ul></section>
   <section className="space-y-3 leading-relaxed">{u.explanation.map((p,i)=><p key={i}>{p}</p>)}</section>
   <section className="space-y-2"><h2 className="text-xl font-bold">Exemplo comentado para experimentar</h2>
     <ExampleBlock key={id} title={u.title+" · exemplo"} lang={u.example.lang} code={u.example.code}/>
   </section>
   <section className="space-y-3">
     <h2 className="text-xl font-bold">Verifique sua compreensão</h2>
     {exercise ? <ExerciseRunner key={id} ex={exercise}/> : u.challenge.kind==="quiz" ? <div className="card-surface space-y-3 p-4">
       <p className="font-semibold">{u.challenge.question}</p>
       <fieldset><legend className="sr-only">Alternativas</legend>
        {u.challenge.options.map((opt,i)=><label key={i} className="flex cursor-pointer items-start gap-2 rounded p-2 hover:bg-muted"><input type="radio" name={"quiz-"+id} checked={selected===i} onChange={()=>{setSelected(i);setChecked(false);}} className="mt-1"/><span>{opt}</span></label>)}
       </fieldset>
       <button className="btn btn-primary" disabled={selected===null} onClick={()=>{
         if(u.challenge.kind!=="quiz"||selected===null)return;
         recordAttempt(examId,selected===u.challenge.correctIndex);
         setChecked(true);
       }}>Conferir resposta</button>
       {checked&&<p role="status" className={"rounded p-2 text-sm "+(passed?"bg-success/10":"bg-warning/10")}>{selected===u.challenge.correctIndex?"Correto. ":"Revise e tente novamente. "}{u.challenge.explanation}</p>}
       {passed&&<p className="text-sm font-bold text-success">✔ Questão aprovada.</p>}
     </div> : null}
   </section>
   <section className="card-surface space-y-2 p-4">
     {done?<p className="font-bold text-success">✔ Aula concluída</p>:
       <button className="btn btn-primary" disabled={!passed} onClick={markDone}>Marcar aula como concluída</button>}
     {!passed&&<p className="text-sm text-muted-foreground">Resolva a atividade acima para liberar a conclusão.</p>}
   </section>
   <nav className="flex flex-wrap justify-between gap-3 text-sm">
     {prev?<Link to="/estudar/$id" params={{id:prev.id}} className="btn btn-ghost">← {prev.title}</Link>:<span/>}
     {next?<Link to="/estudar/$id" params={{id:next.id}} className="btn btn-ghost">{next.title} →</Link>:<Link to="/projetos" className="btn btn-accent">Ver projetos →</Link>}
   </nav>
 </article>;
}
