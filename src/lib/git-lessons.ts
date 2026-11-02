/** Referência didática para o laboratório Git de navegador. */
export const GIT_STEPS = [
 {id:"init",title:"Inicializar",command:"git init -b main",detail:"Cria um repositório local com histórico próprio, sem conexão à sua conta GitHub."},
 {id:"edit",title:"Editar",command:"git status",detail:"Altere README.md e observe a diferença entre diretório de trabalho e último commit."},
 {id:"stage",title:"Preparar",command:"git add README.md",detail:"Inclua a nova versão no índice, a área de preparação de um commit."},
 {id:"commit",title:"Registrar",command:'git commit -m "Atualiza o README"',detail:"Salve um ponto no histórico com uma mensagem que descreva a alteração."},
 {id:"branch",title:"Ramificar",command:"git branch feature/testes",detail:"Crie uma branch de experimento sem mexer na main."},
 {id:"checkout",title:"Alternar",command:"git switch feature/testes",detail:"Entre na nova branch para continuar o trabalho isolado."},
 {id:"log",title:"Consultar",command:"git log --oneline",detail:"Leia a sequência de commits verificáveis do repositório."},
] as const;

export function validateBranchName(raw:string):string {
 const branch=raw.trim();
 if(branch.length<1||branch.length>80||branch.startsWith("-")||branch.includes("..")||
   branch.includes("\\")||branch.includes("//")||branch.startsWith("/")||
   branch.endsWith("/")||branch.endsWith(".lock")||branch.startsWith("refs/")||
   branch.split("/").some(part=>part.startsWith(".")||!part||! /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part))) {
   throw Error("Nome de branch inválido. Use por exemplo feature/testes, sem espaços ou ..");
 }
 return branch;
}
