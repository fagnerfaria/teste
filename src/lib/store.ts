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

export function validateBackup(x: unknown): x is AppData {
  return !!x && typeof x === "object" && (x as AppData).version === 1 &&
    typeof (x as AppData).completedLessons === "object" && typeof (x as AppData).drafts === "object";
}

export const saveDraft = (key: string, code: string) => update((d) => ({ ...d, drafts: { ...d.drafts, [key]: code } }));
export const recordAttempt = (exerciseId: string, ok: boolean) =>
  update((d) => ({
    ...d,
    attempts: [{ exerciseId, ok, ts: Date.now() }, ...d.attempts].slice(0, 50),
    passedExercises: ok && !d.passedExercises[exerciseId] ? { ...d.passedExercises, [exerciseId]: Date.now() } : d.passedExercises,
  }));