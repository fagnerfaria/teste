import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { COMMON_ERRORS, GLOSSARY } from "@/lib/content/glossary";

export const Route = createFileRoute("/glossario")({
  head: () => ({
    meta: [
      { title: "Glossário de programação — CódigoLab" },
      { name: "description", content: "Termos técnicos explicados em português simples e dicas para erros comuns." },
      { property: "og:title", content: "Glossário — CódigoLab" },
      { property: "og:description", content: "Conceitos de programação em português claro." },
    ],
  }),
  component: Glossario,
});

function Glossario() {
  const [q, setQ] = useState("");
  const list = GLOSSARY.filter((g) => (g.term + g.def).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Glossário</h1>
      <input aria-label="Buscar termo" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar termo…" className="w-full rounded-md border bg-card p-2" />
      <dl className="space-y-2">
        {list.map((g) => <div key={g.term} className="card-surface p-3"><dt className="font-bold">{g.term}</dt><dd className="text-sm">{g.def}</dd></div>)}
      </dl>
      <h2 className="text-xl font-bold">Erros comuns</h2>
      <ul className="space-y-1 text-sm">{COMMON_ERRORS.map((e) => <li key={e.tip} className="card-surface p-2">{e.tip}</li>)}</ul>
    </div>
  );
}