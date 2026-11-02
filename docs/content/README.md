# Conteúdo incorporado e autoria

Snapshot capturado em 02/11/2026. O CódigoLab possui 68 aulas autorais (12 de fundamentos e 56 unidades nas outras cinco trilhas), 8 projetos orientados, um índice de referências às quatro fontes e 615 documentos integrais redistribuíveis servidos pelo próprio site.

| Fonte | Revisão fixada | Documentos locais | Condição |
| --- | --- | ---: | --- |
| Universidade Brasileira Livre | `b995c118fdb3929412004ee041a25c77cb0aa997` | 51 | MIT; aviso integral preservado no manifesto |
| Aprenda Community | `a3fd6b8b13345093e4a68afa3c3bad47cf822e0e` | 564 | Conteúdo de `roadmaps/**`, CC BY-SA 4.0; atribuição e compartilhamento pela mesma licença |
| 30 Dias de Python | Referência à origem | 0 | Não foi identificada licença de redistribuição dos textos; arquivos não republicados |
| freeCodeCamp | Referência à origem | 0 | README distingue BSD-3-Clause do software e copyright dos recursos de `/curriculum`; currículo não republicado |

A licença do Aprenda explicita o escopo `roadmaps/**`. Projetos e bootcamps em outros diretórios continuam vinculados à origem, sem presumir que a licença do código AGPL autoriza a mesma integração dos textos. Livros, vídeos e cursos externos apontados nos documentos UBL também permanecem nos provedores originais. Não há promessa de certificação, parceria ou equivalência integral com as instituições.

Os documentos locais são cópias literais, verificáveis por SHA-256 no `public/content/manifest.json`, que contém autoria, revisão, licença, texto da licença, caminho original e quantidade de bytes. As adaptações de apresentação dos conteúdos Aprenda são disponibilizadas sob CC BY-SA 4.0. A aplicação funciona como agregadora de obras independentes; não incorpora o código AGPL do Aprenda.

O leitor inclui 41 percursos Aprenda com sequência de tópicos, 222 questões interativas, 112 checkpoints (80 de código, 17 de HTML/CSS e 15 de reflexão) e 112 diagramas Mermaid. Metadados, recursos e créditos de cada texto estão disponíveis em um painel próprio, além do download do arquivo literal. As questões têm correção local e progresso persistido. Checkpoints compatíveis mostram código editável/executável ou uma resposta reflexiva salva; trechos que exigem framework, imports de servidor ou compilação de tipos são identificados como desafios de projeto, preservando seu caráter de prática/autoavaliação quando não existe critério executável suportado. Não se alega que todos os testes MDX da origem foram transportados.

MDX nunca é compilado ou avaliado. Um parser restrito aceita apenas literais (strings, objetos, arrays, booleanos, números e null), rejeitando expressões executáveis e templates interpolados. Exemplos dentro de cercas de código permanecem intactos. Diagramas usam Mermaid em modo estrito e são exibidos em iframe sem scripts, origem, formulários ou rede; em falha, o código textual permanece acessível. Código dos checkpoints só roda após ação explícita do usuário no laboratório isolado.

As 16 novas unidades autorais cobrem lógica, binário, complexidade, busca, ordenação, recursão, pilhas/filas, árvores, grafos, probabilidade, memória, processos, concorrência, redes, criptografia e modelagem. As 52 aulas anteriores receberam explicações adicionais específicas de mecanismo, casos limites e prática independente. Dois projetos novos trabalham catálogo ordenado e caminhos em grafos, com rubricas verificáveis.

## Reprodução

1. Obtenha checkouts limpos das duas fontes nas revisões da tabela.
2. Execute `node scripts/import-curriculum.mjs /caminho/ubl /caminho/aprenda`.
3. Execute `npm run test:content`, `npm test`, `npm run typecheck` e `npm run build`.

O importador rejeita revisões diferentes ou árvores sujas antes de modificar o snapshot. Ele não busca automaticamente a versão mais recente, evitando que uma mudança de licença ou conteúdo seja incorporada sem revisão.
