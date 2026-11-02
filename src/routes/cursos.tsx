import { createFileRoute, Link } from "@tanstack/react-router";
import { COURSES } from "@/lib/content/courses";
import { EXTERNAL_ITEMS } from "@/lib/content/external-library";
import { SNAPSHOT_DOCUMENTS } from "@/lib/content/snapshot-index";
import { TRACKS } from "@/lib/content/tracks";

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
      <Link to="/biblioteca" className="btn btn-primary inline-flex mt-2">Explorar {EXTERNAL_ITEMS.length.toLocaleString("pt-BR")} referências e {SNAPSHOT_DOCUMENTS.length} documentos incorporados →</Link>
      <p className="text-sm text-muted-foreground">Materiais gratuitos de terceiros. O CódigoLab não tem parceria com esses projetos nem emite certificados; os documentos incorporados preservam autoria e licença, e as aulas próprias são autorais.</p>
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
              <summary className="cursor-pointer font-semibold">Panorama dos módulos</summary>
              <ul className="ml-5 list-disc">{c.modules.map((m) => <li key={m}>{m}</li>)}</ul>
            </details>
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              {c.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-sm">{l.label} ↗</a>)}
              {TRACKS.filter(t=>t.sources.includes(c.id)).slice(0,2).map(t=><Link key={t.id} to="/trilhas/$id" params={{id:t.id}} className="btn btn-primary text-sm">Trilha: {t.title.split(" · ")[1]}</Link>)}
            </div>
          </article>
        ))}
      </div>
      <section>
        <h2 className="mb-2 text-xl font-bold">Trilhas internas disponíveis</h2>
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {TRACKS.map((t) => (
            <li key={t.id} className="card-surface p-3">
              <Link to="/trilhas/$id" params={{id:t.id}} className="font-semibold text-primary hover:underline">{t.title}</Link>
              <p className="text-sm text-muted-foreground">{t.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}