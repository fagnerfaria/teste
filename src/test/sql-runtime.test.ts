import { describe, it, expect } from "vitest";
import { SQL_JS_VERSION, SQL_SEED, SQL_EXAMPLES, runSql } from "../lib/sql-runtime";
describe("Banco SQLite de demonstração",()=>{
 it("mantém o motor fixado em uma versão reprodutível e livre",()=>{
  expect(SQL_JS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
 });
 it("declara três tabelas e somente dados fictícios",()=>{
  for (const table of ["alunos","cursos","matriculas"])expect(SQL_SEED).toContain("CREATE TABLE "+table);
  expect(SQL_SEED).toContain("INSERT INTO alunos");
 });
 it("fornece exemplos de consulta, agregação e atualização",()=>{
  expect(SQL_EXAMPLES.length).toBeGreaterThanOrEqual(5);
  expect(SQL_EXAMPLES.some(x=>x.query.includes("JOIN"))).toBe(true);
  expect(SQL_EXAMPLES.some(x=>x.query.includes("GROUP BY"))).toBe(true);
  expect(SQL_EXAMPLES.some(x=>x.query.includes("UPDATE"))).toBe(true);
 });
 it("rejeita consultas vazias sem iniciar Worker",async()=>{
  const r=await runSql("");
  expect(r.status).toBe("error");
  expect(r.tables).toEqual([]);
 });
});
