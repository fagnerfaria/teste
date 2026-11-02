import { launchBrowser } from "./browser.mjs";
const url = process.env.CODIGOLAB_URL || "https://codigolab.pages.dev";
const errors=[];
const browser=await launchBrowser();
const page=await browser.newPage({viewport:{width:390,height:844},ignoreHTTPSErrors:!!process.env.HTTPS_PROXY});
const networkErrors=[];
const browserMessages=[];
page.on("console",m=>{if(m.type()==="error"||m.type()==="warning") browserMessages.push(m.type()+": "+m.text());});
page.on("requestfailed",r=>networkErrors.push(r.url()+" => "+(r.failure()?.errorText||"falha")));
page.on("response",r=>{if(r.status()>=400) networkErrors.push("HTTP "+r.status()+" "+r.url());});
page.on("pageerror",e=>errors.push(e.message));
async function runTest(name,task){
  console.log("TESTE:",name);
  try { await task(); } catch(error) {
    console.error("DIAGNÓSTICO",name,JSON.stringify({
      currentUrl:page.url(),
      title:await page.title().catch(()=>"(falhou)"),
      body:(await page.locator("body").innerText().catch(() => "(inacessível)")).slice(0,1600),
      scripts:await page.locator("script[src]").evaluateAll(els=>els.map(e=>e.getAttribute("src"))).catch(()=>[]),
      networkErrors:networkErrors.slice(-20),
      browserMessages:browserMessages.slice(-20),
      pageErrors:errors.slice(-20)
    }));
    throw error;
  }
  console.log("PASSOU:",name);
}
try {
  await runTest("Página inicial Android", async()=>{
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    await page.getByRole("heading",{name:/Continuar estudando/}).waitFor({timeout:20000});
  });
  await runTest("Catálogo com os quatro cursos",async()=>{
    await page.goto(url+"/cursos",{waitUntil:"domcontentloaded"});
    for(const name of ["30 Dias de Python","Universidade Brasileira Livre","freeCodeCamp","Aprenda Community"]){
      await page.getByRole("heading",{name:new RegExp(name)}).first().waitFor();
    }
  });
  await runTest("Biblioteca externa: filtro, links e integridade mobile",async()=>{
    await page.goto(url+"/biblioteca",{waitUntil:"domcontentloaded"});
    await page.getByRole("heading",{name:"Biblioteca de conteúdos"}).waitFor();
    await page.getByLabel("Selecionar fonte").selectOption("aprenda-community");
    await page.getByLabel("Pesquisar na biblioteca").fill("typescript");
    const links=page.getByRole("link",{name:/Abrir .* na fonte original/});
    await links.first().waitFor();
    const href=await links.first().getAttribute("href");
    if(!href?.startsWith("https://github.com/lucianodiisouza/aprenda-community/"))throw new Error("Link atribuído à fonte errada: "+href);
  });
  await runTest("PWA: manifest e service worker corretos",async()=>{
    const manifest=await page.request.get(url+"/manifest.webmanifest");
    if(manifest.status()!==200 || !manifest.headers()["content-type"]?.includes("application/manifest+json"))
      throw new Error("PWA manifest inválido: "+manifest.status()+", "+manifest.headers()["content-type"]);
    const data=await manifest.json();
    if(data.display!=="standalone"||!data.icons?.length)throw new Error("Manifest sem dados de instalação");
    const sw=await page.request.get(url+"/sw.js");
    if(sw.status()!==200||!sw.headers()["content-type"]?.includes("javascript"))throw new Error("Service worker inválido");
  });
  await runTest("Aprofundamento ligado aos quatro cursos por trilha",async()=>{
    await page.goto(url+"/trilhas/web",{waitUntil:"domcontentloaded"});
    await page.getByRole("heading",{name:"Materiais externos relacionados"}).waitFor();
    await page.getByRole("heading",{name:"Referências por tema nesta trilha"}).waitFor();
    const links=page.getByRole("link",{name:/↗/});
    if(await links.count()<4)throw new Error("Referências insuficientes na trilha web");
  });
  await runTest("SQLite real no laboratório SQL",async()=>{
    await page.goto(url+"/sql",{waitUntil:"domcontentloaded"});
    await page.getByRole("heading",{name:"SQL com execução real"}).waitFor({timeout:15000});
    await page.getByRole("button",{name:"▶ Executar SQL"}).click();
    await page.getByText("Consulta executada.",{exact:false}).waitFor({timeout:90000});
    const table=page.getByRole("table");
    await table.getByText("Ana",{exact:true}).waitFor();
    await page.getByLabel("Exercício SQL").selectOption("2");
    await page.getByRole("button",{name:"▶ Executar SQL"}).click();
    await page.getByText("Consulta executada.",{exact:false}).waitFor({timeout:90000});
    await page.getByRole("columnheader",{name:"media"}).waitFor();
  });
  await runTest("Editor web com três arquivos, CSS e JavaScript reais",async()=>{
    await page.goto(url+"/workspace",{waitUntil:"domcontentloaded"});
    await page.getByRole("heading",{name:"Projetos e arquivos"}).waitFor({timeout:20000});
    await page.getByRole("button",{name:/index\.html/}).waitFor();
    await page.getByRole("button",{name:/styles\.css/}).waitFor();
    await page.getByRole("button",{name:/app\.js/}).waitFor();
    await page.getByRole("button",{name:"▶ Atualizar prévia"}).click();
    const iframe=page.frameLocator('iframe[title="Prévia isolada do projeto web"]');
    await iframe.getByRole("heading",{name:"Meu primeiro site"}).waitFor();
    await iframe.getByRole("button",{name:"Testar interação"}).click();
    await iframe.getByText("JavaScript funcionando!").waitFor();
  });
  await runTest("Criação de arquivos e persistência no editor web",async()=>{
    await page.getByLabel("Nome do novo arquivo").fill("src/notas.md");
    await page.getByRole("button",{name:"+ Adicionar arquivo"}).click();
    await page.getByRole("button",{name:"src/notas.md"}).waitFor();
    await page.getByLabel("Editor src/notas.md").fill("Meu rascunho persistente");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:"src/notas.md"}).click();
    await page.getByLabel("Editor src/notas.md").waitFor();
    const content=await page.getByLabel("Editor src/notas.md").inputValue();
    if(content!=="Meu rascunho persistente")throw Error("Arquivo não persistiu: "+content);
  });
    await runTest("Git real: commit, branch e histórico persistente",async()=>{
    await page.goto(url+"/git",{waitUntil:"domcontentloaded"});
    await page.getByRole("heading",{name:"Laboratório Git local"}).waitFor({timeout:25000});
    const editor=page.getByLabel("Conteúdo do README.md");
    await editor.fill("# Exercício Git\n\nMeu commit de teste.\n");
    await page.getByRole("button",{name:"Salvar arquivo"}).click();
    await page.getByRole("button",{name:"git add README.md"}).click();
    await page.getByLabel("Mensagem do commit").fill("Aprende a criar commits");
    await page.getByRole("button",{name:"git commit",exact:true}).click();
    await page.getByText("Aprende a criar commits").waitFor({timeout:25000});
    await page.getByRole("button",{name:/git branch · criar/}).click();
    await page.getByRole("button",{name:/feature\/testes/}).waitFor();
    await page.getByRole("button",{name:/feature\/testes/}).click();
    await page.getByText("Branch: feature/testes").waitFor();
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByText("Branch: feature/testes").waitFor({timeout:25000});
    await page.getByText("Aprende a criar commits").waitFor();
  });
    await runTest("Simulação passo a passo",async()=>{
    await page.goto(url+"/lab",{waitUntil:"domcontentloaded"});
    await page.getByRole("tab",{name:/Simular passo a passo/}).click();
    await page.getByText(/Passo 1\//).waitFor();
    await page.getByRole("button",{name:/Próximo passo/}).click();
    await page.getByText(/Passo 2\//).waitFor();
  });
  await runTest("Python real no laboratório",async()=>{
    await page.getByRole("tab",{name:/Executar de verdade/}).click();
    const btn=page.getByRole("button",{name:/^▶ Executar$/});
    await btn.click();
    const log=page.getByRole("log",{name:"Saída do programa"});
    await log.getByText("Olá, mundo!",{exact:false}).waitFor({timeout:120000});
    const out=await log.innerText();
    if(!out.includes("Olá, mundo!"))throw new Error("Sem stdout real: "+out);
  });
  await runTest("JavaScript real no laboratório",async()=>{
    await page.getByLabel("Linguagem").selectOption("javascript");
    await page.getByRole("button",{name:/^▶ Executar$/}).click();
    const log=page.getByRole("log",{name:"Saída do programa"});
    await log.getByText("Olá!",{exact:false}).waitFor({timeout:30000});
    const out=await log.innerText();
    if(!out.includes("Olá!"))throw new Error("Sem stdout JS: "+out);
  });
  await runTest("Backup válido, persistência e rejeição de arquivo corrompido",async()=>{
    await page.goto(url+"/dados",{waitUntil:"domcontentloaded"});
    const valid={
      version:1,completedLessons:{print:1000},passedExercises:{},openedLessons:{},
      attempts:[],drafts:{},checklist:{},timeoutMs:5000,theme:"light"
    };
    page.once("dialog",d=>d.accept());
    await page.locator('input[type="file"]').setInputFiles({
      name:"backup-valido.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(valid))
    });
    await page.getByRole("status").getByText(/Backup importado com sucesso/).waitFor({timeout:10000});
    await page.reload({waitUntil:"domcontentloaded"});
    const before=await page.locator(".card-surface strong").first().innerText();
    if(before.trim()!=="1")throw new Error("Progresso não persistiu após reload: "+before);
    await page.locator('input[type="file"]').setInputFiles({
      name:"backup-invalido.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({...valid,drafts:null}))
    });
    await page.getByRole("status").getByText(/Arquivo inválido/).waitFor({timeout:10000});
    const after=await page.locator(".card-surface strong").first().innerText();
    if(after.trim()!=="1")throw new Error("Importação inválida substituiu o progresso!");
  });
  await runTest("Seis trilhas e quarenta aulas ampliadas", async()=>{
    await page.goto(url+"/trilhas",{waitUntil:"domcontentloaded"});
    await page.getByRole("heading",{name:"Trilhas de estudo"}).waitFor();
    const cards=await page.getByRole("link",{name:/Abrir trilha/}).count();
    if(cards!==6)throw new Error("Esperadas 6 trilhas, obtidas "+cards);
    await page.goto(url+"/trilhas/python-pro",{waitUntil:"domcontentloaded"});
    await page.getByRole("link",{name:/Compreensões de listas/}).waitFor();
  });
  await runTest("Questão de web e progresso persistente", async()=>{
    await page.goto(url+"/estudar/w-html",{waitUntil:"domcontentloaded"});
    await page.locator('input[type="radio"]').nth(1).check();
    await page.getByRole("button",{name:"Conferir resposta"}).click();
    await page.getByText(/Questão aprovada/).waitFor();
    await page.getByRole("button",{name:"Marcar aula como concluída"}).click();
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByText("✔ Aula concluída").waitFor();
  });
  await runTest("Exercício JavaScript executado e corrigido", async()=>{
    await page.goto(url+"/estudar/w-js",{waitUntil:"domcontentloaded"});
    const editor=page.locator(".cm-content").last();
    await editor.waitFor({timeout:15000});
    await editor.fill('const produto="Livro"; let quantidade=2; quantidade++; console.log(produto, quantidade);');
    await page.getByRole("button",{name:/Corrigir \(executa de verdade\)/}).click();
    await page.getByText(/Todos os casos passaram/).waitFor({timeout:30000});
  });
  await runTest("Rascunhos de projetos persistem após recarga",async()=>{
    await page.goto(url+"/projetos/proj-calculadora",{waitUntil:"domcontentloaded"});
    const edit=page.locator(".cm-content").last();
    await edit.waitFor({timeout:15000});
    await edit.fill('print("projeto salvo")');
    await page.reload({waitUntil:"domcontentloaded"});
    const value=await page.locator(".cm-content").last().innerText();
    if(!value.includes('print("projeto salvo")'))throw new Error("Código editado não persistiu");
  });
  await runTest("Projetos e checklist funcional", async()=>{
    await page.goto(url+"/projetos/proj-calculadora",{waitUntil:"domcontentloaded"});
    await page.getByRole("heading",{name:"Calculadora pessoal de gastos"}).waitFor();
    const checks=page.locator('input[type="checkbox"]');
    const count=await checks.count();
    if(count<4)throw new Error("Checklist de projeto incompleto: "+count);
    for(let i=0;i<count;i++)await checks.nth(i).check();
    await page.getByRole("button",{name:"Concluir após minha revisão"}).click();
    await page.getByText(/Projeto marcado como revisado/).waitFor();
  });
    if(errors.length)throw new Error("Erros JS no navegador: "+JSON.stringify(errors));
  console.log("E2E OK; erros de página registrados:",errors);
}finally{await browser.close();}
