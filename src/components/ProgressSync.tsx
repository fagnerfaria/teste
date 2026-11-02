import { useEffect, useState } from "react";
import { createSyncCode, deleteRemoteProgress, pullProgress, pushProgress, syncAvailable } from "@/lib/progress-sync";
import { getData, replaceAll, type AppData } from "@/lib/store";

export function ProgressSync() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [revision, setRevision] = useState<number | null>(null);
  const [hasRemote, setHasRemote] = useState(false);
  const [pending, setPending] = useState<AppData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { let active = true; syncAvailable().then(ok => { if (active) setAvailable(ok); }); return () => { active = false; }; }, []);
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "A sincronização falhou; os dados locais foram preservados."); }
    finally { setBusy(false); }
  };
  return <section className="card-surface space-y-3 p-4" aria-labelledby="sync-title">
    <h2 id="sync-title" className="text-xl font-bold">Sincronização entre aparelhos</h2>
    <p className="text-sm">Sincronize progresso, revisões, diagnóstico, rascunhos de aulas e projetos salvos no editor. A transferência é manual pelos botões abaixo e usa criptografia AES-GCM no aparelho. O histórico Git e os bancos dos laboratórios têm armazenamento próprio e não entram nesta cópia.</p>
    <p className="text-sm text-muted-foreground">O código é a chave de acesso e de descriptografia. Copie-o para seu outro aparelho e guarde-o em local privado. Sem ele, a cópia remota não pode ser recuperada. O código não é colocado em URLs nem salvo neste navegador.</p>
    {available === null ? <p role="status" className="text-sm">Verificando serviço…</p> : !available ? <p role="status" className="rounded bg-warning/10 p-3 text-sm">O serviço de sincronização está indisponível nesta publicação. Seus dados continuam locais e o backup JSON permanece disponível.</p> : <>
      <label className="block text-sm font-semibold" htmlFor="sync-code">Código privado de sincronização</label>
      <input id="sync-code" type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} value={code} disabled={busy} onChange={event => { setCode(event.target.value); setRevision(null); setHasRemote(false); setPending(null); setMessage(""); }} placeholder="Crie aqui ou cole o código do outro aparelho" className="w-full rounded border bg-background p-2 font-mono text-sm" />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" disabled={busy} onClick={() => { setCode(createSyncCode()); setRevision(0); setHasRemote(false); setPending(null); setMessage("Código criado. Copie-o, guarde-o e publique o progresso para criar a cópia remota."); }}>Criar novo código</button>
        <button className="btn btn-ghost" disabled={busy || !code} onClick={() => perform(async () => { await navigator.clipboard.writeText(code); setMessage("Código copiado. Cole somente no seu outro aparelho ou gerenciador privado."); })}>Copiar código</button>
        <button className="btn btn-ghost" disabled={busy || !code} onClick={() => perform(async () => {
          const remote = await pullProgress(code); setRevision(remote.revision); setHasRemote(remote.data !== null); setPending(remote.data);
          setMessage(remote.data ? `Versão remota ${remote.revision} baixada e validada. Confira antes de aplicar.` : "Ainda não existe progresso remoto para este código. Publique o progresso deste aparelho.");
        })}>Baixar e conferir</button>
        <button className="btn btn-primary" disabled={busy || !code} onClick={() => perform(async () => {
          let base = revision;
          let replacing = hasRemote;
          if (base === null) {
            const remote = await pullProgress(code); base = remote.revision; replacing = remote.data !== null; setRevision(base); setHasRemote(replacing);
          }
          if (replacing && !confirm(`Substituir a cópia remota da versão ${base} pelo progresso deste aparelho? A cópia local dos outros aparelhos não muda até eles baixarem.`)) return;
          const updated = await pushProgress(code, getData(), base); setRevision(updated); setHasRemote(true); setPending(null); setMessage(`Progresso publicado e confirmado na versão ${updated}. No outro aparelho, use Baixar e conferir.`);
        })}>Publicar meu progresso</button>
      </div>
      {pending && <div className="space-y-2 rounded border p-3">
        <p className="text-sm">Cópia remota: {Object.keys(pending.completedLessons).length} aulas concluídas, {Object.keys(pending.passedExercises).length} atividades aprovadas e {Object.keys(pending.drafts).length} rascunhos.</p>
        <button className="btn btn-primary" disabled={busy} onClick={() => perform(async () => { if (confirm("Aplicar a cópia remota e substituir o progresso local? Exporte um backup antes se quiser preservar a versão deste aparelho.")) { replaceAll(pending); setPending(null); setMessage("Progresso remoto aplicado e salvo neste aparelho."); } })}>Aplicar neste aparelho</button>
      </div>}
      {revision !== null && revision > 0 && hasRemote && <button className="btn btn-danger text-sm" disabled={busy} onClick={() => perform(async () => {
        if (!confirm("Apagar a cópia remota? O progresso local de cada aparelho será preservado.")) return;
        const deletedRevision = await deleteRemoteProgress(code, revision); setRevision(deletedRevision); setHasRemote(false); setPending(null); setMessage("Cópia remota apagada. Seu progresso local foi preservado.");
      })}>Apagar somente a cópia remota</button>}
      {busy && <p role="status" className="text-sm">Transferindo com segurança…</p>}
    </>}
    {message && <p role="status" className="rounded bg-muted p-3 text-sm">{message}</p>}
  </section>;
}
