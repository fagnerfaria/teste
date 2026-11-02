/** File-based local workspace for the browser. No server or arbitrary system access. */
export type WorkspaceKind = "web" | "python" | "javascript";
export type Workspace = { version: 1; kind: WorkspaceKind; entry: string; files: Record<string,string> };
export const MAX_FILES = 50;
export const MAX_FILE_SIZE = 50000;
export const MAX_WORKSPACE_SIZE = 200000;
export const WORKSPACE_TEMPLATES: ReadonlyArray<{id:WorkspaceKind;title:string;description:string;entry:string;files:Record<string,string>}> = [
  {id:"web",title:"Aplicação web",description:"HTML, CSS e JavaScript em arquivos separados, com prévia isolada.",entry:"index.html",
   files:{
    "index.html":'<main class="app"><p class="eyebrow">CódigoLab · Projeto web</p><h1>Meu primeiro site</h1><p id="mensagem">Bem-vindo ao laboratório!</p><button id="acao">Testar interação</button></main>',
    "styles.css":'body { font-family: system-ui, sans-serif; margin: 0; background: #f5f7f4; color: #173e32; } \n.app { max-width: 720px; margin: 8vh auto; padding: 32px; background: white; border: 1px solid #d1ded5; border-radius: 18px; }\n.eyebrow { color: #357b60; font-weight: 600; }\nbutton { border: none; border-radius: 10px; background: #245f4b; color: white; padding: 12px 18px; cursor: pointer; }',
    "app.js":'const button = document.getElementById("acao");\nbutton?.addEventListener("click", () => {\n  document.getElementById("mensagem").textContent = "JavaScript funcionando!";\n});',
   }},
  {id:"python",title:"Estudo com Python",description:"Organize arquivos Python e execute o conteúdo do arquivo principal no Pyodide.",entry:"main.py",
   files:{"main.py":'def saudacao(nome):\n    return f"Olá, {nome}!"\n\nprint(saudacao("CódigoLab"))\n',"README.md":"# Projeto Python\n\nO botão Executar roda o conteúdo de main.py. Imports de outros arquivos ainda não são suportados neste ambiente.\n"}},
  {id:"javascript",title:"Estudo com JavaScript",description:"Organize scripts e execute o arquivo principal em um Web Worker.",entry:"main.js",
   files:{"main.js":'function dobro(numero) {\n  return numero * 2;\n}\nconsole.log("Resultado:", dobro(7));\n',"README.md":"# Projeto JavaScript\n\nO executor usa um Worker: não tem DOM e não resolve imports de outros arquivos.\n"}}
];

const isPlain=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;

export function validateWorkspacePath(path:string):string {
 if(typeof path!=="string"||path.length>120||!path||path.startsWith("/")||path.includes("\\")||path.includes("//")||path.includes(":")||path.includes("%")||path.includes("?")||path.includes("#")||path.includes(".."))throw Error("Nome de arquivo inválido.");
 const parts=path.split("/");
 if(parts.length>8||parts.some(x=>!x||x.startsWith(".")||x==="."||x===".."||!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(x)))throw Error("Nome de arquivo inválido.");
 if(!/\.(?:html|css|js|ts|py|md|json|txt|svg)$/i.test(path))throw Error("Extensão não permitida.");
 return path;
}
const validWorkspace=(v:unknown):v is Workspace=>{
 if(!isPlain(v)||v.version!==1||!["web","python","javascript"].includes(String(v.kind))||typeof v.entry!=="string"||!isPlain(v.files))return false;
 const keys=Object.keys(v.files);if(keys.length<1||keys.length>MAX_FILES||!keys.includes(v.entry))return false;
 let size=0;
 for(const k of keys){
  try{validateWorkspacePath(k);}catch{return false;}
  const value=v.files[k];if(typeof value!=="string"||value.length>MAX_FILE_SIZE)return false;
  size+=value.length;
  if(size>MAX_WORKSPACE_SIZE)return false;
 }
 return true;
};

export function createWorkspace(kind:WorkspaceKind):Workspace {
 const t=WORKSPACE_TEMPLATES.find(x=>x.id===kind);
 if(!t)throw Error("Modelo de projeto inválido.");
 return {version:1,kind,entry:t.entry,files:{...t.files}};
}
export function parseWorkspace(json:string):Workspace|null {
 if(json.length>MAX_WORKSPACE_SIZE+10000)return null;
 try{const v:unknown=JSON.parse(json);return validWorkspace(v)?v:null;}catch{return null;}
}
export function upsertWorkspaceFile(project:Workspace,path:string,content:string):Workspace {
 const name=validateWorkspacePath(path);
 if(typeof content!=="string"||content.length>MAX_FILE_SIZE)throw Error("Arquivo excede 50 mil caracteres.");
 if(!validWorkspace(project))throw Error("Projeto inválido.");
 if(!(name in project.files)&&Object.keys(project.files).length>=MAX_FILES)throw Error("Limite de 50 arquivos.");
 const files={...project.files,[name]:content};
 if(Object.values(files).reduce((n,s)=>n+s.length,0)>MAX_WORKSPACE_SIZE)throw Error("Projeto excede 200 mil caracteres.");
 return {...project,files};
}
export function removeWorkspaceFile(project:Workspace,path:string):Workspace {
 if(!validWorkspace(project))throw Error("Projeto inválido.");
 const name=validateWorkspacePath(path);
 if(name===project.entry)throw Error("Não é possível excluir o arquivo principal.");
 if(!Object.hasOwn(project.files,name))throw Error("Arquivo inexistente.");
 const files={...project.files};delete files[name];
 return {...project,files};
}
const escapeStyle=(value:string)=>value.replace(/<\/style/gi,"<\\/style");
const escapeScript=(value:string)=>value.replace(/<\/script/gi,"<\\/script");
/** HTML preview executes only within a sandboxed iframe without same-origin permission. */
export function makeHtmlPreview(project:Workspace):string {
 if(!validWorkspace(project)||project.kind!=="web")throw Error("Visualização disponível apenas para projetos web.");
 const html=project.files[project.entry]??"";
 const css=Object.entries(project.files).filter(([p])=>p.endsWith(".css")).map(([,v])=>v).join("\n");
 const js=Object.entries(project.files).filter(([p])=>p.endsWith(".js")).map(([,v])=>v).join("\n;\n");
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:; form-action \'none\'; connect-src \'none\'">'+
 '<style>'+escapeStyle(css)+'</style></head><body>'+html+'<script>'+escapeScript(js)+'</script></body></html>';
}
