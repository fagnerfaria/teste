import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { exerciseById } from "@/lib/content/exercises";
import { lessonById } from "@/lib/content/lessons";
import { ExerciseRunner } from "@/components/ExerciseRunner";

export const Route = createFileRoute("/exercicios/$id")({
  loader: ({ params }) => {
    const ex = exerciseById(params.id);
    if (!ex) throw notFound();
    return { title: ex.title };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Exercício"} — CódigoLab` },
      { name: "description", content: "Resolva o exercício e receba correção executando o código de verdade." },
      { property: "og:title", content: `${loaderData?.title ?? "Exercício"} — CódigoLab` },
      { property: "og:description", content: "Exercício de programação com correção real." },
    ],
  }),
  component: Ex,
});

function Ex() {
  const { id } = Route.useParams();
  const ex = exerciseById(id)!;
  const lesson = ex.lessonId ? lessonById(ex.lessonId) : undefined;
  return (
    <div className="space-y-4">
      <Link to="/exercicios" className="text-sm text-primary">← Exercícios</Link>
      <h1 className="text-3xl font-extrabold">{ex.title}</h1>
      {lesson && <p className="text-sm">Relacionado à aula <Link to="/aulas/$id" params={{ id: lesson.id }} className="font-semibold text-primary">{lesson.title}</Link></p>}
      <ExerciseRunner key={ex.id} ex={ex} />
    </div>
  );
}