import { createFileRoute, Link } from "@tanstack/react-router";
import { useData } from "@/lib/store";
import { LESSONS, lessonById } from "@/lib/content/lessons";
import { EXERCISES, exerciseById } from "@/lib/content/exercises";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CódigoLab — academia pessoal de programação" },
      { name: "description", content: "Continue estudando programação do zero: aulas em português, laboratório real de Python e JS, exercícios corrigidos." },
      { property: "og:title", content: "CódigoLab — academia pessoal de programação" },
      { property: "og:description", content: "Aulas, laboratório real e exercícios corrigidos, sem cadastro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const d = useData();
  const baseDone = LESSONS.filter((l) => !!d.completedLessons[l.id]).length;
  const advancedDone = Object.keys(d.completedLessons).filter(k => k.startsWith("unit:")).length;
  const passed = Object.keys(d.passedExercises).length;
  const next = LESSONS.find((l) => !d.completedLessons[l.id]) ?? LESSONS[LESSONS.length - 1];
  const current = (d.lastLesson && lessonById(d.lastLesson) && !d.completedLessons[d.lastLesson] ? lessonById(d.lastLesson) : next)!;
  const pct = Math.min(100,Math.round((baseDone / LESSONS.length) * 100));

  return (
    <div className="space-y-6">
      <section className="card-surface overflow-hidden p-5 md:p-7">
        <p className="text-sm font-semibold text-primary">Percurso guiado · Lógica e Python</p>
        <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Continuar estudando</h1>
        <p className="mt-2 text-muted-foreground">Próxima aula: <strong className="text-foreground">{current.title}</strong> (semana {current.week})</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do curso inicial de Python">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{baseDone} de {LESSONS.length} aulas introdutórias concluídas · {advancedDone} unidades avançadas · {passed} exercícios aprovados</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/aulas/$id" params={{ id: current.id }} className="btn btn-primary">Estudar “{current.title}”</Link>
          <Link to="/lab" className="btn btn-accent text-base">▶ Abrir laboratório</Link>
        </div>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-xl font-bold">Do zero aos seus próprios programas e agentes de IA</h2>
        <p className="text-sm">O percurso ampliado reúne as 12 aulas iniciais, 40 unidades de aprofundamento em cinco trilhas e seis projetos orientados. Os materiais externos continuam como fontes adicionais.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/trilhas" className="btn btn-primary">Explorar seis trilhas →</Link>
          <Link to="/projetos" className="btn btn-ghost">Ver projetos práticos →</Link>
          <Link to="/workspace" className="btn btn-accent">Abrir editor com múltiplos arquivos →</Link>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card-surface p-4">
          <h2 className="text-lg font-bold">Curso atual</h2>
          <p className="text-sm text-muted-foreground">Aulas autorais do CódigoLab, inspiradas no roteiro de “30 Dias de Python”.</p>
          <ol className="mt-3 space-y-1 text-sm">
            {LESSONS.slice(0, 6).map((l) => (
              <li key={l.id}><Link to="/aulas/$id" params={{ id: l.id }} className="hover:underline">{d.completedLessons[l.id] ? "✔" : "○"} {l.title}</Link></li>
            ))}
          </ol>
          <Link to="/aulas" className="mt-2 inline-block text-sm font-semibold text-primary">Ver todas as aulas →</Link>
        </section>
        <section className="card-surface p-4">
          <h2 className="text-lg font-bold">Últimos exercícios</h2>
          {d.attempts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma tentativa ainda. <Link to="/exercicios" className="font-semibold text-primary">Comece pelo nível 1 →</Link></p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {d.attempts.slice(0, 6).map((a, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <Link to="/exercicios/$id" params={{ id: a.exerciseId }} className="hover:underline">{a.ok ? "✔" : "✖"} {exerciseById(a.exerciseId)?.title}</Link>
                  <span className="text-muted-foreground">{new Date(a.ts).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="text-xs text-muted-foreground">Seu progresso fica salvo só neste navegador/dispositivo. Faça backup em <Link to="/dados" className="underline">Meus dados</Link>.</p>
    </div>
  );
}