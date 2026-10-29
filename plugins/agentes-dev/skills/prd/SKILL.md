---
name: prd
description: Entrevista o usuário (no máximo 5 perguntas, uma por vez) e gera o PRD de uma nova funcionalidade em .md e .pdf. Use quando o usuário quiser especificar ou documentar uma nova funcionalidade.
argument-hint: "[descrição breve da funcionalidade]"
---

Leia `${CLAUDE_PLUGIN_ROOT}/agents/prd-agent.md` e siga **todas** as instruções do corpo do arquivo (ignore o frontmatter), conduzindo a entrevista diretamente nesta conversa.

Descrição inicial da funcionalidade fornecida pelo usuário: $ARGUMENTS

Se a descrição estiver vazia, a Pergunta 1/5 deve ser sobre qual funcionalidade será especificada e qual problema ela resolve.
