# CódigoLab

Site gratuito para aprender e praticar programação, do zero a projetos com APIs e agentes. React 19, TypeScript, Vite, TanStack Router e CodeMirror. Funciona no navegador do celular e do computador; instalar como PWA é opcional.

## Conteúdo integrado

- 68 aulas/unidades autorais em seis trilhas, com exemplos executáveis e avaliações; oito projetos orientados.
- 615 documentos integrais incorporados: 51 da Universidade Brasileira Livre (MIT) e 564 do escopo autorizado do Aprenda Community (CC BY-SA 4.0).
- 41 percursos, 222 questões e 112 checkpoints do Aprenda. Diagramas Mermaid são renderizados isoladamente; MDX é interpretado como dados, sem executar componentes da origem.
- Índice pesquisável das quatro fontes, com atribuição, revisão, integridade e licenças. Os cursos, vídeos, livros externos e certificações oficiais mantêm suas condições próprias.

A tradução de 30 Dias de Python não apresentou autorização suficiente de redistribuição; o currículo do freeCodeCamp tem copyright próprio, separado do software. Esses materiais, assim como projetos Aprenda fora de roadmaps/**, permanecem acessíveis na fonte original. Os snapshots não incluem livros, vídeos ou sites de terceiros. Veja [proveniência e licenças](docs/content/README.md).

## Prática real

- `/workspace`:arquivos locais Python/JavaScript/TypeScript/JSON e prévia web isolada; imports reais; unittest e arquivos .test.js/.test.ts; pacotes Pyodide em requirements.txt e npm com versão exata em package.json.
- `/lab`:Python e JavaScript reais em Workers, entrada padrão, saída, erros, interrupção e timeout.
- `/sql`:SQLite WASM real, banco fictício descartável por consulta. O laboratório HTTP tem persistência independente.
- `/git`:Git real em IndexedDB, com commits, branches e histórico locais. Sem push/clone remoto.
- `/api`:Request/Response, login/logout fictício, CRUD persistente, filtros e testes de aceitação. Inclui download de um servidor Node 24 completo, sem dependências npm, com testes de HTTP real. O modo de navegador executa o contrato localmente, sem abrir servidor TCP.
- `/agentes`:recuperação lexical editável, extratos com fontes, abstenção, ferramentas JSON-RPC/MCP didáticas e avaliação Hit@k. Não há modelo generativo pago ou conexão remota MCP; o subconjunto estudado declara sua revisão.

O editor não substitui um sistema operacional. Dependências que exigem Node, processos nativos ou um framework de servidor precisam do ambiente apropriado. Os desafios que dependem disso são identificados. Pacotes adicionais são baixados sob demanda e sujeitos à compatibilidade do navegador.

## Aprendizado e dados

`/percurso` reúne diagnóstico, competências e revisão espaçada. Exercícios iniciais possuem múltiplos casos e verificações de contrato; casos e critérios são auditáveis no cliente, sem alegação de avaliação secreta ou certificação oficial.

`/dados` permite backup JSON e sincronização opcional/manual entre aparelhos. O cliente cifra com AES-GCM e uma chave aleatória privada; o servidor D1 armazena apenas o envelope cifrado. Revisões monotônicas impedem sobrescrita por versões antigas, inclusive após exclusão e recriação. O código privado nunca entra em URL ou telemetria e não fica salvo no navegador. Sem ele não há recuperação da cópia remota.

A sincronização inclui progresso, diagnóstico, revisão, rascunhos e projetos do editor. Histórico Git, banco do laboratório HTTP e base RAG têm armazenamento separado. O limite do backup sincronizado é 2 MiB antes da cifra. Falhas de persistência são exibidas, e uma importação não anuncia sucesso quando o navegador recusa a gravação.

## Desenvolvimento e verificação

Requer Node 24 e Python3 para verificar as soluções didáticas.

```sh
npm ci
npm run dev
# Em um checkout novo, gere as rotas antes de verificar tipos:
npm run build
npm run lint
npm run typecheck
npm test
npm run test:content
npm run verify:curriculum
node scripts/worker-security.test.mjs
node scripts/monitor-check.mjs
npm run build
npm run qa
node scripts/runtime-dependencies-smoke.mjs
```

O build copia os motores Python/SQLite/esbuild da instalação versionada para assets nativos. Não publica um proxy de arquivos GitHub/jsDelivr. O núcleo e os documentos visitados podem ser cacheados para leitura offline; pacotes ainda não carregados requerem rede. O script de importação curricular preserva revisões, arquivos e SHA-256; para atualizar fontes, siga docs/content/README.md.

## Publicação e operação

Cloudflare Pages Advanced Mode recebe dist/ com Worker nativo e binding PROGRESS (D1). Schema em cloudflare/schema.sql. O deploy de produção utiliza os mesmos hashes aprovados na prévia. `/health.json` identifica o build; `/api/health` verifica o serviço; `/api/monitor` mostra a última inspeção periódica.

O Worker separado cloudflare/monitor.js verifica site, build, motores WASM e disponibilidade da sincronização a cada seis horas, sem coletar dados dos estudantes. Os controles de admissão protegem o armazenamento gratuito: limite por IP para criação e teto agregado de 400 MiB de envelopes, com respostas explícitas quando indisponível. Backups existentes não expiram automaticamente.

A CI gera um artefato somente após tipos, lint, testes, soluções didáticas e fluxos reais de navegador passarem. A publicação automática por GitHub Actions está preparada e depende de CF_DEPLOY_ENABLED=true e dos Secrets CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID. Sem esses segredos, a CI verifica e entrega o artefato; a publicação pode ser feita pelo conector Cloudflare autorizado. Tokens nunca são commitados.

Para recuperação, use o rollback de Pages para uma implantação previamente homologada. Não há rollback destrutivo do banco nem do progresso do estudante. O monitor registra degradação, sem trocar versões automaticamente.

## Contexto de continuidade

Requisitos, implementação, verificações e limites reais estão em docs/implementation-status.md. A integração de memória Cortex e a telemetria Superlog dependem de autenticação/disponibilidade dos conectores; sua ausência não modifica o funcionamento do site.
