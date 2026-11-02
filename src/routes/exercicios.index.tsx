import { createFileRoute, Link } from "@tanstack/react-router";
import { EXERCISES } from "@/lib/content/exercises";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/exercicios/")({
  head: () => ({
    meta: [
      { title: "Exercícios com correção real — CódigoLab" },
      { name: "description", content: "Desafios graduais de Python corrigidos executando seu código de verdade." },
      { property: "og:title", content: "Exercícios — CódigoLab" },
      { property: "og:description", content: "Desafios graduais com correção automática por saída." },
    ],
  }),
  component: Exercicios,
});

function Exercicios() {
  const d = useData();
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Exercícios</h1>
      <p className="text-muted-foreground">Seu código é executado de verdade e a saída é comparada com a esperada em um ou mais casos de teste.</p>
      {[1, 2, 3].map((lvl) => (
        <section key={lvl}>
          <h2 className="mb-2 text-lg font-bold">Nível {lvl} — {["", "Primeiros passos", "Decisões e repetição", "Desafios"][lvl]}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EXERCISES.filter((e) => e.level === lvl).map((e) => (
              <li key={e.id}>
                <Link to="/exercicios/$id" params={{ id: e.id }} className="card-surface flex items-center justify-between gap-2 p-3 hover:border-primary">
                  <span className="font-semibold">{e.title}</span>
                  <span className="text-sm">{d.passedExercises[e.id] ? "✔" : d.drafts[`ex:${e.id}`] ? "rascunho" : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}