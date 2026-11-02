import { useSyncExternalStore } from "react";
import { DIAGNOSTIC, nextReview, type ReviewGrade, type ReviewState } from "./learning";

export type Attempt = { exerciseId: string; ok: boolean; ts: number };
export type AppData = {
  version: 1;
  completedLessons: Record<string, number>;
  passedExercises: Record<string, number>;
  openedLessons: Record<string, number>;
  attempts: Attempt[];
  drafts: Record<string, string>;
  checklist: Record<string, boolean>;
  lastLesson?: string;
  timeoutMs: number;
  theme: "light" | "dark";
  reviews?: Record<string, ReviewState>;
  diagnostic?: { answers: Record<string, number>; completedAt: number };
};

const KEY = "codigolab:v1";
export const defaultData = (): AppData => ({
  version: 1, completedLessons: {}, passedExercises: {}, openedLessons: {}, attempts: [],
  drafts: {}, checklist: {}, timeoutMs: 5000, theme: "light", reviews: {},
});
const SERVER = defaultData();
let data: AppData = SERVER;
let loaded = false;
let persistenceError = "";
const ls = new Set<() => void>();
const notify = () => ls.forEach(listener => listener());

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (validateBackup(parsed)) data = { ...defaultData(), ...parsed };
    }
  } catch { persistenceError = "Não foi possível ler os dados deste navegador. Confira as permissões de armazenamento e mantenha um backup."; }
  window.addEventListener("storage", event => {
    if (event.key !== KEY) return;
    try {
      const value: unknown = event.newValue ? JSON.parse(event.newValue) : defaultData();
      if (validateBackup(value)) { data = { ...defaultData(), ...value }; ls.forEach(listener => listener()); }
    } catch { /* ignora alterações corrompidas de outra aba */ }
  });
}

export function getData() { load(); return data; }
export function update(fn: (d: AppData) => AppData) {
  load();
  data = fn(data);
  try { localStorage.setItem(KEY, JSON.stringify(data)); persistenceError = ""; }
  catch { persistenceError = "O navegador não conseguiu salvar as últimas alterações. Elas estão apenas nesta aba; exporte um backup antes de sair e libere espaço no navegador."; }
  notify();
}
/** Importação e sincronização só substituem a memória após escrita persistente confirmada. */
export function replaceAll(d: AppData) {
  load();
  if (!validateBackup(d)) throw new Error("O backup não passou na validação. Seu progresso local não foi substituído.");
  const next = { ...defaultData(), ...d };
  try { localStorage.setItem(KEY, JSON.stringify(next)); }
  catch { persistenceError = "Não foi possível salvar a cópia recebida. O progresso local não foi substituído; libere espaço ou permita o armazenamento e tente novamente."; notify(); throw new Error(persistenceError); }
  data = next; persistenceError = ""; notify();
}
export function resetAll() {
  load();
  try { localStorage.removeItem(KEY); }
  catch { persistenceError = "Não foi possível apagar o progresso salvo. Confira as permissões de armazenamento do navegador e tente novamente."; notify(); throw new Error(persistenceError); }
  data = defaultData(); persistenceError = ""; notify();
}
export function getPersistenceError() { return persistenceError; }
export function usePersistenceError() {
  return useSyncExternalStore(listener => { ls.add(listener); return () => { ls.delete(listener); }; }, getPersistenceError, () => "");
}

export function useData() {
  return useSyncExternalStore(
    (l) => { ls.add(l); return () => { ls.delete(l); }; },
    getData,
    () => SERVER,
  );
}

/** Valida a estrutura completa antes de substituir o progresso local. */
const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

const finiteNonnegative = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

function validEntries(v: unknown, check: (item: unknown) => boolean): boolean {
  return isRecord(v) &&
    Object.keys(v).length <= 10000 &&
    !Object.keys(v).some(key => ["__proto__", "prototype", "constructor"].includes(key)) &&
    Object.values(v).every(check);
}

export function validateBackup(x: unknown): x is AppData {
  if (!isRecord(x) || x["version"] !== 1) return false;
  if (!validEntries(x["completedLessons"], finiteNonnegative)) return false;
  if (!validEntries(x["openedLessons"], finiteNonnegative)) return false;
  if (!validEntries(x["passedExercises"], finiteNonnegative)) return false;
  if (!validEntries(x["drafts"], (v) => typeof v === "string" && v.length <= 200000)) return false;
  if (!validEntries(x["checklist"], (v) => typeof v === "boolean")) return false;
  if (!Array.isArray(x["attempts"]) || x["attempts"].length > 10000 ||
      !x["attempts"].every((a: unknown) =>
        isRecord(a) && typeof a["exerciseId"] === "string" &&
        typeof a["ok"] === "boolean" && finiteNonnegative(a["ts"]))) return false;
  if (typeof x["timeoutMs"] !== "number" || ![2000, 5000, 10000, 30000].includes(x["timeoutMs"])) return false;
  if (x["theme"] !== "light" && x["theme"] !== "dark") return false;
  if (x["lastLesson"] !== undefined && typeof x["lastLesson"] !== "string") return false;
  if (x["reviews"] !== undefined && !validEntries(x["reviews"], review =>
    isRecord(review) && Number.isInteger(review["repetitions"]) && finiteNonnegative(review["repetitions"]) &&
    finiteNonnegative(review["intervalDays"]) && finiteNonnegative(review["due"]) && finiteNonnegative(review["lastReviewed"]))) return false;
  if (x["diagnostic"] !== undefined) {
    const diagnostic = x["diagnostic"];
    if (!isRecord(diagnostic) || !finiteNonnegative(diagnostic["completedAt"]) || !validEntries(diagnostic["answers"], answer => typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < 4)) return false;
    if (!Object.keys(diagnostic["answers"] as object).every(key => DIAGNOSTIC.some(question => question.id === key))) return false;
    if (!DIAGNOSTIC.every(question => Object.hasOwn(diagnostic["answers"] as object, question.id))) return false;
  }
  return true;
}

export const saveDraft = (key: string, code: string) => update((d) => ({ ...d, drafts: { ...d.drafts, [key]: code } }));
export const recordAttempt = (exerciseId: string, ok: boolean) =>
  update((d) => ({
    ...d,
    attempts: [{ exerciseId, ok, ts: Date.now() }, ...d.attempts].slice(0, 50),
    passedExercises: ok && !d.passedExercises[exerciseId] ? { ...d.passedExercises, [exerciseId]: Date.now() } : d.passedExercises,
    reviews: ok && !d.reviews?.[exerciseId] ? { ...d.reviews, [exerciseId]: nextReview(undefined, "good", Date.now()) } : d.reviews ?? {},
  }));

export const recordReview = (exerciseId: string, grade: ReviewGrade) => update(d => ({ ...d, reviews: { ...d.reviews, [exerciseId]: nextReview(d.reviews?.[exerciseId], grade, Date.now()) } }));
export const saveDiagnostic = (answers: Record<string, number>) => update(d => ({ ...d, diagnostic: { answers, completedAt: Date.now() } }));
