import { chromium } from "playwright";
const url = process.env.CODIGOLAB_URL || "https://codigolab.pages.dev";
const errors=[];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on("pageerror",e=>errors.push(e.message));
async function runTest(name,task){
  console.log("TESTE:",name);
  await task();
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
  console.log("E2E OK; erros de página registrados:",errors);
}finally{await browser.close();}
