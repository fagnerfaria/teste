import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { trackById, unitsForTrack } from "@/lib/content/tracks";
import { LESSONS } from "@/lib/content/lessons";
import { COURSES } from "@/lib/content/courses";
import { useData } from "@/lib/store";
export const Route=createFileRoute("/trilhas/$id")({
 loader:({params})=>{if(!trackById(params.id))throw notFound();return {}},
 component:TrackPage,
});
function TrackPage(){
 const {id}=Route.useParams(),track=trackById(id)!;
 const d=useData();
 const units=unitsForTrack(id);
 const entries=id==="fundamentos"?LESSONS.map(l=>({id:l.id,title:l.title,done:!!d.completedLessons[l.id],week:l.week})):
   units.map((u,i)=>({id:u.id,title:u.title,done:!!d.completedLessons["unit:"+u.id],week:i+1}));
 const done=entries.filter(e=>e.done).length;
 return <div className="space-y-5">
   <Link to="/trilhas" className="text-sm text-primary">← Todas as trilhas</Link>
   <header><h1 className="text-3xl font-extrabold">{track.title}</h1><p className="mt-2">{track.summary}</p>
    <p className="mt-1 text-sm text-muted-foreground">Pré-requisitos: {track.prerequisites}</p></header>
   <div className="card-surface p-3 text-sm">Progresso: <strong>{done} de {entries.length} aulas concluídas</strong>. {id==="fundamentos"?"Cada aula exige um exercício corrigido.":"A conclusão exige aprovação no exercício ou questão de compreensão."}</div>
   <ol className="space-y-2">
    {entries.map((e,i)=><li key={e.id}>
     {id==="fundamentos"?
      <Link to="/aulas/$id" params={{id:e.id}} className="card-surface flex items-center gap-3 p-3 hover:border-primary"><span>{e.done?"✔":i+1}</span><span className="flex-1 font-semibold">{e.title}</span><span aria-hidden>→</span></Link>:
      <Link to="/estudar/$id" params={{id:e.id}} className="card-surface flex items-center gap-3 p-3 hover:border-primary"><span>{e.done?"✔":i+1}</span><span className="flex-1 font-semibold">{e.title}</span><span aria-hidden>→</span></Link>}
    </li>)}
   </ol>
   <section className="card-surface space-y-2 p-4">
    <h2 className="font-bold">Materiais externos relacionados</h2>
    <p className="text-sm text-muted-foreground">Explore o currículo original dos autores para aprofundar o assunto. O CódigoLab oferece uma sequência própria, não uma cópia integral.</p>
    {COURSES.filter(c=>track.sources.includes(c.id)).map(c=><p key={c.id} className="text-sm"><a href={c.links[0]?.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">{c.title} ↗</a></p>)}
   </section>
   <Link to="/projetos" className="btn btn-ghost">Praticar com projetos →</Link>
 </div>;
}
