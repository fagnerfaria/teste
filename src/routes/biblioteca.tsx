import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ImportedLesson } from "@/components/ImportedLesson";
import { SNAPSHOT_DOCUMENTS, SNAPSHOT_COLLECTIONS } from "@/lib/content/snapshot-index";
import {
  EXTERNAL_ITEMS, EXTERNAL_SOURCES, buildSourceUrl,
  filterExternalItems, type ExternalItem,
} from "@/lib/content/external-library";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca dos quatro repositórios — CódigoLab" },
      { name: "description", content: "Índice navegável das fontes abertas com autoria, licenças, pesquisa e acesso aos materiais originais." },
    ],
  }),
  component: Biblioteca,
});

const PAGE = 45;


function Biblioteca() {
  const [sourceId, setSourceId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ExternalItem | null>(null);
  const [collection, setCollection] = useState("");
  const openDocument=(source:string,path:string)=>{
    const item=EXTERNAL_ITEMS.find(i=>i.sourceId===source&&i.path===path);
    if(!item)return;setSourceId(source);setSearch("");setCategory("");setCollection("");
    const sourceItems=filterExternalItems(source,"");setPage(Math.floor(sourceItems.indexOf(item)/PAGE)+1);setSelected(item);
  };
  useEffect(()=>{const query=new URLSearchParams(window.location.search);const source=query.get("source"),path=query.get("path");if(source&&path)openDocument(source,path);},[]);
  const filtered = useMemo(() => filterExternalItems(sourceId, search, category).filter(i=>!collection||i.path.startsWith("roadmaps/"+collection+"/")), [sourceId, search, category, collection]);
  const categories = useMemo(() =>
    [...new Set(EXTERNAL_ITEMS.filter(x => !sourceId || x.sourceId === sourceId).map(x => x.category))].sort(), [sourceId]);
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);
  const maxPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const selectSource = (next: string) => { setSourceId(next); setCollection(""); setCategory(""); setPage(1); setSelected(null); };
  const selectSearch = (next: string) => { setSearch(next); setPage(1); };
  const selectCategory = (next: string) => { setCategory(next); setPage(1); };
  const canPreview = (item: ExternalItem) => SNAPSHOT_DOCUMENTS.some(d=>d.sourceId===item.sourceId&&d.path===item.path) || EXTERNAL_SOURCES.some(s => s.id === item.sourceId && s.previewAllowed) && /\.(md|mdx)$/i.test(item.path);

  return <div className="space-y-5">
    <div>
      <Link to="/cursos" className="text-sm text-primary hover:underline">← Visão geral dos cursos</Link>
      <h1 className="mt-2 text-3xl font-extrabold">Biblioteca de conteúdos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Índice dos quatro projetos de ensino: {EXTERNAL_ITEMS.length.toLocaleString("pt-BR")} referências oficiais,
        {SNAPSHOT_DOCUMENTS.length} documentos integrais redistribuíveis incorporados, com autoria e licença preservadas. Os demais materiais continuam na fonte oficial.
        Aulas próprias e exercícios executáveis continuam nas <Link to="/trilhas" className="text-primary underline">trilhas do CódigoLab</Link>.
      </p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-sm font-semibold">Origem
        <select value={sourceId} onChange={e => selectSource(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" aria-label="Selecionar fonte">
          <option value="">Todas as fontes ({EXTERNAL_ITEMS.length})</option>
          {EXTERNAL_SOURCES.map(s => <option key={s.id} value={s.id}>{s.name} ({EXTERNAL_ITEMS.filter(i => i.sourceId === s.id).length})</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Tipo de material
        <select value={category} onChange={e => selectCategory(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" aria-label="Categoria">
          <option value="">Todos os tipos</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
    </div>
    {(sourceId==="aprenda-community"||!sourceId)&&<label className="block text-sm font-semibold">Percurso completo do Aprenda Community
      <select aria-label="Selecionar percurso incorporado" value={collection} onChange={e=>{setCollection(e.target.value);setPage(1);setSelected(null);}} className="mt-1 w-full rounded-lg border bg-background p-3">
        <option value="">Todos os percursos ({SNAPSHOT_COLLECTIONS.length})</option>
        {SNAPSHOT_COLLECTIONS.map(c=><option key={c.id} value={c.id}>{c.title} · {c.nodes.length} tópicos</option>)}
      </select>
    </label>}
    {collection&&<section className="card-surface rounded-lg p-4"><h2 className="font-bold">{SNAPSHOT_COLLECTIONS.find(c=>c.id===collection)?.title}</h2><p className="mt-1 text-sm">{SNAPSHOT_COLLECTIONS.find(c=>c.id===collection)?.description}</p><ol className="mt-3 grid list-inside list-decimal gap-2 text-sm sm:grid-cols-2">{SNAPSHOT_COLLECTIONS.find(c=>c.id===collection)?.nodes.map(n=><li key={n.id}><button className="text-primary underline" onClick={()=>openDocument("aprenda-community",n.path)}>{n.title}</button></li>)}</ol></section>}
    <label className="block text-sm font-semibold">Pesquisar assunto, tecnologia ou nome de arquivo
      <input type="search" value={search} onChange={e => selectSearch(e.target.value)}
        placeholder="Ex.: redes, segurança, Python, Git, React" className="mt-1 w-full rounded-lg border bg-background p-3"
        aria-label="Pesquisar na biblioteca" />
    </label>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-sm text-muted-foreground">{filtered.length.toLocaleString("pt-BR")} resultados • Página {page} de {maxPages}</p>
      <div className="flex gap-2">
        <button className="btn btn-ghost" disabled={page <= 1} onClick={() => { setPage(p => p-1); setSelected(null); }}>Anterior</button>
        <button className="btn btn-ghost" disabled={page >= maxPages} onClick={() => { setPage(p => p+1); setSelected(null); }}>Próxima</button>
      </div>
    </div>
    <ul className="space-y-2">
      {shown.map(item => {
        const source = EXTERNAL_SOURCES.find(s => s.id === item.sourceId)!;
        const link = buildSourceUrl(item.sourceId, item.path, item.kind);
        return <li key={item.sourceId + ":" + item.path} className="card-surface rounded-lg p-3">
          <div className="flex flex-wrap justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold capitalize">{item.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{source.name} • {item.category} • {item.kind === "directory" ? "Coleção" : "Documento"}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{item.path}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 self-center">
              {canPreview(item) && <button className="btn btn-primary text-xs" onClick={() => setSelected(item)}>Ler aqui</button>}
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-xs" aria-label={`Abrir ${item.title} na fonte original`}>Ver original ↗</a>
            </div>
          </div>
          {selected?.sourceId === item.sourceId && selected.path === item.path && <ImportedLesson key={item.path} item={item} onOpen={openDocument}/>}
        </li>;
      })}
    </ul>
    {filtered.length === 0 && <p className="rounded-lg border p-4 text-sm">Nenhum resultado. Tente outra palavra ou limpe os filtros.</p>}
    <div className="flex items-center justify-center gap-3">
      <button className="btn btn-ghost" disabled={page <= 1} onClick={() => {setPage(p => p-1);setSelected(null);window.scrollTo({top:0,behavior:"smooth"});}}>Anterior</button>
      <span className="text-sm">{page} / {maxPages}</span>
      <button className="btn btn-primary" disabled={page >= maxPages} onClick={() => {setPage(p=>p+1);setSelected(null);window.scrollTo({top:0,behavior:"smooth"});}}>Próxima página</button>
    </div>
    <section className="card-surface space-y-3 rounded-xl p-4">
      <h2 className="text-lg font-semibold">Fontes, créditos e limitações</h2>
      {EXTERNAL_SOURCES.map(source =>
        <details key={source.id}><summary className="cursor-pointer font-semibold">{source.name}</summary>
          <p className="mt-1 text-sm">{source.licenseNote}</p>
          <p className="mt-1 text-xs text-muted-foreground">Autoria: {source.repository} • Idioma: {source.language}</p>
          <a href={source.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Visitar fonte oficial ↗</a>
        </details>
      )}
      <p className="text-xs text-muted-foreground">Índice de 02/11/2026 com snapshots de UBL e dos conteúdos expressamente autorizados em roadmaps/** do Aprenda. Licenças e hashes estão no manifesto local. Os projetos e bootcamps Aprenda fora desse escopo, 30 Dias de Python (sem licença de redistribuição identificada) e currículo freeCodeCamp (copyright próprio) permanecem referências oficiais. O freeCodeCamp inclui blocos com numerosos exercícios internos, disponíveis no repositório e na plataforma oficial. Os repositórios podem receber atualizações posteriormente.</p>
    </section>
  </div>;
}
