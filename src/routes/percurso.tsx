import { createFileRoute, Link } from "@tanstack/react-router";
import { LESSONS } from "@/lib/content/lessons";
import { update, useData } from "@/lib/store";
import { LearningDashboard } from "@/components/LearningDashboard";

const WEEKS = [
  { n: 1, goal: "Entender o que é programar e usar print()", tasks: ["Instalei nada: só abri o laboratório e rodei Olá mundo", "Modifiquei um exemplo e previ a saída antes de executar"] },
  { n: 2, goal: "Variáveis e tipos", tasks: ["Usei a simulação passo a passo de variáveis", "Provoquei um TypeError de propósito e entendi a mensagem"] },
  { n: 3, goal: "Operadores e decisões", tasks: ["Escrevi um if/elif/else próprio", "Revisei = vs =="] },
  { n: 4, goal: "Repetição", tasks: ["Interrompi um laço infinito no laboratório", "Fiz uma tabuada com for"] },
  { n: 5, goal: "Listas e dicionários", tasks: ["Montei uma lista de compras com append", "Criei um dicionário de contatos"] },
  { n: 6, goal: "Funções", tasks: ["Transformei um código repetido em função", "Expliquei para mim mesmo a diferença entre print e return"] },
  { n: 7, goal: "Arquivos e erros", tasks: ["Li um traceback de baixo para cima", "Usei try/except para um erro esperado"] },
  { n: 8, goal: "Revisão e mini projeto", tasks: ["Resolvi os desafios de nível 3", "Criei um pequeno programa meu (ex.: calculadora de gastos)", "Escolhi o próximo curso no catálogo"] },
];

export const Route = createFileRoute("/percurso")({
  head: () => ({
    meta: [
      { title: "Meu percurso de 8 semanas — CódigoLab" },
      { name: "description", content: "Roteiro didático de 8 semanas com checklists e progresso real." },
      { property: "og:title", content: "Meu percurso — CódigoLab" },
      { property: "og:description", content: "8 semanas de estudo guiado de lógica e Python." },
    ],
  }),
  component: Percurso,
});

function Percurso() {
  const d = useData();
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Meu percurso</h1>
      <LearningDashboard />
      <h2 className="text-xl font-bold">Roteiro inicial de oito semanas</h2>
      <p className="text-muted-foreground">Uma ordem didática sugerida para 8 semanas. Ninguém domina programação automaticamente em 8 semanas — o objetivo é construir uma base sólida com prática constante.</p>
      <div className="card-surface grid grid-cols-3 gap-2 p-3 text-center text-sm">
        <div><div className="text-2xl font-extrabold text-primary">15 min</div>aula</div>
        <div><div className="text-2xl font-extrabold text-primary">20 min</div>prática</div>
        <div><div className="text-2xl font-extrabold text-primary">5 min</div>revisão</div>
      </div>
      <ol className="space-y-3">
        {WEEKS.map((w) => {
          const lessons = LESSONS.filter((l) => l.week === w.n);
          const doneL = lessons.filter((l) => d.completedLessons[l.id]).length;
          const doneT = w.tasks.filter((_, i) => d.checklist[`w${w.n}-${i}`]).length;
          const total = lessons.length + w.tasks.length, sum = doneL + doneT;
          return (
            <li key={w.n} className="card-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">Semana {w.n}: {w.goal}</h2>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${sum === total ? "bg-success text-success-foreground" : "bg-muted"}`}>{sum}/{total}</span>
              </div>
              {lessons.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {lessons.map((l) => <li key={l.id}><Link to="/aulas/$id" params={{ id: l.id }} className="hover:underline">{d.completedLessons[l.id] ? "✔" : "○"} Aula: {l.title}</Link></li>)}
                </ul>
              )}
              <ul className="mt-2 space-y-1 text-sm">
                {w.tasks.map((t, i) => {
                  const k = `w${w.n}-${i}`;
                  return (
                    <li key={k}>
                      <label className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1 size-4 accent-primary" checked={!!d.checklist[k]} onChange={(e) => update((x) => ({ ...x, checklist: { ...x.checklist, [k]: e.target.checked } }))} />
                        {t}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
