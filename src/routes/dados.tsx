import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { getData, replaceAll, resetAll, useData, validateBackup } from "@/lib/store";
import { ProgressSync } from "@/components/ProgressSync";

export const Route = createFileRoute("/dados")({
  head: () => ({
    meta: [
      { title: "Meus dados e backup — CódigoLab" },
      { name: "description", content: "Exporte, importe ou apague seu progresso salvo localmente." },
      { property: "og:title", content: "Meus dados — CódigoLab" },
      { property: "og:description", content: "Backup JSON do seu progresso local." },
    ],
  }),
  component: Dados,
});

function Dados() {
  const d = useData();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const exportar = () => {
    const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `codigolab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Backup exportado.");
  };
  const importar = async (f: File) => {
    let json: unknown;
    try {
      if (f.size > 8 * 1024 * 1024) throw new Error();
      json = JSON.parse(await f.text());
      if (!validateBackup(json)) throw new Error();
    } catch { setMsg("Arquivo inválido: não é um backup do CódigoLab ou excede o limite de 8 MiB."); return; }
    if (!confirm("Substituir os dados atuais pelo backup?")) return;
    try { replaceAll(json); setMsg("Backup importado com sucesso. Dados salvos neste navegador."); }
    catch (error) { setMsg(error instanceof Error ? error.message : "Não foi possível salvar o backup. O progresso local foi preservado."); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Meus dados</h1>
      <p className="rounded-md border-l-4 border-warning bg-warning/10 p-3 text-sm">
        Seu progresso fica salvo neste navegador (localStorage). A sincronização privada abaixo é opcional e exige enviar e baixar os dados. Limpar os dados do navegador apaga sua cópia local; exporte backups regularmente.
      </p>
      <div className="card-surface grid grid-cols-2 gap-2 p-4 text-sm sm:grid-cols-4">
        <div><strong className="text-xl">{Object.keys(d.completedLessons).length}</strong><br />aulas concluídas</div>
        <div><strong className="text-xl">{Object.keys(d.passedExercises).length}</strong><br />exercícios resolvidos</div>
        <div><strong className="text-xl">{d.attempts.length}</strong><br />tentativas</div>
        <div><strong className="text-xl">{Object.keys(d.drafts).length}</strong><br />rascunhos</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={exportar}>Exportar backup (JSON)</button>
        <button className="btn btn-ghost" onClick={() => file.current?.click()}>Importar backup</button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" aria-label="Arquivo de backup" onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ""; }} />
        <button className="btn btn-danger" onClick={() => {
          if (!confirm("Apagar o progresso, rascunhos e histórico de tentativas deste navegador? Isso não pode ser desfeito. O histórico Git e os bancos dos laboratórios têm controles próprios.")) return;
          try { resetAll(); setMsg("Progresso e rascunhos locais apagados."); }
          catch (error) { setMsg(error instanceof Error ? error.message : "Não foi possível apagar os dados locais."); }
        }}>Apagar progresso e rascunhos</button>
      </div>
      {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
      <ProgressSync />
    </div>
  );
}
