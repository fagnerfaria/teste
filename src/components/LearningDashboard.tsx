import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LESSONS } from "@/lib/content/lessons";
import { TRACKS, UNITS } from "@/lib/content/tracks";
import { competencyProgress, diagnose, DIAGNOSTIC, dueReviews, type ReviewGrade } from "@/lib/learning";
import { recordReview, saveDiagnostic, useData } from "@/lib/store";

const items = [
  ...LESSONS.map(lesson => ({ id: lesson.id, title: lesson.title, trackId: "fundamentos", exerciseId: lesson.exerciseId })),
  ...UNITS.map(unit => ({ id: unit.id, title: unit.title, trackId: unit.trackId, exerciseId: `${unit.challenge.kind === "code" ? "unit:" : "quiz:"}${unit.id}` })),
];
const GRADES: { value: ReviewGrade; label: string }[] = [{ value: "again", label: "Não lembrei · 10 min" }, { value: "hard", label: "Com dificuldade · amanhã" }, { value: "good", label: "Lembrei" }, { value: "easy", label: "Expliquei com facilidade" }];

export function LearningDashboard() {
  const data = useData();
  const [answers, setAnswers] = useState<Record<string, number>>(() => data.diagnostic?.answers ?? {});
  const [submitted, setSubmitted] = useState(!!data.diagnostic);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const diagnostic = diagnose(answers);
  const due = dueReviews(items, data, now);
  return <div className="space-y-5">
    <section className="card-surface space-y-3 p-4" aria-labelledby="diagnostico-title">
      <h2 id="diagnostico-title" className="text-xl font-bold">Diagnóstico inicial</h2>
      <p className="text-sm text-muted-foreground">Seis situações para sugerir um ponto de partida. Não aprova aulas nem substitui a prática; você pode refazer quando quiser.</p>
      <details open={!submitted}>
        <summary className="cursor-pointer font-semibold">{submitted ? "Rever ou refazer as perguntas" : "Responder às seis perguntas"}</summary>
        <div className="mt-3 space-y-4">
          {DIAGNOSTIC.map((question, index) => <fieldset key={question.id} className="space-y-1 rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">{index + 1}. {question.question}</legend>
            {question.options.map((option, answer) => <label key={answer} className="flex cursor-pointer items-start gap-2 rounded p-2 text-sm hover:bg-muted">
              <input type="radio" name={`diagnostic-${question.id}`} checked={answers[question.id] === answer} onChange={() => { setAnswers(previous => ({ ...previous, [question.id]: answer })); setSubmitted(false); }} className="mt-1" />{option}
            </label>)}
            {submitted && <p className="rounded bg-muted p-2 text-sm">{answers[question.id] === question.correct ? "Correto. " : "Vale revisar. "}{question.why}</p>}
          </fieldset>)}
          <button className="btn btn-primary" disabled={!diagnostic.complete} onClick={() => { saveDiagnostic(answers); setSubmitted(true); }}>Ver meu diagnóstico</button>
        </div>
      </details>
      {submitted && <div role="status" className="rounded bg-accent/20 p-3"><p className="font-semibold">{diagnostic.correct} de {diagnostic.total} respostas corretas</p><p className="text-sm">{diagnostic.recommendation}</p></div>}
    </section>
    <section className="card-surface space-y-3 p-4" aria-labelledby="competencias-title">
      <h2 id="competencias-title" className="text-xl font-bold">Competências em prática</h2>
      <p className="text-sm text-muted-foreground">Atividades aprovadas por trilha. O percentual mede cobertura dos exercícios, não domínio profissional.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {competencyProgress(items, data).map(competency => <li key={competency.trackId} className="rounded border p-3">
          <Link to="/trilhas/$id" params={{ id: competency.trackId }} className="text-sm font-semibold text-primary">{TRACKS.find(track => track.id === competency.trackId)?.title ?? competency.trackId}</Link>
          <p className="mt-1 text-sm">{competency.passed}/{competency.total} atividades · {competency.percent}%</p>
          <progress className="mt-2 h-2 w-full accent-primary" max={competency.total} value={competency.passed} aria-label={`Progresso em ${competency.trackId}`} />
        </li>)}
      </ul>
    </section>
    <section className="card-surface space-y-3 p-4" aria-labelledby="revisoes-title">
      <h2 id="revisoes-title" className="text-xl font-bold">Revisão espaçada</h2>
      <p className="text-sm text-muted-foreground">Depois da primeira aprovação, revise amanhã e em intervalos crescentes. Tente lembrar antes de consultar. A autoavaliação agenda a próxima revisão e não altera a aprovação.</p>
      {!due.length ? <p className="text-sm">Nenhuma revisão vencida. Resolva uma atividade para começar sua agenda.</p> : <>
        <p className="font-semibold">{due.length} revisão(ões) para agora</p>
        {due.slice(0, 5).map(item => {
          const lesson = LESSONS.find(lesson => lesson.id === item.id), unit = UNITS.find(unit => unit.id === item.id);
          return <div key={item.id} className="space-y-2 rounded-lg border p-3">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm">Sem olhar, explique o conceito e crie um pequeno exemplo. O que costuma causar erro?</p>
            {lesson ? <Link to="/aulas/$id" params={{ id: item.id }} className="text-sm text-primary underline">Refazer a aula e seu exercício</Link> : <Link to="/estudar/$id" params={{ id: item.id }} className="text-sm text-primary underline">Refazer a atividade corrigida</Link>}
            {revealed !== item.id ? <div><button className="btn btn-ghost text-sm" onClick={() => setRevealed(item.id)}>Lembrar o ponto principal</button></div> : <>
              <p className="rounded bg-muted p-2 text-sm">{lesson?.tip ?? (unit?.challenge.kind === "quiz" ? unit.challenge.explanation : unit?.challenge.hint)}</p>
              <div className="flex flex-wrap gap-2">{GRADES.map(grade => <button key={grade.value} className="btn btn-ghost text-xs" onClick={() => { recordReview(item.exerciseId, grade.value); setRevealed(null); }}>{grade.label}</button>)}</div>
            </>}
          </div>;
        })}
      </>}
    </section>
  </div>;
}
