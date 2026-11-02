import { useSyncExternalStore } from "react";

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
};

const KEY = "codigolab:v1";
export const defaultData = (): AppData => ({
  version: 1, completedLessons: {}, passedExercises: {}, openedLessons: {}, attempts: [],
  drafts: {}, checklist: {}, timeoutMs: 5000, theme: "light",
});
const SERVER = defaultData();
let data: AppData = SERVER;
let loaded = false;
const ls = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { ...defaultData(), ...JSON.parse(raw) };
  } catch { /* dados corrompidos: usa padrão */ }
}

export function getData() { load(); return data; }
export function update(fn: (d: AppData) => AppData) {
  load();
  data = fn(data);
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* cota cheia */ }
  ls.forEach((l) => l());
}
export function replaceAll(d: AppData) { update(() => ({ ...defaultData(), ...d })); }
export function resetAll() { update(() => defaultData()); }

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
  return true;
}

export const saveDraft = (key: string, code: string) => update((d) => ({ ...d, drafts: { ...d.drafts, [key]: code } }));
export const recordAttempt = (exerciseId: string, ok: boolean) =>
  update((d) => ({
    ...d,
    attempts: [{ exerciseId, ok, ts: Date.now() }, ...d.attempts].slice(0, 50),
    passedExercises: ok && !d.passedExercises[exerciseId] ? { ...d.passedExercises, [exerciseId]: Date.now() } : d.passedExercises,
  }));