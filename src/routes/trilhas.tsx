import { createFileRoute, Link } from "@tanstack/react-router";
import { TRACKS, unitsForTrack } from "@/lib/content/tracks";
import { LESSONS } from "@/lib/content/lessons";
import { useData } from "@/lib/store";
export const Route=createFileRoute("/trilhas")({
  head:()=>({meta:[{title:"Trilhas de programação — CódigoLab"},{name:"description",content:"Seis trilhas do zero a automação e agentes de IA, com aulas autorais e prática."}]}),
  component:Trilhas,
});
function Trilhas(){
 const d=useData();
 const completed=(id:string)=>TRACKS.find(t=>t.id===id)?.id==="fundamentos"
   ? LESSONS.filter(l=>!!d.completedLessons[l.id]).length
   : unitsForTrack(id).filter(u=>!!d.completedLessons["unit:"+u.id]).length;
 return <main className="space-y-5">
   <header><p className="text-sm font-semibold text-primary">Aprendizado organizado</p><h1 className="text-3xl font-extrabold">Trilhas de estudo</h1>
    <p className="mt-2 text-muted-foreground">Aprenda na ordem recomendada ou entre diretamente no tema de que precisa. Aulas e exemplos são autorais; materiais externos permanecem vinculados aos autores.</p></header>
   <div className="grid gap-4 md:grid-cols-2">
     {TRACKS.map((track,i)=>{
       const total=track.id==="fundamentos"?LESSONS.length:unitsForTrack(track.id).length;
       const done=completed(track.id);
       const percent=Math.round(100*done/total);
       return <article key={track.id} className="card-surface flex flex-col gap-3 p-5">
         <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Trilha {i+1}</span><span className="text-xs text-muted-foreground">{done}/{total} aulas</span></div>
         <h2 className="text-xl font-bold">{track.title}</h2>
         <p className="text-sm">{track.summary}</p>
         <p className="text-xs text-muted-foreground"><strong>Pré-requisitos:</strong> {track.prerequisites}</p>
         <div className="mt-auto space-y-2"><div role="progressbar" aria-label={"Progresso "+track.title} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width:percent+"%"}}/></div>
          <Link to="/trilhas/$id" params={{id:track.id}} className="btn btn-primary w-full justify-center">Abrir trilha →</Link></div>
       </article>
     })}
   </div>
   <p className="text-sm text-muted-foreground">Para uma prática completa, combine explicação, execução de código, correção e projeto. O checklist dos projetos é de autoavaliação, não certificação.</p>
   <Link to="/projetos" className="btn btn-accent">Ver projetos integradores →</Link>
 </main>;
}
