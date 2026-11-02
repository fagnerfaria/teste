/** Authorial follow-up: concrete mechanisms, failure cases and an independent experiment. */
export const LESSON_DEPTH:Record<string,string[]>={
 programa:[
  'Antes de escrever código, descreva entrada, transformação e saída. Para calcular o dobro, a entrada é um número, a transformação é multiplicar por dois e a saída é o resultado. Essa descrição torna possível conferir o programa sem depender da sua aparência.',
  'Experimente trocar somente uma parte por vez no exemplo. Primeiro altere o texto entre aspas, depois acrescente outra instrução. Observe que o computador não interpreta uma frase em português como uma instrução Python. Quando houver erro, leia a última linha da mensagem e localize a linha citada antes de modificar o restante.',
 ],
 print:[
  'print avalia as expressões recebidas e depois formata a saída. Assim, print(2 + 3) mostra 5, enquanto print("2 + 3") mostra os caracteres da expressão. As aspas mudam o significado do conteúdo; elas não fazem parte do texto exibido.',
  'Use sep para controlar a separação entre argumentos e end para controlar o final da chamada. Faça uma previsão antes de executar print("A", "B", sep="/", end="!"). Em exercícios de saída, compare também espaços e quebras de linha: um resultado numericamente correto pode estar apresentado em um formato diferente do contrato.',
 ],
 variaveis:[
  'Na instrução pontos = pontos + 5, primeiro o Python avalia o lado direito usando o valor atual. Só depois associa o nome ao resultado. Se pontos ainda não existe, a leitura falha com NameError; a atribuição não cria um valor anterior por conta própria.',
  'Faça uma tabela manual com uma linha para cada instrução e uma coluna por variável. Para x=2, y=x+3 e x=9, os valores finais são x=9 e y=5. A variável y guarda o resultado da conta naquele momento; ela não vira uma fórmula que acompanha alterações futuras em x.',
 ],
 tipos:[
  'Escolha o tipo conforme a operação necessária. Um CEP é um identificador textual, mesmo contendo dígitos: convertê-lo para inteiro pode eliminar zeros iniciais. Uma quantidade usada em uma soma, por outro lado, precisa de representação numérica adequada.',
  'Converter não é validar qualquer entrada. int("12x") produz ValueError e int(3.9) descarta a parte fracionária em direção a zero. Experimente entradas válidas e inválidas separadamente. Ao receber informação de uma pessoa, explique o formato esperado e trate a falha sem inventar um valor.',
 ],
 operadores:[
  'A divisão / retorna um resultado de ponto flutuante; // faz divisão pelo piso, que merece atenção com negativos. Por exemplo, -7 // 2 é -4. O operador % se relaciona a essa regra para que a igualdade a = (a // b) * b + (a % b) continue válida para divisor não nulo.',
  'Teste uma regra com valor abaixo do limite, exatamente no limite e acima dele. Se uma nota mínima é sete, nota >= 7 inclui sete e nota > 7 não inclui. Evite ajustar o operador apenas para fazer um exemplo passar: primeiro descreva a regra pretendida.',
 ],
 condicionais:[
  'Em uma cadeia if/elif/else, somente o primeiro bloco cuja condição for verdadeira executa. Dois if independentes podem executar os dois blocos. Use a cadeia quando as categorias forem mutuamente exclusivas e estruturas separadas quando várias ações puderem acontecer juntas.',
  'A indentação também determina quais instruções estão fora da decisão. Acrescente um print sem espaços no início após o bloco e confira que ele executa nos dois caminhos. Depois teste as fronteiras da classificação, incluindo igualdade, para verificar se existe intervalo sem tratamento.',
 ],
 loops:[
  'range(início, fim, passo) não inclui o limite final. Para mostrar de um a cinco, use range(1, 6). Um acumulador deve ser inicializado antes do laço; se ele for reiniciado dentro, você perde o trabalho das iterações anteriores.',
  'Para um while, identifique a condição inicial, o que muda a cada passagem e por que o término será alcançado. Simule duas iterações no papel. Se não houver uma variável ou estado que aproxime a condição de ser falsa, investigue a possibilidade de repetição infinita antes de executar.',
 ],
 listas:[
  'Índices de listas começam em zero. Uma lista com quatro elementos tem posições de zero a três; acessar quatro produz IndexError. Um índice negativo conta a partir do final, mas ainda precisa estar dentro dos limites. Uma lista vazia não possui primeiro nem último elemento.',
  'append modifica a lista e devolve None. Portanto, numeros = numeros.append(5) substitui o nome por None e perde a referência anterior. Compare o estado antes e depois da chamada e teste também uma lista vazia, especialmente ao usar max, que exige algum elemento.',
 ],
 dicionarios:[
  'Um dicionário associa chaves únicas a valores. Reatribuir a mesma chave substitui o valor anterior; não cria um segundo registro. Quando as chaves representam identificadores externos, valide duplicatas antes de sobrescrever dados importantes.',
  'A expressão chave in dados verifica presença da chave, enquanto dados.get(chave) pode devolver None tanto por ausência quanto por um valor explicitamente armazenado. Se essa distinção importa, use in ou um sentinela. Teste chave presente, ausente e presente com valor zero, que não deve ser confundido com ausência.',
 ],
 funcoes:[
  'Uma função recebe argumentos, executa seu corpo e pode devolver um resultado com return. print apenas exibe informação. Uma função que imprime uma soma e não usa return devolve None; isso impede reutilizar o resultado em outro cálculo.',
  'Separe cálculo e apresentação: soma(a,b) deve devolver a soma, e o chamador decide como mostrá-la. Teste a função diretamente com assert antes de conectar input e print. Essa separação concentra as regras e evita que toda verificação precise simular uma interação humana.',
 ],
 erros:[
  'Diferencie erro de sintaxe, exceção durante execução e resultado logicamente incorreto. Um programa pode terminar sem exceções e ainda calcular algo errado. Mensagens do interpretador ajudam a localizar falhas de execução, mas a regra do problema é o critério para conferir o resultado.',
  'Reproduza o erro com a menor entrada possível. Confira os valores das variáveis imediatamente antes da falha e faça uma hipótese específica. Altere uma coisa, execute novamente e registre um teste que falhava antes da correção. Capturar toda exceção e continuar pode apenas esconder a causa.',
 ],
 arquivos:[
  'Arquivos associam um caminho a uma sequência de bytes. Ao trabalhar com texto, escolha uma codificação, como UTF-8, e use with para fechar o recurso mesmo quando ocorrer uma exceção. Os modos r, w e a têm efeitos diferentes: w pode substituir o conteúdo existente, enquanto a acrescenta ao final.',
  'No laboratório, os arquivos pertencem a um sistema virtual do Worker, sem acesso livre às pastas do aparelho. Escreva um texto fictício, leia-o de volta e compare exatamente o conteúdo. Em projetos persistentes, diferencie sucesso da escrita, confirmação da persistência e exportação para um backup que o usuário controla.',
 ],
 projeto:[
  'Um projeto pequeno também precisa de requisitos verificáveis. Divida o comportamento em entrada, validação, cálculo e apresentação. Conclua uma parte que funcione de ponta a ponta antes de acrescentar mais opções ou telas.',
  'Defina uma lista de exemplos com resultado conhecido e inclua ausência de dados e formato inválido. Salve uma versão que passa nos testes antes de experimentar melhorias. Ao encerrar, explique quais entradas o programa aceita e quais limites ainda possui; isso é parte da entrega técnica.',
 ],
 'p2-comprehensions':[
  'Leia a compreensão na ordem do fluxo: para cada item, confira a condição e então calcule a expressão. Os nomes criados dentro da compreensão não precisam existir antes. Se a expressão tiver efeitos colaterais ou várias decisões difíceis, um for comum tende a explicar melhor a intenção.',
  'Experimente primeiro uma lista vazia e depois valores negativos. Compare o resultado com uma implementação usando append em um laço independente. Uma compreensão cria todos os resultados na memória; para um fluxo grande consumido uma única vez, uma expressão geradora pode evitar essa lista intermediária.',
 ],
 'p2-sets':[
  'Elementos de um conjunto precisam ser hashable: inteiros, strings e tuplas apropriadas funcionam, enquanto listas mutáveis não. Usar um set perde duplicações, portanto ele não serve quando a quantidade de ocorrências é informação relevante.',
  'Faça uma previsão para {1,2,3} - {2,4} e confira que só permanecem 1 e 3. Depois troque a ordem dos operandos: a diferença não é comutativa. Para exibir resultados em testes, ordene explicitamente; não dependa da ordem de iteração do set.',
 ],
 'p2-tuplas':[
  'Uma tupla de um item precisa da vírgula: (3,) é tupla e (3) é apenas um inteiro entre parênteses. A imutabilidade do contêiner não torna imutáveis os objetos internos. Uma tupla contendo uma lista ainda permite modificar essa lista.',
  'O desempacotamento pode tornar contratos claros, como nome, idade = registro. Se os dados vêm de fora, confira a quantidade de campos antes de presumir esse formato. Experimente um campo a menos e observe ValueError, distinguindo-o de erro de conversão numérica.',
 ],
 'p2-string':[
  'Strings são imutáveis: strip e lower devolvem novos textos. Se o resultado não for guardado ou usado, o valor original permanece igual. Além disso, normalizar nomes e identificadores exige uma política; transformar tudo em minúsculas pode ser correto para comparação e inadequado para apresentação.',
  'Teste uma entrada com espaços nas pontas, outra sem separador e outra com separadores extras. Use csv para dados CSV reais, pois split não compreende campos entre aspas. Ao formatar números, escolha conscientemente as casas decimais sem confundir apresentação arredondada com o valor usado nos cálculos.',
 ],
 'p2-oop':[
  'Atributos de instância pertencem a cada objeto. Atributos mutáveis definidos na classe podem ser compartilhados entre instâncias, causando interferência inesperada. Inicialize coleções específicas de uma entidade dentro de __init__, atribuindo-as a self.',
  'Uma boa classe protege uma regra, como não aceitar um depósito negativo. Valide essa condição no método e teste dois objetos para conferir independência de estado. Se o problema só pede transformar um valor sem estado persistente, uma função simples costuma oferecer uma interface menor.',
 ],
 'p2-json':[
  'Depois do parse, confira o tipo do objeto principal e de cada campo antes de acessar ou calcular. json.loads pode produzir uma lista, número ou null, e não apenas um dicionário. Capturar JSONDecodeError trata sintaxe inválida, mas não detecta um documento válido com a estrutura errada.',
  'Faça um teste para texto inválido, outro para campo ausente e outro para valor com tipo incorreto. Evite usar eval para interpretar JSON: ele executa linguagem Python e altera completamente o risco da operação. Serializar com dumps também não autoriza salvar segredos em um arquivo de backup público.',
 ],
 'p2-erros':[
  'Capture a exceção no ponto em que você consegue tomar uma decisão útil. Converter entrada inválida em uma mensagem é diferente de esconder uma falha interna inesperada. Exceções específicas preservam a capacidade de identificar defeitos que não estavam previstos no contrato.',
  'Um bloco finally executa mesmo quando há erro, sendo útil para limpeza. Para arquivos, with oferece uma forma mais direta de garantir fechamento. Crie um teste em que a operação falha e verifique que o programa informa a falha sem produzir um resultado de sucesso fictício.',
 ],
 'p2-testes':[
  'Escolha resultados esperados independentemente da implementação. Um teste que usa a mesma conta errada para gerar a expectativa não detecta o defeito. Para uma função de soma, use literais conhecidos e inclua zero, negativos e limites definidos pelo contrato.',
  'Observe o teste falhar para a razão correta antes de confiar nele. Depois da correção, rode os testes relacionados e o conjunto completo. Uma saída “ok” impressa pelo próprio programa não prova que asserções foram executadas; a verificação precisa terminar com erro quando o comportamento esperado não é atendido.',
 ],
 'w-html':[
  'A semântica comunica a função de cada elemento para navegador, leitor de tela e quem mantém o código. Use button para uma ação e a para navegação. Um div com evento de clique não recebe automaticamente comportamento de teclado, foco e significado de botão.',
  'Associe label e input por for/id, mantenha títulos em hierarquia coerente e use texto alternativo quando a imagem transmite informação. Teste a página só com teclado: se você não consegue alcançar ou identificar uma ação, o HTML e seus controles precisam ser revistos.',
 ],
 'w-css':[
  'O modelo de caixa combina conteúdo, padding, borda e margem. Com box-sizing:border-box, a largura declarada inclui conteúdo, padding e borda. Isso facilita prever se um elemento cabe em uma tela estreita. Uma largura fixa grande pode gerar rolagem horizontal mesmo quando o texto parece responsivo.',
  'Comece por uma coluna legível e use media queries para aproveitar telas maiores. Teste 320 pixels, texto ampliado e conteúdo longo sem espaços. Flex e grid resolvem relações de layout; não use posições absolutas para organizar todo o conteúdo quando o fluxo normal já atende ao objetivo.',
 ],
 'w-js':[
  'const impede reatribuir o nome, mas não congela um objeto ou array. const tarefas=[] ainda permite tarefas.push("estudar"). let permite reatribuição. Evitar var em código novo simplifica o raciocínio sobre escopo, mas compreender código legado ainda exige reconhecer suas regras.',
  'Operadores podem converter tipos de forma implícita: "2" + 3 produz texto, enquanto outras operações tentam conversão numérica. Prefira validação e conversão explícitas na entrada. Teste o valor e também seu tipo antes de concluir que duas saídas visualmente parecidas são equivalentes.',
 ],
 'w-arrays':[
  'map transforma cada elemento e devolve um novo array; filter seleciona elementos; reduce combina em um acumulador. forEach é voltado a percorrer com efeitos e não devolve um array transformado. Escolher o método pelo contrato comunica melhor a intenção do que apenas encadear operações.',
  'Evite modificar o array enquanto depende dos índices da mesma iteração. Para ordenar números, forneça comparador em sort((a,b)=>a-b), pois a ordem padrão trata representações textuais. Confira arrays vazios e duplicatas e lembre que sort altera o array original.',
 ],
 'w-dom':[
  'O DOM é a representação da página em objetos. querySelector pode retornar null quando não encontra um elemento. Faça a seleção depois de o elemento existir e trate a ausência em vez de presumir que toda mudança de HTML preservará o mesmo identificador.',
  'Use textContent para inserir texto recebido de uma pessoa. innerHTML interpreta marcação e pode introduzir XSS quando recebe entrada não confiável. Teste digitando uma sequência parecida com HTML e confira que ela aparece como texto, sem criar elementos ou executar eventos.',
 ],
 'w-async':[
  'Uma função async sempre devolve uma Promise. await suspende aquela função até a Promise resolver ou rejeitar, sem bloquear a execução inteira do navegador. Uma falha pode ser capturada com try/catch no ponto do await. Esquecer await pode fazer você trabalhar com a Promise em vez dos dados.',
  'Quando operações independentes podem ocorrer juntas, Promise.all reduz espera sequencial, mas rejeita se uma delas rejeitar. allSettled permite inspecionar cada resultado. Adicione estados de carregamento e erro na interface e impeça que uma resposta antiga sobrescreva uma consulta mais recente.',
 ],
 'w-typescript':[
  'TypeScript verifica contratos durante o desenvolvimento, mas suas anotações desaparecem na execução. Declarar uma resposta remota como Usuario não transforma um objeto inválido em usuário válido. Use uma validação em tempo de execução para dados que cruzam rede, armazenamento ou importação de arquivo.',
  'Uniões discriminadas representam estados que não podem ser confundidos, como {status:"ok",dados:...} e {status:"erro",mensagem:...}. Depois de testar status, o compilador consegue restringir os campos disponíveis. Evite any quando ele apenas silencia uma dúvida real sobre o contrato.',
 ],
 'w-accessibility':[
  'Acessibilidade precisa participar do comportamento, não só do estilo. Um controle deve ter nome, papel e estado compreensíveis. O foco precisa permanecer visível e seguir uma ordem coerente. Não remova outline sem oferecer uma indicação equivalente.',
  'Mensagens após uma ação podem usar role=status ou aria-live apropriado para serem anunciadas. Teste teclado, ampliação de texto e tela estreita; ferramentas automáticas encontram parte dos problemas, mas não decidem sozinhas se uma instrução é clara ou se o fluxo pode ser concluído.',
 ],
 'e-terminal':[
  'Um comando é interpretado pelo shell antes de chamar o programa. Espaços e aspas podem mudar quantos argumentos ele recebe; caracteres especiais podem disparar redirecionamentos ou substituições. Nunca cole uma instrução desconhecida sem compreender seus efeitos e o diretório em que ela será executada.',
  'Comece por comandos de leitura, como pwd e ls, antes de qualquer mutação. Entenda o caminho relativo em relação ao diretório atual e o absoluto a partir da raiz. No CódigoLab, blocos shell são documentação; os laboratórios não concedem acesso ao sistema operacional do aparelho.',
 ],
 'e-git':[
  'Git distingue alterações no diretório de trabalho, conteúdo preparado no índice e commits do histórico. git add registra o estado daquele momento; se você editar o arquivo depois, a nova alteração ainda não estará preparada. Revise também git diff --staged antes do commit.',
  'Um commit é um ponto de histórico, não uma cópia de segurança remota por si só. O laboratório usa um repositório local no navegador e pode perder dados se o armazenamento for apagado. Exporte o trabalho e compreenda a diferença entre commit local e push para um serviço remoto.',
 ],
 'e-branches':[
  'Uma branch é uma referência móvel para um commit. Criá-la não duplica todos os arquivos fisicamente; os commits compartilham o histórico anterior. Ao alternar versões, mudanças não commitadas podem impedir a operação ou continuar presentes, dependendo dos arquivos afetados.',
  'Em um conflito, não escolha um lado automaticamente pela posição no arquivo. Reconstrua a regra esperada, integre as duas intenções quando necessário e remova os marcadores. Depois rode os testes do cenário inteiro, pois uma resolução sintaticamente válida ainda pode eliminar comportamento.',
 ],
 'e-reviews':[
  'Uma revisão útil começa pelo problema e pelo comportamento esperado. Leia o diff e confronte cada mudança com o requisito, incluindo erros e entradas limites. A aprovação de testes reduz incerteza, mas não demonstra que o requisito correto foi escolhido.',
  'Descreva um defeito com gatilho, resultado atual e impacto. Separe erros reais de preferências de estilo e explique a evidência que sustenta a conclusão. Ao corrigir o PR, revise o diff final para não incluir arquivos de debug, segredos ou mudanças sem relação com o pedido.',
 ],
 'e-tests':[
  'Testes unitários verificam uma regra delimitada; testes de integração verificam a colaboração real entre partes; testes de ponta a ponta percorrem o fluxo como um usuário. Uma boa distribuição depende de onde os riscos estão, não de uma quantidade fixa por camada.',
  'Evite testar detalhes privados que podem mudar sem alterar o comportamento. Prefira entrada e saída por interfaces públicas e dependências controláveis. Mantenha relógio, aleatoriedade e rede determinísticos quando não forem o objeto da verificação, reduzindo falhas intermitentes.',
 ],
 'e-ci':[
  'Uma pipeline deve construir o mesmo commit que será publicado. Testar a branch antiga enquanto publica arquivos novos cria uma evidência sem relação com a entrega. Registre revisão, comandos, resultado e artefato para permitir reprodução e diagnóstico.',
  'Um rollback confiável promove um artefato anterior conhecido, sem depender de reconstruir dependências que podem ter mudado. Separe permissões de teste e publicação e disponibilize segredos apenas na etapa que precisa deles. A conclusão da pipeline deve ser observada, não presumida após iniciá-la.',
 ],
 'e-sql':[
  'SELECT define colunas, FROM a origem e WHERE o filtro. Sem ORDER BY, o banco não promete uma ordem específica. COUNT(*) conta linhas, enquanto agregações com NULL têm regras próprias; teste valores ausentes para não interpretar uma média ou contagem de maneira incorreta.',
  'Use parâmetros para valores recebidos de usuários, em vez de concatenar trechos SQL. A consulta e os dados devem atravessar canais separados. No laboratório SQLite, experimente filtros, agrupamentos e junções com dados fictícios e confira manualmente um conjunto pequeno antes de generalizar.',
 ],
 'e-security':[
  'Uma dependência executa dentro das permissões do ambiente que a carrega. Conferir nome, origem, versão e licença reduz erros de instalação e mantém a construção reproduzível. Um scanner sem alertas não prova ausência de vulnerabilidades; ele cobre apenas o que consegue reconhecer.',
  'Defina que dados precisam ser protegidos, quais ações podem causar dano e quem tem permissão para executá-las. Segredos não devem estar no código do navegador, mesmo minificado. Se uma chave foi commitada, removê-la do arquivo atual não a apaga do histórico: revogação e rotação continuam necessárias.',
 ],
 'a-http':[
  'Separe falha de transporte de resposta HTTP com erro. fetch pode resolver normalmente para 404 ou 500; confira response.ok antes de tratar o corpo como sucesso. Depois valide o formato dos dados, pois o tipo de conteúdo anunciado não garante que o contrato esteja correto.',
  'Defina timeout, limite de tamanho e comportamento quando o usuário cancela. Registre status e duração sem guardar tokens ou dados pessoais desnecessários. O laboratório de APIs oferece um ambiente local de aprendizado; ele não é um servidor público disponível para outros aparelhos.',
 ],
 'a-json':[
  'Um documento JSON válido pode conter tipos inesperados. Antes de usar total como número, confira typeof, finitude e limites do domínio. Um campo numérico armazenado como string deve ser convertido apenas se o contrato autorizar esse formato.',
  'Desenhe três testes: corpo malformado, formato válido sem campo obrigatório e documento correto. Cada falha merece uma mensagem diferente. Rejeitar dados inconsistentes é melhor do que produzir um resultado calculado a partir de zeros inventados silenciosamente.',
 ],
 'a-auth':[
  'Autenticação identifica uma entidade; autorização decide o que ela pode fazer. Estar autenticado não concede acesso a todos os registros. Verifique autorização no servidor para cada operação e recurso, incluindo exportação e leitura de detalhes.',
  'Tokens devem ter escopo e duração apropriados. Um segredo colocado no bundle web pode ser lido por quem usa a página, mesmo sem aparecer na tela. Para testar, use identidades fictícias e prove que um usuário não consegue acessar dados de outro alterando apenas um identificador.',
 ],
 'a-pagination':[
  'Paginação por offset depende da posição dos registros, que pode mudar quando novos itens entram. Paginação por cursor usa um marcador que representa continuidade em uma ordenação estável. A escolha afeta consistência, performance e capacidade de voltar a páginas anteriores.',
  'Interrompa quando não houver próximo cursor, quando a página estiver vazia conforme o contrato ou quando um limite explícito for atingido. Detecte cursor repetido para evitar um laço infinito. Teste uma página, várias páginas e uma resposta que repete o mesmo marcador.',
 ],
 'a-retry':[
  'Uma retentativa deve tratar falhas transitórias, não mascarar qualquer erro. Um pedido malformado não se corrige repetindo-o. Para limites de taxa, respeite Retry-After quando presente e aplique espera progressiva com limite total de tempo e tentativas.',
  'Antes de repetir uma mutação, determine se a operação é idempotente ou possui chave de idempotência. Uma resposta perdida não prova que a ação falhou no servidor. Teste uma ação que terminou, mas cuja resposta não chegou, e confira que a repetição não duplica o efeito.',
 ],
 'a-files':[
  'Trate caminhos recebidos como dados não confiáveis. Componentes “..”, caminhos absolutos e links simbólicos podem levar a um local diferente do pretendido. Valide o destino normalizado dentro de um diretório autorizado antes de ler, sobrescrever ou excluir.',
  'Para mudanças em lote, apresente primeiro uma lista de ações e mantenha um mecanismo de reversão quando possível. Diferencie nome igual de conteúdo igual usando uma comparação adequada. No browser, os arquivos do projeto são virtuais; eles não autorizam explorar pastas arbitrárias do aparelho.',
 ],
 'a-workflows':[
  'Modele um fluxo por gatilho, entradas, etapas, condições de saída e tratamento de falha. Especifique qual etapa pode ser repetida e quais efeitos precisam de confirmação. Um diagrama sem essas regras pode esconder duplicações e estados intermediários difíceis de recuperar.',
  'Registre uma identificação da execução e o resultado de cada etapa, omitindo dados sensíveis. Se a terceira etapa falhar depois de duas ações concluídas, não reinicie tudo automaticamente. Defina retomada ou compensação conforme o efeito de cada etapa e teste esse caminho antes da produção.',
 ],
 'a-mcp':[
  'MCP organiza comunicação entre aplicações e capacidades expostas por servidores, mas o protocolo não decide por si só quais ações são aceitáveis. A aplicação cliente precisa conferir identidade, permissões, esquema dos argumentos e resultado, além de aplicar confirmação quando necessária.',
  'Uma descrição de ferramenta é metadado e pode conter texto não confiável. Não transforme esse texto em permissão para ler segredos ou enviar dados. No laboratório, chamadas e mensagens usam dados locais de teste, permitindo inspecionar requisição, resposta e erros sem chaves externas.',
 ],
 'ai-llm':[
  'Tokens não correspondem necessariamente a palavras inteiras. O limite de contexto inclui instruções, documentos e, conforme a interface, parte da resposta. Acrescentar mais texto sem organização pode reduzir a atenção aos fatos decisivos e aumentar custo e latência.',
  'Diferencie conhecimento aprendido, contexto fornecido e resultado de ferramenta. Uma resposta fluente não demonstra que o modelo consultou a internet ou executou código. Exija evidência dessas operações quando elas forem necessárias e permita que o sistema diga que um dado está ausente.',
 ],
 'ai-prompt':[
  'Um prompt verificável descreve o que conta como sucesso. Em vez de “analise tudo”, delimite entrada, critérios, saída esperada e tratamento de lacunas. Exemplos precisam representar o comportamento desejado sem introduzir fatos que serão copiados para todos os casos.',
  'Guarde uma versão do prompt e um conjunto fixo de avaliações antes de alterá-lo. Compare erros e efeitos de segunda ordem, como omissões e excesso de confiança. Um único exemplo melhor não basta para concluir que a nova versão é superior em todos os cenários.',
 ],
 'ai-structured':[
  'Validação de formato e veracidade são etapas diferentes. Um JSON pode obedecer ao esquema e ainda conter uma data inventada. Inclua campos de evidência ou ausência quando a tarefa exigir rastreabilidade e confira esses dados contra a fonte original.',
  'Defina campos obrigatórios, enumerações e limites numéricos. Rejeite propriedades perigosas ou desconhecidas quando o contrato exigir estriteza. Não tente corrigir silenciosamente qualquer resposta: registre a falha e estabeleça uma política limitada de nova tentativa.',
 ],
 'ai-tools':[
  'Uma ferramenta deve oferecer um contrato estreito: argumentos aceitos, efeitos, permissões e erros. Separe leitura de mutação e valide os argumentos fora do modelo. A frase “o usuário autorizou” produzida por um modelo não substitui a autorização real do usuário.',
  'Limite quantidade de etapas e detecte ciclos de chamadas sem progresso. Após uma mutação, confira o estado retornado por uma fonte confiável. Ao avaliar, inclua ferramenta indisponível, resposta parcial e tentativa de executar uma ação fora do escopo autorizado.',
 ],
 'ai-rag':[
  'Uma pipeline RAG inclui ingestão, extração de texto, divisão em trechos, indexação, recuperação e geração. Cada etapa pode perder informação. Uma tabela dividida entre trechos ou uma exceção em página distante pode alterar completamente a interpretação do trecho recuperado.',
  'Registre documento, versão e posição de cada passagem. Teste uma pergunta cuja resposta não está no acervo: o comportamento esperado é reconhecer ausência, não completar com invenção. No laboratório local, a recuperação lexical é determinística e não deve ser apresentada como um modelo de embeddings treinado.',
 ],
 'ai-vectors':[
  'Similaridade de cosseno divide o produto escalar pelo produto das normas. Vetores de norma zero precisam de tratamento explícito para evitar divisão por zero. Embeddings gerados por modelos diferentes geralmente não podem ser misturados no mesmo espaço sem verificação.',
  'Uma alteração de modelo ou estratégia de trechos pode exigir reindexação. Avalie a recuperação com perguntas e documentos relevantes conhecidos, observando falsos positivos e omissões. Similaridade alta indica proximidade nesse espaço, sem provar correção factual ou autorização de acesso.',
 ],
 'ai-evals':[
  'Cada caso de avaliação deve ter entrada, resultado esperado, critério e evidência. Separe erros de recuperação, raciocínio, formato e ação. Um critério como “resposta boa” é difícil de reproduzir e permite que duas pessoas aprovem comportamentos muito diferentes.',
  'Mantenha casos adversariais e limites que o sistema não viu durante os ajustes. Ao mudar código, prompt ou modelo, rode novamente os casos e compare regressões. Apresente tamanho da amostra e falhas observadas, sem transformar uma taxa local em garantia de produção.',
 ],
 'ai-safety':[
  'Defina a origem e a autoridade de cada entrada. Um documento pode conter instruções porque está descrevendo um procedimento, sem ter autoridade para modificar o comportamento do agente. Separe conteúdo recuperado de instruções confiáveis e aplique permissões fora do modelo.',
  'Minimização de dados reduz exposição: envie apenas os trechos necessários, com política de retenção apropriada. Inclua nos testes tentativas de extrair segredos, alterar destinatários e autorizar ações por texto de uma página. A resposta segura deve preservar a tarefa legítima sem obedecer à instrução maliciosa.',
 ],
};
