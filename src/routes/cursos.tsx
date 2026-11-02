import { createFileRoute, Link } from "@tanstack/react-router";
import { COURSES, FUTURE_TRACKS } from "@/lib/content/courses";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Catálogo de cursos gratuitos — CódigoLab" },
      { name: "description", content: "30 Dias de Python, Universidade Brasileira Livre, freeCodeCamp e Aprenda Community, com links oficiais." },
      { property: "og:title", content: "Cursos gratuitos — CódigoLab" },
      { property: "og:description", content: "Catálogo de cursos gratuitos do GitHub com links oficiais." },
    ],
  }),
  component: Cursos,
});

function Cursos() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Cursos</h1>
      <p className="text-sm text-muted-foreground">Materiais gratuitos de terceiros. O CódigoLab não tem parceria com esses projetos nem emite certificados; as aulas adaptadas aqui são explicações originais do app.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {COURSES.map((c) => (
          <article key={c.id} className="card-surface flex flex-col p-4">
            <h2 className="text-lg font-bold">{c.title}</h2>
            <p className="text-xs text-muted-foreground">{c.org}</p>
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              <span className="rounded bg-secondary px-2 py-0.5">{c.language}</span>
              <span className="rounded bg-secondary px-2 py-0.5">{c.level}</span>
            </div>
            <p className="mt-2 text-sm">{c.description}</p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-semibold">Módulos iniciais</summary>
              <ul className="ml-5 list-disc">{c.modules.map((m) => <li key={m}>{m}</li>)}</ul>
            </details>
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              {c.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-sm">{l.label} ↗</a>)}
              {c.adaptedLessons && <Link to="/aulas" className="btn btn-primary text-sm">Estudar aula adaptada no CódigoLab</Link>}
            </div>
          </article>
        ))}
      </div>
      <section>
        <h2 className="mb-2 text-xl font-bold">Trilhas futuras</h2>
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {FUTURE_TRACKS.map((t) => (
            <li key={t.title} className="card-surface p-3">
              <div className="flex justify-between"><span className="font-semibold">{t.title}</span><span className="text-xs text-muted-foreground">{t.status}</span></div>
              <p className="text-sm text-muted-foreground">{t.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}