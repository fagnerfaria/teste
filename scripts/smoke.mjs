import { chromium } from "playwright";
const url = process.env.CODIGOLAB_URL || "https://codigolab.pages.dev";
const errors=[];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:390,height:844}});
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
  if(errors.length)throw new Error("Erros JS no navegador: "+JSON.stringify(errors));
  console.log("E2E OK; erros de página registrados:",errors);
}finally{await browser.close();}
