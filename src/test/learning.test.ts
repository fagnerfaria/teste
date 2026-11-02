import { describe, expect, it } from "vitest";
import { nextReview, competencyProgress, dueReviews, diagnose } from "../lib/learning";

describe("revisão espaçada baseada em respostas", () => {
  it("agenda a primeira revisão para o dia seguinte sem marcar domínio", () => {
    expect(nextReview(undefined, "good", 1000)).toEqual({ repetitions: 1, intervalDays: 1, due: 86401000, lastReviewed: 1000 });
  });
  it("refaz dificuldades em dez minutos e cresce intervalos após recuperação", () => {
    expect(nextReview({ repetitions: 3, intervalDays: 7, due: 0, lastReviewed: 0 }, "again", 1000)).toEqual({ repetitions: 0, intervalDays: 0, due: 601000, lastReviewed: 1000 });
    expect(nextReview({ repetitions: 1, intervalDays: 1, due: 0, lastReviewed: 0 }, "good", 1000).intervalDays).toBe(3);
  });
  it("conta somente atividades aprovadas e usa a revisão vencida mais antiga", () => {
    const items = [{ id: "a", title: "A", trackId: "python", exerciseId: "ex-a" }, { id: "b", title: "B", trackId: "python", exerciseId: "ex-b" }];
    const progress = { passedExercises: { "ex-a": 10 }, reviews: {} };
    expect(competencyProgress(items, progress)).toEqual([{ trackId: "python", total: 2, passed: 1, percent: 50 }]);
    expect(dueReviews(items, progress, 100)).toEqual([{ ...items[0], due: 10 }]);
  });
  it("um diagnóstico incompleto não atribui nível e um completo não aprova atividades", () => {
    expect(diagnose({})).toMatchObject({ complete: false, correct: 0 });
    expect(diagnose({ logic: 1, types: 2, functions: 0, web: 2, http: 1, safety: 3 })).toMatchObject({ complete: true, correct: 6, recommendation: "Experimente Python intermediário e confira as lacunas indicadas nas competências." });
  });
});
