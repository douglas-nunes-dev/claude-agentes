#!/usr/bin/env node
// Converte um PRD em Markdown para PDF usando Chrome/Edge em modo headless (sem dependências npm).
// Uso: node "${CLAUDE_PLUGIN_ROOT}/skills/prd/prd-to-pdf.mjs" <arquivo.md> [saida.pdf]
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BROWSER_CANDIDATES = [
  process.env.PRD_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

const BLOCK_START = /^(#{1,6}\s|```|\s*\||\s*>|\s*([-*+]|\d+\.)\s+|\s*(-{3,}|\*{3,})\s*$)/;

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text) {
  const codes = [];
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`);
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      const buffer = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buffer.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buffer.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (/^\s*\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const [header, ...body] = rows.filter((row) => !/^\s*\|?\s*:?-{2,}/.test(row));
      const th = splitRow(header).map((cell) => `<th>${inline(cell)}</th>`).join('');
      const tr = body.map((row) => `<tr>${splitRow(row).map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`);
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${tr.join('')}</tbody></table>`);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buffer = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buffer.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${inline(buffer.join(' '))}</blockquote>`);
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const content = lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, '');
        const task = content.match(/^\[( |x|X)\]\s+(.*)$/);
        items.push(task
          ? `<li class="task"><span class="box">${task[1] === ' ' ? '☐' : '☑'}</span> ${inline(task[2])}</li>`
          : `<li>${inline(content)}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const buffer = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) buffer.push(lines[i++].trim());
    out.push(`<p>${inline(buffer.join(' '))}</p>`);
  }

  return out.join('\n');
}

function buildDocument(markdown) {
  const title = markdown.replace(/^﻿/, '').match(/^#\s+(.*)$/m)?.[1] ?? 'PRD';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1f2933; }
  h1 { font-size: 22pt; margin: 0 0 6pt; color: #102a43; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; padding-bottom: 3pt; border-bottom: 2px solid #2680c2; color: #102a43; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 12pt 0 4pt; color: #243b53; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 9.5pt; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { background: #e3f0fb; text-align: left; }
  th, td { border: 1px solid #bcccdc; padding: 4pt 6pt; vertical-align: top; }
  code { font-family: Consolas, "Courier New", monospace; background: #f0f4f8; padding: 0 3pt; border-radius: 3px; font-size: 9.5pt; }
  pre { background: #f0f4f8; padding: 8pt; border-radius: 4px; white-space: pre-wrap; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 8pt 0; padding: 6pt 10pt; border-left: 4px solid #f0b429; background: #fffbea; }
  li.task { list-style: none; margin-left: -14pt; }
  .box { font-size: 11pt; }
  hr { border: none; border-top: 1px solid #d9e2ec; margin: 12pt 0; }
  a { color: #186faf; }
</style>
</head>
<body>
${markdownToHtml(markdown)}
</body>
</html>`;
}

function findBrowser() {
  return BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
}

const [input, outputArg] = process.argv.slice(2);
if (!input) {
  console.error('Uso: node "${CLAUDE_PLUGIN_ROOT}/skills/prd/prd-to-pdf.mjs" <arquivo.md> [saida.pdf]');
  process.exit(1);
}

const inputPath = resolve(input);
const outputPath = resolve(outputArg ?? inputPath.replace(/\.md$/i, '') + '.pdf');
const browser = findBrowser();
if (!browser) {
  console.error('Chrome/Edge não encontrado. Defina PRD_BROWSER com o caminho do executável.');
  process.exit(1);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// No Windows o chrome.exe retorna antes de terminar a impressão (um processo filho grava o PDF),
// então aguardamos o arquivo aparecer e o tamanho estabilizar.
async function waitForFile(path, timeoutMs = 30000) {
  let lastSize = -1;
  for (const deadline = Date.now() + timeoutMs; Date.now() < deadline; await sleep(500)) {
    if (!existsSync(path)) continue;
    const { size } = statSync(path);
    if (size > 0 && size === lastSize) return true;
    lastSize = size;
  }
  return false;
}

const workDir = mkdtempSync(join(tmpdir(), 'prd-pdf-'));
try {
  rmSync(outputPath, { force: true });
  const htmlPath = join(workDir, 'prd.html');
  writeFileSync(htmlPath, buildDocument(readFileSync(inputPath, 'utf8')), 'utf8');
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-pdf-header-footer',
    '--print-to-pdf-no-header',
    `--user-data-dir=${join(workDir, 'profile')}`,
    `--print-to-pdf=${outputPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore', timeout: 60000 });
  if (!(await waitForFile(outputPath))) throw new Error('o navegador não gerou o arquivo');
  console.log(`PDF gerado: ${outputPath}`);
} catch (error) {
  console.error(`Falha ao gerar PDF: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
