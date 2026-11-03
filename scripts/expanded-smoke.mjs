import assert from'node:assert/strict';
import{launchBrowser}from'./browser.mjs';
const browser=await launchBrowser(),base=process.env.CODIGOLAB_URL;
const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:!!process.env.HTTPS_PROXY}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const waitText=async(locator,text,timeout=90000)=>{await locator.filter({hasText:text}).waitFor({timeout})};
const step=async(name,fn)=>{console.log('INTEGRAÇÃO:',name);await fn();console.log('APROVADO:',name)};
try{
 await step('Python: imports reais e unittest',async()=>{
  await page.goto(base+'/workspace');await page.getByLabel('Projeto ativo').selectOption('python');
  await page.getByRole('button',{name:'▶ Executar arquivo principal'}).click();await waitText(page.getByRole('log'),/Olá, CódigoLab!/);
  await page.getByRole('button',{name:'✓ Executar testes do projeto'}).click();await waitText(page.getByRole('log'),/Todos os testes passaram/);
 });
 await step('JavaScript: módulos locais, TypeScript e testes',async()=>{
  await page.getByLabel('Projeto ativo').selectOption('javascript');await page.getByRole('button',{name:'▶ Executar arquivo principal'}).click();await waitText(page.getByRole('log'),/Resultado: 14/);
  await page.getByRole('button',{name:'✓ Executar testes do projeto'}).click();await waitText(page.getByRole('log'),/Todos os testes passaram/);
  const project={version:1,kind:'javascript',entry:'main.ts',files:{'main.ts':'import {triplo} from "./lib/math.ts"; import data from "./data.json"; console.log(triplo(data.value));','lib/math.ts':'export const triplo=(n:number):number=>n*3;','data.json':'{"value":9}'}};
  await page.evaluate(project=>{const data=JSON.parse(localStorage.getItem('codigolab:v1')||JSON.stringify({version:1,completedLessons:{},passedExercises:{},openedLessons:{},attempts:[],drafts:{},checklist:{},timeoutMs:5000,theme:'light'}));data.drafts['workspace:javascript']=JSON.stringify(project);localStorage.setItem('codigolab:v1',JSON.stringify(data))},project);
  await page.reload();await page.getByLabel('Projeto ativo').selectOption('javascript');await page.getByRole('button',{name:'▶ Executar arquivo principal'}).click();await waitText(page.getByRole('log'),/^27\s/);
 });
 await step('Leitura incorporada de conteúdo e sequência curricular',async()=>{
  await page.goto(base+'/biblioteca');await page.getByLabel('Selecionar fonte').selectOption('aprenda-community');
  await page.getByLabel('Pesquisar na biblioteca').fill('typescript');await page.getByRole('button',{name:'Ler aqui',exact:true}).first().click();
  const reader=page.getByRole('region',{name:'Leitor do material incorporado'});await reader.getByText(/Texto integral incorporado/).waitFor();
  await reader.locator('.external-markdown').filter({hasText:/.{30}/}).waitFor();assert.equal(await reader.getByRole('alert').count(),0);
 });
 await step('Questão importada, prática e diagrama renderizado',async()=>{
  await page.goto(base+'/biblioteca?source=aprenda-community&path=roadmaps/programacao-do-zero/nodes/variaveis.mdx');
  const reader=page.getByRole('region',{name:'Leitor do material incorporado'});
  await reader.getByRole('radio',{name:'meu_nome',exact:true}).check();await reader.getByRole('button',{name:'Conferir resposta'}).click();await reader.getByText(/Correto\./).waitFor();
  await reader.getByRole('heading',{name:'Desafio prático da fonte'}).waitFor();
  await page.goto(base+'/biblioteca?source=aprenda-community&path=roadmaps/acessibilidade-web/nodes/imagens-e-alt.mdx');
  await page.locator('iframe[title="Diagrama do material incorporado"]').first().waitFor({timeout:60000});
  const diagram=page.frameLocator('iframe[title="Diagrama do material incorporado"]').first();await diagram.locator('svg').waitFor();
 });
 await step('API: contrato HTTP, autenticação, CRUD e testes de aceitação',async()=>{
  await page.goto(base+'/api');await page.getByLabel('Exemplo de API').selectOption('1');await page.getByRole('button',{name:'Enviar requisição',exact:true}).click();await page.getByRole('heading',{name:'Resposta HTTP 200',exact:true}).waitFor();
  await page.getByLabel('Exemplo de API').selectOption('2');await page.getByRole('button',{name:'Enviar requisição',exact:true}).click();await page.getByRole('heading',{name:'Resposta HTTP 201',exact:true}).waitFor();
  await page.getByLabel('Exemplo de API').selectOption('3');await page.getByRole('button',{name:'Enviar requisição',exact:true}).click();await waitText(page.getByLabel('Corpo da resposta'),/Aprender contratos HTTP/);
  await page.getByRole('button',{name:/Executar.*testes|Verificar.*contratos|Rodar.*testes/i}).click();await page.locator('ul[aria-live=polite] li').filter({hasText:'Logout sem corpo: 204'}).waitFor();assert.equal(await page.locator('ul[aria-live=polite] li.text-success').count(),8);
 });
 await step('RAG: fontes, MCP e avaliação',async()=>{
  await page.goto(base+'/agentes');await page.getByRole('button',{name:'Executar busca com evidências'}).click();await page.getByRole('heading',{name:'Rastro de execução'}).waitFor();
  await page.getByLabel('Exemplo MCP').selectOption('2');await page.getByRole('button',{name:'Enviar mensagem local'}).click();await waitText(page.getByLabel('Resposta JSON-RPC'),/20/);
  await page.getByRole('button',{name:'Executar avaliação de recuperação'}).click();await page.getByText(/Hit@1:/).waitFor();
 });
 await step('Diagnóstico completo e progresso persistente',async()=>{
  await page.goto(base+'/percurso');await page.getByRole('heading',{name:'Diagnóstico inicial',exact:true}).waitFor();const groups=page.locator('fieldset');assert.equal(await groups.count(),6);
  for(const group of await groups.all())await group.getByRole('radio').first().check();
  await page.getByRole('button',{name:'Ver meu diagnóstico'}).click();await page.getByText(/de 6 respostas corretas/).waitFor();await page.reload();await page.getByText(/de 6 respostas corretas/).waitFor();
 });
 await step('Sincronização cifrada entre aparelhos e controle de conflito',async()=>{
  await page.goto(base+'/dados');await page.getByRole('button',{name:/Criar.*código/}).click();
  const code=await page.getByLabel('Código privado de sincronização').inputValue();assert.match(code,/^[a-f0-9]{64}\.[a-f0-9]{64}$/);
  await page.getByRole('button',{name:/Publicar.*progresso/}).click();await page.getByText(/publicado|publicada/).waitFor();
  const second=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:!!process.env.HTTPS_PROXY}),other=await second.newPage();other.on('dialog',d=>d.accept());
  await other.goto(base+'/dados');await other.getByLabel('Código privado de sincronização').fill(code);
  await other.getByRole('button',{name:/Baixar e conferir/}).click();await other.getByRole('button',{name:'Aplicar neste aparelho'}).click();
  await other.getByText(/Progresso remoto aplicado/).waitFor();
  const transferred=await other.evaluate(()=>JSON.parse(localStorage.getItem('codigolab:v1')));assert.ok(transferred.diagnostic);assert.ok(transferred.drafts['workspace:javascript']);
  await other.getByRole('button',{name:/Publicar.*progresso/}).click();await other.getByText(/publicado|publicada/).waitFor();
  await page.getByRole('button',{name:/Publicar.*progresso/}).click();await page.getByText(/Outro aparelho publicou/).waitFor();
  await other.getByRole('button',{name:'Apagar somente a cópia remota'}).click();await other.getByText(/Cópia remota apagada/).waitFor();await second.close();
 });
 await step('Navegação mobile sem transbordamento',async()=>{for(const route of ['/workspace','/api','/agentes','/percurso','/dados','/biblioteca']){await page.goto(base+route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),route+' overflow');}});
 assert.deepEqual(errors,[]);console.log('INTEGRAÇÃO COMPLETA: sem erros de página.');
}finally{await browser.close()}
