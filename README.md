# CódigoLab

Academia gratuita de programação do zero com laboratório Python (Pyodide Web Worker), JavaScript (Web Worker), simulações guiadas e desafios. Conteúdo autoral inspirado em projetos educacionais abertos, com links para 30 Dias de Python, Universidade Brasileira Livre, freeCodeCamp e Aprenda Community.

### Desenvolvimento

`npm install`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm run test`.

Publicação: Vite SPA, pasta `dist/`. Dados permanecem no navegador com exportação JSON. Não execute código desconhecido; o isolamento por Worker não fornece segurança de servidor multiusuário.


## Biblioteca dos repositórios originais (02/11/2026)

A rota /biblioteca indexa 1.764 caminhos públicos do GitHub: 30 Dias de Python (30 documentos), Universidade Brasileira Livre (47), freeCodeCamp (1.108 blocos + 31 mapas de certificação) e Aprenda Community (548 arquivos de aulas, trilhas, projetos e bootcamps). O índice contém metadados e links, **não cópia integral das obras**. Prévia Markdown/MDX sob demanda apenas quando o licenciamento indicado pela fonte permite; MDX interativo não é executado. Desafios e certificações do freeCodeCamp continuam na plataforma original. Referências de terceiros dentro dos repositórios têm direitos próprios.

PWA: instalação pelo navegador compatível, com cache de páginas e assets próprios; sem sincronização de progresso entre aparelhos. O Python ainda depende do download inicial do Pyodide. As atividades originais de terceiros não foram convertidas em testes locais automaticamente; a bateria de exercícios próprios permanece independente.


### Laboratório SQLite real
A rota `/sql` executa consultas reais num banco SQLite WASM via sql.js v1.14.2 (MIT). Funciona por Web Worker separado, com limite de 20 segundos, banco fictício recriado a cada consulta, no máximo 100 linhas exibidas. Não usa credenciais nem arquivos do aparelho. O carregamento inicial depende da CDN jsDelivr e de um navegador com WebAssembly.


## Plataforma web (sem aplicativo Android obrigatório)

A rota `/workspace` oferece uma IDE educativa de navegador com até 50 arquivos por projeto, modelos separados de HTML/CSS/JS, Python e JavaScript, editor, backup JSON e dados locais. Projetos web combinam arquivos em prévia `iframe sandbox="allow-scripts"` com política de segurança sem rede nem origem. Nos projetos Python e JS o arquivo principal é executado de verdade em Worker, mas imports entre arquivos **não** são suportados neste estágio; os demais arquivos servem à organização e edição. A instalação como PWA é opcional, não um requisito de uso. A experiência é responsiva para desktop, tablet e celular.

Para publicação direta e sem proxy, a Cloudflare recomenda `wrangler pages deploy dist --project-name=codigolab` em GitHub Actions com `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` cadastrados em Secrets. Nunca colocar o token em arquivo commitado.
