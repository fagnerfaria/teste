import type { OutChunk } from "@/lib/runtime";
import { explainError } from "@/lib/content/glossary";

export function Terminal({ chunks, footer, placeholder = "A saída do programa aparece aqui." }: { chunks: OutChunk[]; footer?: string | undefined; placeholder?: string }) {
  const stderr = chunks.filter((c) => c.stream === "stderr").map((c) => c.text).join("");
  const tip = stderr ? explainError(stderr) : undefined;
  return (
    <div className="space-y-2">
      <div role="log" aria-live="polite" aria-label="Saída do programa"
        className="max-h-80 min-h-28 overflow-auto rounded-lg bg-terminal p-3 font-mono text-sm leading-relaxed text-terminal-foreground">
        {chunks.length === 0 && <span className="opacity-60">{placeholder}</span>}
        {chunks.map((c, i) => (
          <span key={i} className={`whitespace-pre-wrap ${c.stream === "stderr" ? "text-terminal-error" : c.stream === "info" ? "text-terminal-info" : ""}`}>{c.text}</span>
        ))}
        {footer && <div className="mt-2 border-t border-terminal-foreground/20 pt-1 text-xs text-terminal-info">{footer}</div>}
      </div>
      {tip && <p className="rounded-md border border-warning/50 bg-warning/10 p-2 text-sm"><strong>Dica do professor:</strong> {tip}</p>}
    </div>
  );
}