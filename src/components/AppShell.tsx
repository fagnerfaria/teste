import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { update, useData, usePersistenceError } from "@/lib/store";

const MAIN = [
 { to:"/",label:"Início",icon:"⌂" },
 { to:"/trilhas",label:"Trilhas",icon:"▦" },
 { to:"/workspace",label:"Editor",icon:"⌘" },
 { to:"/lab",label:"Laboratório",icon:"▶" },
 { to:"/projetos",label:"Projetos",icon:"◇" },
] as const;
const MORE = [
 { to:"/aulas",label:"Aulas introdutórias" },
 { to:"/exercicios",label:"Exercícios" },
 { to:"/percurso",label:"Percurso inicial" },
 { to:"/cursos",label:"Cursos externos" },
 { to:"/biblioteca",label:"Biblioteca de referências" },
 { to:"/sql",label:"Laboratório SQL" },
 { to:"/git",label:"Praticar Git real" },
 { to:"/api",label:"Laboratório de APIs" },
 { to:"/agentes",label:"RAG, MCP e agentes" },
 { to:"/glossario",label:"Glossário" },
 { to:"/dados",label:"Meus dados" },
] as const;

export function AppShell({children}:{children:ReactNode}){
 const data=useData();
 const storageError=usePersistenceError();
 useEffect(()=>{document.documentElement.classList.toggle("dark",data.theme==="dark");},[data.theme]);
 const toggle=()=>update(d=>({...d,theme:d.theme==="dark"?"light":"dark"}));
 const linkCls="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent";
 const active={className:"bg-sidebar-accent text-sidebar-accent-foreground font-bold"};
 return <div className="min-h-screen md:flex">
  <a href="#conteudo" className="sr-only focus:not-sr-only">Pular para o conteúdo</a>
  <aside className="sticky top-0 hidden h-screen overflow-y-auto w-60 shrink-0 flex-col border-r bg-sidebar p-4 text-sidebar-foreground md:flex">
   <Link to="/" className="mb-6 font-display text-2xl font-extrabold">Código<span className="text-primary">Lab</span></Link>
   <nav aria-label="Principal" className="space-y-1">
    {MAIN.map(n=><Link key={n.to} to={n.to} className={linkCls} activeProps={active} activeOptions={{exact:n.to==="/"}}><span aria-hidden>{n.icon}</span>{n.label}</Link>)}
    <div className="my-3 border-t"/>
    {MORE.map(n=><Link key={n.to} to={n.to} className={linkCls} activeProps={active}>{n.label}</Link>)}
   </nav>
   <button onClick={toggle} className="btn btn-ghost mt-auto">{data.theme==="dark"?"☀ Modo claro":"☾ Modo escuro"}</button>
  </aside>
  <div className="min-w-0 flex-1">
   <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur md:hidden">
    <Link to="/" className="font-display text-lg font-extrabold">Código<span className="text-primary">Lab</span></Link>
    <div className="ml-auto flex items-center gap-2">
     <details className="relative"><summary className="cursor-pointer rounded px-2 py-1 text-sm font-semibold">Mais ▾</summary>
      <nav aria-label="Mais opções" className="absolute right-0 top-full z-40 mt-2 flex min-w-48 max-h-[70vh] overflow-y-auto flex-col rounded-lg border bg-card p-2 shadow-xl">
       {MORE.map(n=><Link key={n.to} to={n.to} className="rounded px-3 py-2 text-sm hover:bg-muted">{n.label}</Link>)}
      </nav>
     </details>
     <button onClick={toggle} aria-label="Alternar modo claro/escuro" className="rounded px-2 py-1 hover:bg-muted">{data.theme==="dark"?"☀":"☾"}</button>
    </div>
   </header>
   <main id="conteudo" className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">{storageError&&<p role="alert" className="mb-4 rounded border border-warning bg-warning/10 p-3 text-sm">{storageError}</p>}{children}</main>
  </div>
  <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card md:hidden">
   {MAIN.map(n=><Link key={n.to} to={n.to} activeOptions={{exact:n.to==="/"}} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground" activeProps={{className:"text-primary font-bold"}}><span aria-hidden className="text-lg leading-none">{n.icon}</span>{n.label==="Laboratório"?"Lab":n.label}</Link>)}
  </nav>
 </div>;
}
