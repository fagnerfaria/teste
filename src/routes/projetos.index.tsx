import { createFileRoute, Link } from "@tanstack/react-router";
import { PROJECTS, trackById } from "@/lib/content/tracks";
import { useData } from "@/lib/store";
export const Route=createFileRoute("/projetos/")({
 head:()=>({meta:[{title:"Projetos práticos — CódigoLab"},{name:"description",content:"Seis projetos progressivos para aplicar programação, web, testes, automação e agentes de IA."}]}),
 component:Projetos,
});
function Projetos(){
 const d=useData();
 return <div className="space-y-5">
   <header><h1 className="text-3xl font-extrabold">Projetos integradores</h1>
    <p className="mt-2 text-muted-foreground">Seu portfólio começa com projetos pequenos. Cada proposta tem etapas e critérios de aceitação. A conclusão é autodeclarada após revisão dos requisitos; não é uma certificação técnica automática.</p></header>
   <div className="grid gap-4 md:grid-cols-2">
   {PROJECTS.map((p,i)=>{
    const done=p.steps.filter((_,ix)=>!!d.checklist["project:"+p.id+":"+ix]).length;
    const certified=!!d.checklist["project:done:"+p.id];
    return <article key={p.id} className="card-surface flex flex-col space-y-2 p-4">
      <p className="text-xs font-semibold text-primary">Projeto {i+1} · {trackById(p.trackId)?.title}</p>
      <h2 className="text-lg font-bold">{p.title}</h2><p className="text-sm">{p.summary}</p>
      <p className="text-xs text-muted-foreground">{done}/{p.steps.length} etapas marcadas {certified?" · ✔ revisado":""}</p>
      <Link to="/projetos/$id" params={{id:p.id}} className="btn btn-primary mt-auto justify-center">Abrir projeto →</Link>
    </article>;
   })}
   </div>
   <Link to="/trilhas" className="btn btn-ghost">← Voltar às trilhas</Link>
 </div>;
}
