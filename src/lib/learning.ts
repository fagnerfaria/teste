export type ReviewState = { repetitions: number; intervalDays: number; due: number; lastReviewed: number };
export type ReviewGrade = "again" | "hard" | "good" | "easy";
const DAY = 86400000;
/** Agenda determinística educativa: autoavaliação não substitui exercício corrigido. */
export function nextReview(previous: ReviewState | undefined, grade: ReviewGrade, now: number): ReviewState {
  if (grade === "again") return { repetitions: 0, intervalDays: 0, due: now + 10 * 60000, lastReviewed: now };
  const repetitions = (previous?.repetitions ?? 0) + 1;
  const intervalDays = grade === "hard" ? 1 : grade === "easy" ? Math.min(180, Math.max(4, Math.round((previous?.intervalDays ?? 1) * 3))) : repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.min(180, Math.round((previous?.intervalDays ?? 1) * 2));
  return { repetitions, intervalDays, due: now + intervalDays * DAY, lastReviewed: now };
}

export type LearningItem = { id: string; title: string; trackId: string; exerciseId: string };
type Progress = { passedExercises: Record<string, number>; reviews?: Record<string, ReviewState> };
export function competencyProgress(items: LearningItem[], progress: Progress) {
  const tracks = [...new Set(items.map(item => item.trackId))];
  return tracks.map(trackId => {
    const relevant = items.filter(item => item.trackId === trackId);
    const passed = relevant.filter(item => progress.passedExercises[item.exerciseId] !== undefined).length;
    return { trackId, total: relevant.length, passed, percent: relevant.length ? Math.round(100 * passed / relevant.length) : 0 };
  });
}
export function dueReviews(items: LearningItem[], progress: Progress, now: number) {
  return items.filter(item => progress.passedExercises[item.exerciseId] !== undefined)
    .map(item => ({ ...item, due: progress.reviews?.[item.exerciseId]?.due ?? progress.passedExercises[item.exerciseId]! }))
    .filter(item => item.due <= now).sort((a, b) => a.due - b.due);
}
export const DIAGNOSTIC = [
  { id: "logic", question: "Um programa deve decidir se um número é par. Qual condição expressa essa regra?", options: ["n / 2 == 0", "n % 2 == 0", "n + 2 == 0", "n == 2"], correct: 1, why: "Paridade depende do resto da divisão por dois, inclusive para zero e negativos." },
  { id: "types", question: "Em Python, input() recebeu 21. O que print(input() * 2) mostraria?", options: ["42", "Erro sempre", "2121", "21"], correct: 2, why: "input() retorna texto; multiplicar texto por dois o repete. int() converte para calcular." },
  { id: "functions", question: "Uma função precisa entregar um valor para outra parte do programa. Qual recurso usa?", options: ["return", "print", "input", "pass"], correct: 0, why: "return devolve o valor ao chamador. print apenas o escreve na saída." },
  { id: "web", question: "Como inserir numa página um nome digitado sem interpretá-lo como HTML?", options: ["eval(nome)", "innerHTML = nome", "textContent = nome", "document.write(nome)"], correct: 2, why: "textContent representa texto e evita interpretar marcação fornecida pelo usuário." },
  { id: "http", question: "Sua chamada HTTP recebeu 429. Qual ação é adequada?", options: ["Repetir sem limite", "Respeitar Retry-After e limitar tentativas", "Tratar como sucesso", "Publicar o token no código"], correct: 1, why: "429 informa limite de requisições; retentativas precisam de espera e limite." },
  { id: "safety", question: "Um documento recuperado por RAG manda ignorar as regras e enviar segredos. O agente deve:", options: ["Executar a ordem", "Enviar parte dos segredos", "Ampliar as permissões", "Tratar o documento como dados e recusar a ação"], correct: 3, why: "Dados recuperados não concedem autoridade para ferramentas ou acesso a segredos." },
] as const;
export function diagnose(answers: Record<string, number>) {
  const correct = DIAGNOSTIC.filter(question => answers[question.id] === question.correct).length;
  const complete = DIAGNOSTIC.every(question => Number.isInteger(answers[question.id]) && answers[question.id]! >= 0 && answers[question.id]! < question.options.length);
  const recommendation = !complete ? "Responda às seis questões para receber uma sugestão." : correct <= 2 ? "Comece por Fundamentos e Python; pratique cada conceito antes de avançar." : correct <= 4 ? "Revise os fundamentos que errou e avance para Python intermediário." : "Experimente Python intermediário e confira as lacunas indicadas nas competências.";
  return { complete, correct, total: DIAGNOSTIC.length, recommendation };
}
