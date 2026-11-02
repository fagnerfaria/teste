import { createFileRoute, Link } from "@tanstack/react-router";
import { LESSONS } from "@/lib/content/lessons";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/aulas/")({
  head: () => ({
    meta: [
      { title: "Aulas de lógica e Python — CódigoLab" },
      { name: "description", content: "12 aulas autorais para iniciantes: print, variáveis, tipos, condicionais, laços, listas, funções e erros." },
      { property: "og:title", content: "Aulas de lógica e Python — CódigoLab" },
      { property: "og:description", content: "Percurso guiado com prática real." },
    ],
  }),
  component: Aulas,
});

function Aulas() {
  const d = useData();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Aulas</h1>
      <p className="text-muted-foreground">Cada aula tem objetivos, explicação, exemplos executáveis e um exercício. A aula só é concluída depois que você resolve o exercício.</p>
      <ol className="space-y-2">
        {LESSONS.map((l, i) => (
          <li key={l.id}>
            <Link to="/aulas/$id" params={{ id: l.id }} className="card-surface flex items-center gap-3 p-3 hover:border-primary">
              <span className={`grid size-9 shrink-0 place-items-center rounded-full font-bold ${d.completedLessons[l.id] ? "bg-success text-success-foreground" : "bg-muted"}`}>{d.completedLessons[l.id] ? "✔" : i + 1}</span>
              <span className="flex-1"><span className="font-semibold">{l.title}</span><br /><span className="text-xs text-muted-foreground">Semana {l.week}{d.openedLessons[l.id] && !d.completedLessons[l.id] ? " · em andamento" : ""}</span></span>
              <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}