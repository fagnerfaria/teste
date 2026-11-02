import { describe, expect, it } from "vitest";
import { defaultData, validateBackup } from "../lib/store";

describe("importação de backup confiável", () => {
  it("rejeita valores nulos ou arrays onde se espera um mapa", () => {
    const valid = defaultData();
    expect(validateBackup({ ...valid, drafts: null })).toBe(false);
    expect(validateBackup({ ...valid, completedLessons: [] })).toBe(false);
    expect(validateBackup({ ...valid, passedExercises: null })).toBe(false);
  });
  it("rejeita histórico ou configuração corrompidos", () => {
    const valid = defaultData();
    expect(validateBackup({ ...valid, attempts: {} })).toBe(false);
    expect(validateBackup({ ...valid, timeoutMs: -1 })).toBe(false);
    expect(validateBackup({ ...valid, theme: "corrompido" })).toBe(false);
  });
  it("preserva compatibilidade com o backup íntegro atual", () => {
    expect(validateBackup(defaultData())).toBe(true);
  });
});
