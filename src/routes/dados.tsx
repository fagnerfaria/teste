import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { getData, replaceAll, resetAll, useData, validateBackup } from "@/lib/store";

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
    try {
      const json = JSON.parse(await f.text());
      if (!validateBackup(json)) throw new Error();
      if (confirm("Substituir os dados atuais pelo backup?")) { replaceAll(json); setMsg("Backup importado com sucesso."); }
    } catch { setMsg("Arquivo inválido: não é um backup do CódigoLab."); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Meus dados</h1>
      <p className="rounded-md border-l-4 border-warning bg-warning/10 p-3 text-sm">
        Tudo fica salvo apenas neste navegador (localStorage). <strong>Não há sincronização entre dispositivos</strong> nem conta. Limpar os dados do navegador apaga seu progresso — exporte backups regularmente.
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
        <button className="btn btn-danger" onClick={() => { if (confirm("Apagar TODO o progresso, rascunhos e histórico? Isso não pode ser desfeito.")) { resetAll(); setMsg("Dados apagados."); } }}>Apagar todos os dados</button>
      </div>
      {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
      <p className="text-xs text-muted-foreground">Evolução futura possível: login opcional e sincronização na nuvem. Não é necessário para usar o app.</p>
    </div>
  );
}