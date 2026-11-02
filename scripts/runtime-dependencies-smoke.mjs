import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";
import { serveCandidate } from "./serve-candidate.mjs";

const candidate = process.env.CODIGOLAB_URL ? null : await serveCandidate();
const base = process.env.CODIGOLAB_URL || candidate.url;
const browser = await launchBrowser();
// The managed environment proxies HTTPS with a local CA that headless Chromium does not trust.
// Only this external-network integration context relaxes certificate validation when that proxy exists.
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
const page = await context.newPage();
const errors = [], networkErrors = [];
page.on("dialog", dialog => dialog.accept());
page.on("pageerror", error => errors.push(error.message));
page.on("requestfailed", request => networkErrors.push({url:request.url(),error:request.failure()?.errorText}));
page.on("console", message => { if (message.type() === "error") console.error("BROWSER:",message.text()); });
const execution = page.getByRole("button", { name: "▶ Executar arquivo principal" });
const output = page.getByRole("log", { name: "Saída do programa" });

async function importProject(project) {
  await page.getByLabel("Projeto ativo").selectOption(project.kind);
  const confirmation=page.waitForEvent("dialog");
  await page.getByLabel("Importar arquivo JSON do projeto").setInputFiles({
    name:"project.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(project)),
  });
  await confirmation;
  await page.waitForFunction(({kind,files})=>{const raw=localStorage.getItem("codigolab:v1");const data=raw?JSON.parse(raw):{};const saved=data.drafts?.["workspace:"+kind];return saved&&JSON.stringify(JSON.parse(saved).files)===JSON.stringify(files);},project);
}
async function runAndWait(text, timeout=90000) {
  await execution.click();
  await output.filter({hasText:text}).waitFor({timeout});
  await execution.waitFor({state:"visible",timeout});
  assert.equal(await execution.isEnabled(),true);
}
async function step(name,task) {
  console.log("RUNTIME:",name);
  try { await task(); console.log("APROVADO:",name); }
  catch(error) {
    console.error("DIAGNÓSTICO:",JSON.stringify({name,body:(await page.locator("body").innerText()).slice(-5000),networkErrors,errors}));
    throw error;
  }
}
try {
  await page.goto(base+"/workspace",{waitUntil:"domcontentloaded"});
  await step("Python: dependência numpy real distribuída pelo Pyodide",async()=>{
    await importProject({version:1,kind:"python",entry:"main.py",files:{
      "main.py":'import numpy as np\nprint("NUMPY", int(np.sum([1, 2, 3])))\n',
      "requirements.txt":"numpy\n",
    }});
    await runAndWait(/NUMPY 6/);
  });
  await step("JavaScript: lodash-es@4.17.21 baixado e executado de verdade",async()=>{
    await importProject({version:1,kind:"javascript",entry:"main.js",files:{
      "main.js":'import {chunk} from "lodash-es"; console.log("CHUNKS", chunk([1,2,3],2));',
      "package.json":JSON.stringify({dependencies:{"lodash-es":"4.17.21"}}),
    }});
    await runAndWait(/CHUNKS \[\[1,2\],\[3\]\]/);
  });
  await step("Python: imports atualizados no mesmo Worker sem cache obsoleto",async()=>{
    const project={version:1,kind:"python",entry:"main.py",files:{
      "main.py":'from helper import value\nprint("HELPER", value())\n',
      "helper.py":"def value(): return 10\n",
    }};
    await importProject(project);await runAndWait(/HELPER 10/);
    await importProject({...project,files:{...project.files,"helper.py":"def value(): return 20\n"}});
    await runAndWait(/HELPER 20/);
  });
  await step("Python: limite de tempo interrompe loop e permite nova execução",async()=>{
    await importProject({version:1,kind:"python",entry:"main.py",files:{"main.py":"while True: pass\n"}});
    const start=Date.now();await runAndWait(/Tempo limite atingido/,20000);
    assert.ok(Date.now()-start<15000,"O loop precisa ser encerrado em até 15 segundos com timeout padrão de 5 segundos.");
    await importProject({version:1,kind:"python",entry:"main.py",files:{"main.py":'print("RECUPERADO")\n'}});
    await runAndWait(/RECUPERADO/);
  });
  await step("JavaScript: saída ilimitada é interrompida antes de bloquear a página",async()=>{
    await importProject({version:1,kind:"javascript",entry:"main.js",files:{"main.js":'while (true) console.log("x".repeat(1024));'}});
    await execution.click();
    await page.getByText(/Terminou com erro/).waitFor({timeout:20000});
    await output.filter({hasText:/limite de 200 mil caracteres/}).waitFor();
    assert.ok((await output.innerText()).length<=205000,"Saída renderizada deve respeitar o limite de 200 mil caracteres.");
    await importProject({version:1,kind:"javascript",entry:"main.js",files:{"main.js":'console.log("JS RECUPERADO");'}});
    await runAndWait(/JS RECUPERADO/);
  });
  assert.deepEqual(errors,[]);
  console.log("RUNTIME COMPLETO: dependências, atualização de imports, interrupção e recuperação aprovadas.");
} finally {
  await browser.close();
  await candidate?.close();
}
