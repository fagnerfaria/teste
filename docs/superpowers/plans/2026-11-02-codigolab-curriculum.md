# CódigoLab: implementação de todas as trilhas

> Execução incremental com testes antes do código. Branch isolada `codigolab-curriculum-20261102`.

**Objetivo:** Oferecer um percurso original, navegável e prático do zero a projetos com IA, usando Android.

**Arquitetura:** manter as 12 aulas e 14 exercícios de Python existentes; criar módulos autorais adicionais com explicação, exemplo e avaliação; permitir laboratório de Python, JavaScript e HTML; módulos conceituais avaliados por questões; projetos com rubrica. Persistência continua local com backup JSON. Não copiar cursos de terceiros.

**Tecnologias:** React 19, TanStack Router, TypeScript, Vite, Vitest, Playwright, Pyodide Web Worker, Cloudflare Pages.

### Tarefas
- [ ] 1. Criar testes de estrutura dos seis percursos, módulos, quizzes, projetos, vínculos e unicidade (RED).
- [ ] 2. Implementar dados das trilhas com aulas originais, exemplos e atividades (GREEN).
- [ ] 3. Integrar aulas e exercícios Python/JS, quizzes, projetos e progresso.
- [ ] 4. Criar navegação, páginas responsivas e atualizar catálogo.
- [ ] 5. Expandir smoke tests de percurso e avaliação, rodar build, types, testes e navegação mobile.
- [ ] 6. Avaliar falhas, revisar, promover somente após testes; publicação exige atualizar commit pinado no Worker ou implementar hospedagem estática nativa.

**Limites de segurança e honestidade:** shell, Git e APIs com credenciais são conteúdos demonstrativos, não serão executados no browser como comandos reais; exemplos de JS e Python podem rodar de fato. Exercícios conceituais têm feedback imediato; não alegar certificação ou equivalência com currículo completo de terceiros.

**Falhas críticas a verificar:** IDs duplicados e perda de progresso existente; avaliação de JS tratada como Python; botões conceptuais apresentados como executor; Worker bloqueado por CSP; navegação Android; importação de backup da versão anterior.
