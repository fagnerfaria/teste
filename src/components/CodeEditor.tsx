import { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";

type Props = { value: string; onChange: (v: string) => void; lang: "python" | "javascript" | "html"; label?: string; minHeight?: number };

/** CodeMirror 6 carregado no cliente; textarea monoespaçada como fallback. */
export function CodeEditor({ value, onChange, lang, label = "Editor de código", minHeight = 220 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        const [{ basicSetup }, { EditorView, keymap }, { EditorState }, { indentWithTab }, langMod, { oneDark }] = await Promise.all([
          import("codemirror"), import("@codemirror/view"), import("@codemirror/state"), import("@codemirror/commands"),
          lang === "python" ? import("@codemirror/lang-python").then((m) => m.python())
            : lang === "javascript" ? import("@codemirror/lang-javascript").then((m) => m.javascript())
            : import("@codemirror/lang-html").then((m) => m.html()),
          import("@codemirror/theme-one-dark"),
        ]);
        if (destroyed || !host.current) return;
        const dark = document.documentElement.classList.contains("dark");
        view.current = new EditorView({
          parent: host.current,
          state: EditorState.create({
            doc: value,
            extensions: [
              basicSetup, keymap.of([indentWithTab]), langMod, EditorState.tabSize.of(4),
              ...(dark ? [oneDark] : []),
              EditorView.contentAttributes.of({ "aria-label": label, autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
              EditorView.updateListener.of((u) => { if (u.docChanged) onChangeRef.current(u.state.doc.toString()); }),
            ],
          }),
        });
        setReady(true);
      } catch {
        setReady(false);
      }
    })();
    return () => { destroyed = true; view.current?.destroy(); view.current = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card" style={{ minHeight }}>
      <div ref={host} className={ready ? "" : "hidden"} style={{ minHeight }} />
      {!ready && (
        <textarea
          aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
          spellCheck={false} autoCapitalize="off" autoCorrect="off"
          className="block w-full resize-y bg-card p-3 font-mono text-[15px] leading-relaxed outline-none"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}