import {describe,it,expect} from 'vitest';
import {UNITS,PROJECTS} from '../lib/content/tracks';
const ids=['cs-logica','cs-binario','cs-complexidade','cs-busca','cs-ordenacao','cs-recursao','cs-pilha-fila','cs-arvores','cs-grafos','cs-probabilidade','cs-memoria','cs-processos','cs-concorrencia','cs-redes','cs-criptografia','cs-modelagem'];
describe('Ciência da Computação aplicada e progressiva',()=>{
 it('ensina disciplinas centrais com explicação, exemplo e prática independentes',()=>{
  for(const id of ids){
   const unit=UNITS.find(u=>u.id===id);expect(unit,`${id} disponível`).toBeDefined();
   expect(unit!.explanation.length).toBeGreaterThanOrEqual(5);
   expect(unit!.explanation.join(' ').length).toBeGreaterThanOrEqual(900);
   expect(unit!.objectives.length).toBeGreaterThanOrEqual(3);
   expect(unit!.challenge).toBeDefined();
  }
 });
 it('oferece projetos avançados com critérios verificáveis',()=>{
  for(const id of ['proj-busca','proj-grafos']){
   const project=PROJECTS.find(p=>p.id===id);expect(project).toBeDefined();
   expect(project!.acceptance.length).toBeGreaterThanOrEqual(4);
  }
 });
});
