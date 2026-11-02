import { describe, expect, it } from "vitest";
import { TRACKS, UNITS, PROJECTS, unitsForTrack, unitById } from "../lib/content/tracks";
import { LESSONS } from "../lib/content/lessons";

describe("Percursos progressivos CódigoLab", () => {
  it("oferece seis trilhas, incluindo os 12 fundamentos existentes", () => {
    expect(TRACKS.map(t=>t.id)).toEqual(["fundamentos","python-pro","web","engenharia","automacao","ia-agentes"]);
    expect(LESSONS).toHaveLength(12);
    expect(unitsForTrack("fundamentos")).toHaveLength(0);
    for (const t of TRACKS.filter(t=>t.id!=="fundamentos")) expect(unitsForTrack(t.id).length).toBeGreaterThanOrEqual(8);
  });
  it("não duplica identificadores nem referencia trilhas inexistentes", () => {
    expect(UNITS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(UNITS.map(u=>u.id)).size).toBe(UNITS.length);
    for(const unit of UNITS){
      expect(TRACKS.some(t=>t.id===unit.trackId)).toBe(true);
      expect(unitById(unit.id)).toEqual(unit);
      expect(unit.objectives.length).toBeGreaterThanOrEqual(2);
      expect(unit.explanation.length).toBeGreaterThanOrEqual(2);
      expect(unit.example.code.length).toBeGreaterThan(10);
    }
  });
  it("só oferece execução real a Python e JavaScript, ou prévia HTML",()=>{
    for (const unit of UNITS) {
      if (unit.challenge.kind==="code"){
        expect(["python","javascript"]).toContain(unit.example.lang);
        expect(unit.challenge.expected).toBeDefined();
        expect(unit.challenge.solution).toBeTruthy();
      } else {
        expect(unit.challenge.kind).toBe("quiz");
        expect(unit.challenge.options).toHaveLength(4);
        expect(unit.challenge.correctIndex).toBeGreaterThanOrEqual(0);
        expect(unit.challenge.correctIndex).toBeLessThan(4);
      }
    }
  });
  it("disponibiliza projetos finais com aceitação definida",()=>{
    expect(PROJECTS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(PROJECTS.map(p=>p.id)).size).toBe(PROJECTS.length);
    for(const p of PROJECTS){
      expect(p.steps.length).toBeGreaterThanOrEqual(4);
      expect(p.acceptance.length).toBeGreaterThanOrEqual(3);
      expect(TRACKS.some(t=>t.id===p.trackId)).toBe(true);
      expect(p.starter).toBeTruthy();
    }
  });
});