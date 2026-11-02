import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { API_BACKEND_FILES, backendProjectArchive } from "../lib/api-project";

describe("Projeto backend exportado", () => {
  it("executa testes HTTP reais com Node e gera arquivo extraível", async () => {
    const folder = mkdtempSync(join(tmpdir(), "codigolab-api-"));
    try {
      for (const [name, content] of Object.entries(API_BACKEND_FILES)) writeFileSync(join(folder, name), content);
      const output = execFileSync(process.execPath, ["--test", "acceptance.test.ts"], { cwd: folder, encoding: "utf8", timeout: 20_000 });
      expect(output).toContain("pass 1");
      const archivePath = join(folder, "projeto.tar");
      writeFileSync(archivePath, Buffer.from(await backendProjectArchive().arrayBuffer()));
      expect(execFileSync("tar", ["-tf", archivePath], { encoding: "utf8" })).toContain("acceptance.test.ts");
    } finally { rmSync(folder, { recursive: true, force: true }); }
  }, 25_000);
});
