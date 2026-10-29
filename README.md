# claude-agentes

Marketplace pessoal de plugins para o Claude Code.

## Plugin `agentes-dev`

| Componente | Tipo | Como usar |
|---|---|---|
| `prd` | Skill | `/agentes-dev:prd <funcionalidade>` — entrevista de até 5 perguntas, uma por vez, e gera o PRD em `.md` e `.pdf` |
| `prd-agent` | Agente | Instruções usadas pela skill `prd` |
| `code-improver` | Agente | Peça "revise/melhore o código de X" — relatório de legibilidade, desempenho e boas práticas |
| `context7` | MCP | Documentação atualizada de bibliotecas e frameworks |
| `playwright` | MCP | Automação de navegador (testar páginas, screenshots) |
| `figma` | MCP | Ler designs do Figma — na primeira vez, autentique em `/mcp` |

O MCP `playwright` usa `cmd /c npx` (formato do Windows). No macOS/Linux, troque por `"command": "npx", "args": ["@playwright/mcp@latest"]` em `plugins/agentes-dev/.mcp.json`.

Os agentes leem o `CLAUDE.md` e o `README.md` de cada projeto para entender o contexto. Defina no `CLAUDE.md` a pasta dos PRDs (padrão: `docs/prd/`).

**Requisitos:** Node.js e Chrome ou Edge instalados (para gerar o PDF). Se o navegador estiver em outro caminho, defina a variável `PRD_BROWSER`.

## Instalar em uma máquina

```sh
claude plugin marketplace add douglas-nunes-dev/claude-agentes
claude plugin install agentes-dev@douglas-nunes-agentes
```

## Atualizar

Depois de dar push numa nova versão (aumente `version` em `plugins/agentes-dev/.claude-plugin/plugin.json`):

```sh
claude plugin marketplace update douglas-nunes-agentes
```

## Testar localmente

```sh
claude plugin validate .
claude plugin marketplace add ./
claude plugin install agentes-dev@douglas-nunes-agentes
```
