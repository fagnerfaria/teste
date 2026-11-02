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
  {id:"python",title:"Estudo com Python",description:"Python com imports locais reais, dependências e testes unittest.",entry:"main.py",
   files:{"main.py":'from saudacoes import saudacao\n\nif __name__ == "__main__":\n    print(saudacao("CódigoLab"))\n',"saudacoes.py":'def saudacao(nome):\n    return f"Olá, {nome}!"\n',"test_saudacoes.py":'import unittest\nfrom saudacoes import saudacao\n\nclass SaudacaoTests(unittest.TestCase):\n    def test_nome(self):\n        self.assertEqual(saudacao("Fagner"), "Olá, Fagner!")\n',"requirements.txt":"# Opcional: um pacote Pyodide por linha, por exemplo numpy.\n","README.md":"# Projeto Python\n\nExecute main.py com imports locais. Rode testes em arquivos test_nome.py usando unittest. Declare pacotes suportados em requirements.txt.\n"}},
  {id:"javascript",title:"Estudo com JavaScript",description:"JavaScript e TypeScript com módulos, dependências npm e testes reais.",entry:"main.js",
   files:{"main.js":'import { dobro } from "./math.js";\nconsole.log("Resultado:", dobro(7));\n',"math.js":'export function dobro(numero) {\n  return numero * 2;\n}\n',"math.test.js":'import { dobro } from "./math.js";\nif (dobro(7) !== 14) throw Error("dobro(7) deve retornar 14");\nif (dobro(-2) !== -4) throw Error("O dobro deve aceitar números negativos");\n',"package.json":'{"dependencies":{}}\n',"README.md":"# Projeto JavaScript\n\nImports .js, .ts e .json são resolvidos pelo esbuild. Declare dependências npm com versão exata em package.json. Testes: nome.test.js com Error quando uma asserção falhar. Sem DOM, Node.js, terminal ou servidor TCP.\n"}}

];

const isPlain=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;

export function validateWorkspacePath(path:string):string {
 if(typeof path!=="string"||path.length>120||!path||path.startsWith("/")||path.includes("\\")||path.includes("//")||path.includes(":")||path.includes("%")||path.includes("?")||path.includes("#")||path.includes(".."))throw Error("Nome de arquivo inválido.");
 const parts=path.split("/");
 if(parts.length>8||parts.some(x=>!x||x.startsWith(".")||x==="."||x===".."||!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(x)))throw Error("Nome de arquivo inválido.");
 if(!/\.(?:html|css|js|ts|py|md|json|txt|svg)$/i.test(path))throw Error("Extensão não permitida.");
 return path;
}
export const validWorkspace=(v:unknown):v is Workspace=>{
 if(!isPlain(v)||v["version"]!==1||!["web","python","javascript"].includes(String(v["kind"]))||typeof v["entry"]!=="string"||!isPlain(v["files"]))return false;
 const files=v["files"];
 const entry=v["entry"];
 if(v["kind"]==="python"&&!entry.endsWith(".py")||v["kind"]==="javascript"&&!/\.(?:js|ts)$/.test(entry)||v["kind"]==="web"&&!entry.endsWith(".html"))return false;
 const keys=Object.keys(files);if(keys.length<1||keys.length>MAX_FILES||!keys.includes(entry))return false;
 let size=0;
 for(const k of keys){
  try{validateWorkspacePath(k);}catch{return false;}
  const value=files[k];if(typeof value!=="string"||value.length>MAX_FILE_SIZE)return false;
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
export function makeHtmlPreview(project:Workspace,javascriptCode?:string):string {
 if(!validWorkspace(project)||project.kind!=="web")throw Error("Visualização disponível apenas para projetos web.");
 const html=project.files[project.entry]??"";
 const css=Object.entries(project.files).filter(([p])=>p.endsWith(".css")).map(([,v])=>v).join("\n");
 const js=javascriptCode??Object.entries(project.files).filter(([p])=>p.endsWith(".js")).map(([,v])=>v).join("\n;\n");
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:; form-action \'none\'; connect-src \'none\'">'+
 '<style>'+escapeStyle(css)+'</style></head><body>'+html+'<script'+(javascriptCode!==undefined?' type="module"':'')+'>'+escapeScript(js)+'</script></body></html>';
}

export type PreparedWorkspaceRun = {
 lang: "python" | "javascript";
 code: string;
 module: boolean;
 project?: { entry: string; files: Record<string,string>; packages: string[] };
};

let bundlerReady: Promise<typeof import("esbuild-wasm")> | undefined;
async function projectBundler() {
 if (!bundlerReady) bundlerReady = import("esbuild-wasm").then(async esbuild => {
   if (typeof window !== "undefined") await esbuild.initialize({wasmURL:"/vendor/esbuild.wasm"});
   return esbuild;
 }).catch(error => {bundlerReady=undefined;throw error;});
 return bundlerReady;
}

/** Bundles actual ES modules, TypeScript and JSON before executing in a Worker. */
export const PYTHON_PACKAGES = ["numpy", "pandas", "matplotlib", "scipy", "sympy", "scikit-learn", "beautifulsoup4", "requests", "pillow", "regex"] as const;

export function workspacePythonPackages(project:Workspace):string[] {
 const packages=(project.files["requirements.txt"]??"").split(/\r?\n/).map(line=>line.split("#")[0]?.trim()??"").filter(Boolean);
 for(const name of packages) if(!(PYTHON_PACKAGES as readonly string[]).includes(name))throw Error("Pacote Python não disponível neste ambiente: "+name+". Use: "+PYTHON_PACKAGES.join(", ")+". As versões são as distribuídas pelo Pyodide.");
 return [...new Set(packages)];
}

export async function prepareWorkspaceRun(project:Workspace):Promise<PreparedWorkspaceRun> {
 if(!validWorkspace(project))throw Error("Projeto inválido.");
 if(project.kind==="python") return {lang:"python",code:project.files[project.entry]??"",module:false,project:{entry:project.entry,files:{...project.files},packages:workspacePythonPackages(project)}};
 if(project.kind!=="javascript")throw Error("Selecione um projeto Python ou JavaScript.");
 const esbuild=await projectBundler();
 let dependencies:Record<string,unknown>={};
 if(project.files["package.json"]) {
  try {
   const manifest:unknown=JSON.parse(project.files["package.json"]);
   if(!isPlain(manifest)|| (manifest["dependencies"]!==undefined&&!isPlain(manifest["dependencies"])))throw Error();
   dependencies=(manifest["dependencies"]??{}) as Record<string,unknown>;
   if(Object.keys(dependencies).length>10)throw Error();
  } catch {throw Error("package.json inválido. Declare até 10 dependências em dependencies com versões exatas.");}
 }
 let downloaded=0;
 const result=await esbuild.build({
  entryPoints:[project.entry],bundle:true,write:false,format:"esm",platform:"browser",target:"es2022",logLevel:"silent",
  plugins:[{name:"workspace",setup(build){
   build.onResolve({filter:/.*/},args=>{
    if(args.namespace==="cdn" || /^https?:/.test(args.path) || args.path.startsWith("/npm/")) {
      const url=new URL(args.path,args.namespace==="cdn"?args.importer:"https://cdn.jsdelivr.net");
      if(url.origin!=="https://cdn.jsdelivr.net"||!/^\/npm\/(?:@[^/]+\/)?[^/@]+@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\/|$)/.test(url.pathname)||url.search||url.hash)throw Error("Dependência remota não permitida: "+args.path);
      return {path:url.href,namespace:"cdn"};
    }
    if(args.kind!=="entry-point"&&!args.path.startsWith(".")) {
      const segments=args.path.split("/");
      const count=args.path.startsWith("@")?2:1;
      const name=segments.slice(0,count).join("/");
      const version=dependencies[name];
      if(typeof version!=="string"||!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))throw Error("Dependência não declarada com versão exata em package.json: "+name);
      if(!/^(?:@[a-z0-9_-]+\/)?[a-z0-9_-]+$/.test(name)||segments.some(s=>s===".."||s.includes("%")))throw Error("Nome de dependência inválido.");
      const suffix=segments.slice(count).join("/");
      return {path:"https://cdn.jsdelivr.net/npm/"+name+"@"+version+(suffix?"/"+suffix:"")+"/+esm",namespace:"cdn"};
    }
    const parent=args.importer.split("/").slice(0,-1);
    const parts=(args.kind==="entry-point"?args.path:[...parent,args.path].join("/")).split("/");
    const normalized:string[]=[];
    for(const part of parts){if(part==="."||part==="")continue;if(part===".."){if(!normalized.length)throw Error("Import fora do projeto.");normalized.pop();}else normalized.push(part);}
    const path=normalized.join("/");
    const resolved=[path,path+".js",path+".ts",path+".json",path+"/index.js",path+"/index.ts"].find(x=>Object.hasOwn(project.files,x));
    if(!resolved)throw Error("Módulo não encontrado: "+args.path+". Crie o arquivo no projeto.");
    return {path:resolved,namespace:"workspace"};
   });
   build.onLoad({filter:/.*/,namespace:"cdn"},async args=>{
     const response=await fetch(args.path,{signal:AbortSignal.timeout(20000),credentials:"omit",referrerPolicy:"no-referrer"});
     if(!response.ok)throw Error("Não foi possível baixar a dependência: HTTP "+response.status);
     const contents=await response.text();downloaded+=contents.length;
     if(downloaded>1000000)throw Error("Dependências excedem 1 MB de código. Reduza os pacotes do projeto.");
     return {contents,loader:"js"};
   });
   build.onLoad({filter:/.*/,namespace:"workspace"},args=>({contents:project.files[args.path]??"",loader:args.path.endsWith(".json")?"json":args.path.endsWith(".ts")?"ts":"js"}));
  }}],
 });
 return {lang:"javascript",code:result.outputFiles?.[0]?.text??"",module:true};
}

/** Runs user-authored tests. The output is evidence, not a trusted certification. */
export async function prepareWorkspaceTests(project:Workspace):Promise<PreparedWorkspaceRun> {
 if(!validWorkspace(project)||project.kind==="web")throw Error("Os testes automáticos estão disponíveis nos projetos Python e JavaScript.");
 if(project.kind==="python") {
   if(!Object.keys(project.files).some(path=>/(?:^|\/)test_[^/]+\.py$/.test(path)))throw Error("Adicione um arquivo test_nome.py com testes unittest.");
   const entry="codigolab_test_runner.py";
   const code='import sys, unittest\nsuite = unittest.defaultTestLoader.discover(".", pattern="test_*.py")\nresult = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)\nif result.testsRun == 0: raise AssertionError("Nenhum teste encontrado. Use classes unittest.TestCase.")\nif not result.wasSuccessful(): raise AssertionError("Há testes com falha.")\nprint("Todos os testes passaram.")\n';
   return prepareWorkspaceRun({...project,entry,files:{...project.files,[entry]:code}});
 }
 const tests=Object.keys(project.files).filter(path=>/\.test\.(?:js|ts)$/.test(path));
 if(!tests.length)throw Error("Adicione um arquivo nome.test.js ou nome.test.ts com asserções que lancem Error em caso de falha.");
 const entry="codigolab_test_runner.js";
 const code=tests.map(path=>"import "+JSON.stringify("./"+path)+";").join("\n")+'\nconsole.log("Todos os testes passaram.");';
 return prepareWorkspaceRun({...project,entry,files:{...project.files,[entry]:code}});
}


export async function makeHtmlProjectPreview(project:Workspace):Promise<string> {
 if(!validWorkspace(project)||project.kind!=="web")throw Error("Projeto web inválido.");
 const html=project.files[project.entry]??"";
 const linked=[...html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi)].map(match=>match[1]??"");
 const entries=linked.length?linked:Object.hasOwn(project.files,"app.js")?["app.js"]:Object.keys(project.files).filter(path=>/\.(?:js|ts)$/.test(path)&&!path.includes(".test."));
 if(!entries.length)return makeHtmlPreview(project);
 for(const entry of entries)if(!Object.hasOwn(project.files,entry.replace(/^\.\//,"")))throw Error("Script externo ou inexistente: "+entry+". Adicione o arquivo ao projeto.");
 const entry="codigolab_web_entry.js";
 const aggregate=entries.map(path=>"import "+JSON.stringify(path.startsWith("./")?path:"./"+path)+";").join("\n");
 const run=await prepareWorkspaceRun({...project,kind:"javascript",entry,files:{...project.files,[entry]:aggregate}});
 const cleanHtml=html.replace(/<script[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi,"").replace(/<link[^>]*\bhref=["'][^"']+\.css["'][^>]*>/gi,"");
 return makeHtmlPreview({...project,files:{...project.files,[project.entry]:cleanHtml}},run.code);
}
