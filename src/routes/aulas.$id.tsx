import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { LESSONS, lessonById } from "@/lib/content/lessons";
import { exerciseById } from "@/lib/content/exercises";
import { update, useData } from "@/lib/store";
import { ExampleBlock } from "@/components/ExampleBlock";
import { ExerciseRunner } from "@/components/ExerciseRunner";

export const Route = createFileRoute("/aulas/$id")({
  loader: ({ params }) => {
    const lesson = lessonById(params.id);
    if (!lesson) throw notFound();
    return { title: lesson.title };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Aula"} — CódigoLab` },
      { name: "description", content: `Aula para iniciantes: ${loaderData?.title ?? ""}, com exemplos executáveis e exercício.` },
      { property: "og:title", content: `${loaderData?.title ?? "Aula"} — CódigoLab` },
      { property: "og:description", content: "Explicação simples, prática real e solução comentada." },
    ],
  }),
  component: Aula,
});

function Aula() {
  const { id } = Route.useParams();
  const lesson = lessonById(id)!;
  const ex = exerciseById(lesson.exerciseId)!;
  const d = useData();
  const idx = LESSONS.findIndex((l) => l.id === id);
  const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
  const passed = !!d.passedExercises[ex.id];
  const done = !!d.completedLessons[id];

  useEffect(() => {
    update((x) => ({ ...x, lastLesson: id, openedLessons: x.openedLessons[id] ? x.openedLessons : { ...x.openedLessons, [id]: Date.now() } }));
  }, [id]);

  return (
    <article className="space-y-5">
      <Link to="/aulas" className="text-sm text-primary">← Todas as aulas</Link>
      <header>
        <p className="text-sm font-semibold text-muted-foreground">Aula {idx + 1} · Semana {lesson.week}</p>
        <h1 className="text-3xl font-extrabold">{lesson.title}</h1>
      </header>
      <section className="card-surface p-4">
        <h2 className="font-bold">Objetivos</h2>
        <ul className="ml-5 list-disc text-sm">{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
      </section>
      <section className="space-y-3 leading-relaxed">{lesson.explanation.map((p, i) => <p key={i}>{p}</p>)}</section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Exemplos (execute e modifique)</h2>
        {lesson.examples.map((e) => <ExampleBlock key={e.title} title={e.title} code={e.code} />)}
      </section>
      <p className="rounded-md border-l-4 border-accent bg-accent/15 p-3 text-sm"><strong>Dica:</strong> {lesson.tip}</p>
      <section className="space-y-2">
        <h2 className="text-xl font-bold">Exercício: {ex.title}</h2>
        <ExerciseRunner ex={ex} />
      </section>
      <section className="card-surface flex flex-wrap items-center gap-3 p-4">
        {done ? <p className="font-bold text-success">✔ Aula concluída</p> : (
          <>
            <button className="btn btn-primary" disabled={!passed} onClick={() => update((x) => ({ ...x, completedLessons: { ...x.completedLessons, [id]: Date.now() } }))}>Marcar aula como concluída</button>
            {!passed && <span className="text-sm text-muted-foreground">Resolva o exercício acima para liberar.</span>}
          </>
        )}
      </section>
      <nav className="flex justify-between gap-2">
        {prev ? <Link to="/aulas/$id" params={{ id: prev.id }} className="btn btn-ghost">← {prev.title}</Link> : <span />}
        {next && <Link to="/aulas/$id" params={{ id: next.id }} className="btn btn-ghost">{next.title} →</Link>}
      </nav>
    </article>
  );
}