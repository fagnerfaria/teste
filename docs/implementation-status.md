# CódigoLab: estado de implementação

Atualização de 02/11/2026. Repositório: fagnerfaria/teste, branch codigolab. Site: https://codigolab.pages.dev.

## Requisitos e entrega

| Área | Implementação verificável | Limite explícito |
|---|---|---|
| Integração das quatro fontes | Índice pesquisável, 615 documentos completos com revisões, licenças e SHA-256; 41 percursos | Conteúdo sem autorização permanece na origem; vídeos/livros de terceiros não são copiados |
| Aulas | 12 aulas iniciais +56 unidades, incluindo CS/matemática; explicação, exemplo e exercício | Material autoral complementar, sem alegar equivalência com diploma/certificação externa |
| Editor | Python/JS/TS/JSON multiarquivos, imports, dependências e testes reais | Navegador não fornece sistema operacional ou qualquer pacote nativo arbitrário |
| Backend | API local funcional, auth fictícia, CRUD persistente e8 testes; servidor Node24 exportável com HTTP real e testes | Servidor exportado precisa Node/host; navegador executa contrato Request/Response local |
| IA/agentes | Base editável, busca lexical, extratos citados, abstenção, rastros, schemas MCP/JSON-RPC e avaliação | Não existe modelo generativo conectado nem transporte remoto MCP |
| Avaliação | Múltiplos casos, bordas/contratos, diagnóstico, feedback por linha;222 questões importadas | Não há testes secretos no frontend; questões reflexivas/projetos incluem autoavaliação |
| Projetos | Oito projetos orientados, execução local, unittest/testes JS, exportação backend | Não há correção automática de toda rubrica nem execução de frameworks de servidor no browser |
| Progresso | Revisão espaçada, competências, backup e sync manual cifrada com controle de conflito | Git e bancos locais separados não são sincronizados |
| Infraestrutura | Assets nativos Pages, motores versionados, D1, integridade, monitor de6h e recuperação por versão | Publicação automática da CI depende de Secrets; não são criados/commitados tokens de longa duração |
| Homologação | Tipos/lint,60 testes Vitest,5 testes de conteúdo,35 soluções, testes Worker/monitor,27 fluxos de navegador e5 fluxos de dependências | Chromium133 desktop/mobile simulado; não foi executada matriz física de todos os browsers |

## Evidência de verificação

- `npm run check`: tipos, lint, 60 testes de módulos, cinco testes de integridade/leitor, 35 soluções Python/JS e segurança do Worker/monitor.
- `npm run build`: build estático com motores locais, licenças e manifesto.
- `npm run qa`: 18 fluxos anteriores +nove integrações novas, com CSP e D1 equivalentes aos da publicação.
- `node scripts/runtime-dependencies-smoke.mjs`: NumPy e lodash-es reais, atualização de import Python no mesmo Worker, timeout com recuperação e interrupção por limite de saída.
- Novas regressões: exclusão/recriação não reinicia revisão remota, quota do navegador não confirma gravação falsa, criação por IP limitada e quota agregada contabilizada em bytes.

O contexto de requisitos foi recuperado do chat compartilhado; o código vigente foi examinado antes das alterações. Superpowers, Matt Pocock, Matt Skills Curated e Debug orientaram investigação, módulos e verificação. AICtrl não tinha repositório conectado; GitLab não continha o projeto; Superlog não disponibilizou telemetria. Cortex foi acessado pelo conector funcional alternativo. O monitor próprio verifica somente endpoints públicos de saúde, sem dados do estudante e sem mensagens a terceiros.

## Operação e continuidade

O progresso continua local por padrão. A sync é opcional, cifrada no aparelho e só ocorre por ação do usuário. Tombstones preservam revisão monotônica após remover o payload; não se reinicia uma revisão antiga. Chaves privadas de sincronização não são registradas em logs, URLs, repositório ou memória externa.

Para atualizar o currículo, use o importador com commits fixados, confira as licenças e execute a verificação de snapshots. Para publicar, teste o artefato em prévia, promova os mesmos hashes e verifique o site de produção. Não reporte como concluída uma execução real que tenha falhado ou uma integração externa que esteja desconectada.
