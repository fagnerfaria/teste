import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { update, useData } from "@/lib/store";

const MAIN = [
  { to: "/", label: "Início", icon: "⌂" },
  { to: "/aulas", label: "Aulas", icon: "📘" },
  { to: "/lab", label: "Laboratório", icon: "▶" },
  { to: "/exercicios", label: "Exercícios", icon: "✓" },
  { to: "/percurso", label: "Percurso", icon: "🗺" },
] as const;
const MORE = [
  { to: "/cursos", label: "Cursos" },
  { to: "/glossario", label: "Glossário" },
  { to: "/dados", label: "Meus dados" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const data = useData();
  useEffect(() => { document.documentElement.classList.toggle("dark", data.theme === "dark"); }, [data.theme]);
  const toggle = () => update((d) => ({ ...d, theme: d.theme === "dark" ? "light" : "dark" }));
  const linkCls = "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent";
  const active = { className: "bg-sidebar-accent text-sidebar-accent-foreground font-bold" };

  return (
    <div className="min-h-screen md:flex">
      <a href="#conteudo" className="sr-only focus:not-sr-only">Pular para o conteúdo</a>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 text-sidebar-foreground md:flex">
        <Link to="/" className="mb-6 font-display text-2xl font-extrabold">Código<span className="text-primary">Lab</span></Link>
        <nav aria-label="Principal" className="space-y-1">
          {MAIN.map((n) => <Link key={n.to} to={n.to} className={linkCls} activeProps={active} activeOptions={{ exact: n.to === "/" }}><span aria-hidden>{n.icon}</span>{n.label}</Link>)}
          <div className="my-3 border-t" />
          {MORE.map((n) => <Link key={n.to} to={n.to} className={linkCls} activeProps={active}>{n.label}</Link>)}
        </nav>
        <button onClick={toggle} className="btn btn-ghost mt-auto">{data.theme === "dark" ? "☀ Modo claro" : "☾ Modo escuro"}</button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur md:hidden">
          <Link to="/" className="font-display text-lg font-extrabold">Código<span className="text-primary">Lab</span></Link>
          <nav aria-label="Secundária" className="ml-auto flex gap-1 overflow-x-auto text-xs">
            {MORE.map((n) => <Link key={n.to} to={n.to} className="rounded px-2 py-1 hover:bg-muted" activeProps={{ className: "bg-muted font-bold" }}>{n.label}</Link>)}
          </nav>
          <button onClick={toggle} aria-label="Alternar modo claro/escuro" className="rounded px-2 py-1 hover:bg-muted">{data.theme === "dark" ? "☀" : "☾"}</button>
        </header>
        <main id="conteudo" className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>

      <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card md:hidden">
        {MAIN.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-bold" }}>
            <span aria-hidden className="text-lg leading-none">{n.icon}</span>{n.label === "Laboratório" ? "Lab" : n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}