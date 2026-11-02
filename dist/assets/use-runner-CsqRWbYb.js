const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/dist-2sEuhSKU.js","assets/dist-BUC-nn24.js","assets/rolldown-runtime-B0Z9INg1.js","assets/dist-DsG2cRhB.js","assets/dist-BE_ZmYM3.js","assets/dist-2lqwZyso.js","assets/dist-DOqjhc__.js","assets/dist-cdgbOa5b.js","assets/dist-fl_9R3ZY.js","assets/dist-CwkXhrnl.js","assets/dist-D8-LqjhL.js"])))=>i.map(i=>d[i]);
import{a as e}from"./rolldown-runtime-B0Z9INg1.js";import{n as t,t as n}from"./jsx-runtime-DLwSWi3B.js";import{h as r}from"./index-Buo6_OQk.js";import{r as i}from"./glossary-CnGsa2Fb.js";var a=e(t()),o=n();function s({value:e,onChange:t,lang:n,label:i=`Editor de código`,minHeight:s=220}){let c=(0,a.useRef)(null),l=(0,a.useRef)(null),u=(0,a.useRef)(t);u.current=t;let[d,f]=(0,a.useState)(!1);return(0,a.useEffect)(()=>{let t=!1;return(async()=>{try{let[{basicSetup:a},{EditorView:o,keymap:s},{EditorState:d},{indentWithTab:p},m,{oneDark:h}]=await Promise.all([r(()=>import(`./dist-2sEuhSKU.js`),__vite__mapDeps([0,1,2,3,4,5,6])),r(()=>import(`./dist-DsG2cRhB.js`).then(e=>e.l),__vite__mapDeps([3,2,1])),r(()=>import(`./dist-BUC-nn24.js`).then(e=>e.x),__vite__mapDeps([1,2])),r(()=>import(`./dist-2lqwZyso.js`),__vite__mapDeps([5,1,2,3,4])),r(n===`python`?()=>import(`./dist-CjroLvVh.js`).then(e=>e.python()):n===`javascript`?()=>import(`./dist-CwkXhrnl.js`).then(e=>e.javascript()):()=>import(`./dist-cdgbOa5b.js`).then(e=>e.html()),__vite__mapDeps([7,1,2,3,4,8,9,6])),r(()=>import(`./dist-D8-LqjhL.js`),__vite__mapDeps([10,3,2,1,4]))]);if(t||!c.current)return;let g=document.documentElement.classList.contains(`dark`);l.current=new o({parent:c.current,state:d.create({doc:e,extensions:[a,s.of([p]),m,d.tabSize.of(4),...g?[h]:[],o.contentAttributes.of({"aria-label":i,autocapitalize:`off`,autocorrect:`off`,spellcheck:`false`}),o.updateListener.of(e=>{e.docChanged&&u.current(e.state.doc.toString())})]})}),f(!0)}catch{f(!1)}})(),()=>{t=!0,l.current?.destroy(),l.current=null,f(!1)}},[n]),(0,a.useEffect)(()=>{let t=l.current;t&&t.state.doc.toString()!==e&&t.dispatch({changes:{from:0,to:t.state.doc.length,insert:e}})},[e]),(0,o.jsxs)(`div`,{className:`overflow-hidden rounded-lg border bg-card`,style:{minHeight:s},children:[(0,o.jsx)(`div`,{ref:c,className:d?``:`hidden`,style:{minHeight:s}}),!d&&(0,o.jsx)(`textarea`,{"aria-label":i,value:e,onChange:e=>t(e.target.value),spellCheck:!1,autoCapitalize:`off`,autoCorrect:`off`,className:`block w-full resize-y bg-card p-3 font-mono text-[15px] leading-relaxed outline-none`,style:{minHeight:s}})]})}function c({chunks:e,footer:t,placeholder:n=`A saída do programa aparece aqui.`}){let r=e.filter(e=>e.stream===`stderr`).map(e=>e.text).join(``),a=r?i(r):void 0;return(0,o.jsxs)(`div`,{className:`space-y-2`,children:[(0,o.jsxs)(`div`,{role:`log`,"aria-live":`polite`,"aria-label":`Saída do programa`,className:`max-h-80 min-h-28 overflow-auto rounded-lg bg-terminal p-3 font-mono text-sm leading-relaxed text-terminal-foreground`,children:[e.length===0&&(0,o.jsx)(`span`,{className:`opacity-60`,children:n}),e.map((e,t)=>(0,o.jsx)(`span`,{className:`whitespace-pre-wrap ${e.stream===`stderr`?`text-terminal-error`:e.stream===`info`?`text-terminal-info`:``}`,children:e.text},t)),t&&(0,o.jsx)(`div`,{className:`mt-2 border-t border-terminal-foreground/20 pt-1 text-xs text-terminal-info`,children:t})]}),a&&(0,o.jsxs)(`p`,{className:`rounded-md border border-warning/50 bg-warning/10 p-2 text-sm`,children:[(0,o.jsx)(`strong`,{children:`Dica do professor:`}),` `,a]})]})}var l=`0.26.4`,u=`https://cdn.jsdelivr.net/pyodide/v${l}/full/`,d=`
importScripts("${u}pyodide.js");
let py = null;
const ready = loadPyodide({ indexURL: "${u}" })
  .then((p) => { py = p; postMessage({ type: "ready" }); })
  .catch((e) => postMessage({ type: "loadError", error: String(e && e.message || e) }));
function clean(msg) {
  const lines = String(msg).split("\\n");
  const i = lines.findIndex((l) => l.includes('File "<exec>"'));
  if (i === -1) return msg;
  return ["Traceback (most recent call last):", ...lines.slice(i)].join("\\n");
}
onmessage = async (e) => {
  const { id, code, stdin } = e.data;
  await ready;
  if (!py) { postMessage({ type: "done", id, ok: false }); return; }
  const lines = stdin ? String(stdin).replace(/\\r\\n/g, "\\n").split("\\n") : [];
  let i = 0;
  py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) });
  py.setStdout({ batched: (s) => postMessage({ type: "out", id, stream: "stdout", text: s + "\\n" }) });
  py.setStderr({ batched: (s) => postMessage({ type: "out", id, stream: "stderr", text: s + "\\n" }) });
  const ns = py.globals.get("dict")();
  try {
    await py.runPythonAsync(code, { globals: ns });
    postMessage({ type: "done", id, ok: true });
  } catch (err) {
    postMessage({ type: "out", id, stream: "stderr", text: clean(err.message) + "\\n" });
    postMessage({ type: "done", id, ok: false });
  } finally { try { ns.destroy(); } catch (_) {} }
};
`,f=`
const fmt = (v) => { if (typeof v === "string") return v; try { return typeof v === "object" ? JSON.stringify(v) : String(v); } catch (_) { return String(v); } };
let id = 0;
const send = (stream, args) => postMessage({ type: "out", id, stream, text: args.map(fmt).join(" ") + "\\n" });
console.log = (...a) => send("stdout", a); console.info = console.log;
console.warn = (...a) => send("stderr", a); console.error = console.warn;
const pending = new Set(); const _st = setTimeout, _ct = clearTimeout, _si = setInterval, _ci = clearInterval;
self.setTimeout = (fn, ms, ...r) => { const h = _st(() => { pending.delete(h); try { fn(...r); } catch (e) { send("stderr", [String(e)]); } }, ms); pending.add(h); return h; };
self.clearTimeout = (h) => { pending.delete(h); _ct(h); };
self.setInterval = (fn, ms, ...r) => { const h = _si(() => { try { fn(...r); } catch (e) { send("stderr", [String(e)]); } }, ms); pending.add(h); return h; };
self.clearInterval = (h) => { pending.delete(h); _ci(h); };
onmessage = async (e) => {
  id = e.data.id;
  try {
    const fn = new Function('"use strict"; return (async () => {\\n' + e.data.code + '\\n})()');
    await fn();
    while (pending.size) await new Promise((r) => _st(r, 20));
    postMessage({ type: "done", id, ok: true });
  } catch (err) {
    send("stderr", [(err && err.name ? err.name + ": " : "") + (err && err.message || String(err))]);
    postMessage({ type: "done", id, ok: false });
  }
};
`;function p(e){let t=URL.createObjectURL(new Blob([e],{type:`text/javascript`}));return new Worker(t)}var m=null,h=null,g=`idle`,_=``,v=new Set,y=e=>{g=e,v.forEach(e=>e())},b=e=>(v.add(e),()=>{v.delete(e)}),x=()=>g,S=()=>_;function C(){if(h&&g!==`failed`)return h;y(`loading`),m?.terminate();let e=p(d);return m=e,h=new Promise((t,n)=>{let r=i=>{i.data.type===`ready`&&(e.removeEventListener(`message`,r),y(`ready`),t()),i.data.type===`loadError`&&(e.removeEventListener(`message`,r),_=i.data.error,y(`failed`),n(Error(i.data.error)))};e.addEventListener(`message`,r),e.onerror=e=>{_=e.message||`Falha ao baixar o Pyodide (verifique sua conexão).`,y(`failed`),n(Error(_))}}),h.catch(()=>{}),h}function w(){m?.terminate(),m=null,h=null,y(`idle`)}var T=null,E=0;function D(){T?.cancel()}async function O(e,t,n){T?.cancel();let r;if(e===`python`){try{await C()}catch{return{status:`unavailable`,stdout:``,stderr:``,durationMs:0}}r=m}else r=p(f);let i=++E,a=``,o=``,s=performance.now();return new Promise(c=>{let l=!1,u=t=>{l||(l=!0,clearTimeout(p),r.removeEventListener(`message`,d),e===`javascript`&&r.terminate(),T=null,c({status:t,stdout:a,stderr:o,durationMs:Math.round(performance.now()-s)}))},d=e=>{let t=e.data;t.id===i&&(t.type===`out`?(t.stream===`stdout`?a+=t.text:o+=t.text,n.onChunk?.({stream:t.stream,text:t.text})):t.type===`done`&&u(t.ok?`ok`:`error`))};r.addEventListener(`message`,d);let f=()=>{e===`python`?w():r.terminate()},p=setTimeout(()=>{f(),u(`timeout`)},n.timeoutMs);T={cancel:()=>{f(),u(`stopped`)}},r.postMessage({id:i,code:t,stdin:n.stdin??``})})}function k(e){return e.replace(/\r\n?/g,`
`).split(`
`).map(e=>e.replace(/\s+$/,``)).join(`
`).replace(/\n+$/,``)}function A(){T?.cancel(),w()}function j(){return(0,a.useSyncExternalStore)(b,x,()=>`idle`)}var M={timeout:`⏱ Tempo limite atingido: execução interrompida (o worker foi encerrado e será recriado).`,stopped:`■ Execução interrompida por você. O ambiente será recriado no próximo Executar.`,unavailable:`✖ Execução Python indisponível: o Pyodide não carregou. Nenhum resultado foi gerado.`};function N(){let[e,t]=(0,a.useState)([]),[n,r]=(0,a.useState)(!1),[i,o]=(0,a.useState)(null);return{chunks:e,setChunks:t,running:n,last:i,run:(0,a.useCallback)(async(e,n,i)=>{t([]),r(!0),o(null);let a=await O(e,n,{...i,onChunk:e=>t(t=>[...t,e])});if(M[a.status]){let e=a.status===`unavailable`&&S()?`\nDetalhe: ${S()}`:``;t(t=>[...t,{stream:`info`,text:M[a.status]+e+`
`}])}return o(a),r(!1),a},[]),stop:D,preload:()=>C().catch(()=>{})}}var P=e=>e?`${e.status===`ok`?`✔ Concluído`:e.status===`error`?`✖ Terminou com erro`:`Encerrado`} · ${e.durationMs} ms`:void 0;export{C as a,O as c,l as i,c as l,j as n,k as o,N as r,A as s,P as t,s as u};