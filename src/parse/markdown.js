'use strict';

/**
 * The renderer's Markdown dialect.
 *
 * Block level:
 *   ## Heading          starts a page section
 *   ### Heading         a sub-heading inside the current section
 *   paragraph
 *   - item              bullet list
 *   1. item             numbered list
 *   > text              thesis / lead statement block
 *   | a | b |           table (GFM pipe table)
 *   Source: ...         directly after a table, becomes the table caption
 *   ---                 section rule
 *   ```name             component block; body is YAML (see src/components)
 *
 * Inline level: **strong**, *emphasis*, `code`, [text](url), [^3] citation
 * reference, backslash escapes, and pre-written character references.
 *
 * Nothing else is recognized. Unknown constructs are reported by the validator
 * rather than guessed at, so the same Markdown always produces the same HTML.
 */

const { escapeText, escapeAttr } = require('../html');
const { parseYaml, YamlError } = require('./yaml');

class MarkdownError extends Error {
  constructor(message, line) {
    super(line ? `${message} (line ${line})` : message);
    this.name = 'MarkdownError';
    this.line = line || null;
  }
}

/** Split a renderer-ready file into frontmatter text and body text. */
function splitFrontmatter(source) {
  const text = String(source == null ? '' : source).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start += 1;
  if (lines[start] === undefined || lines[start].trim() !== '---') {
    throw new MarkdownError('Missing YAML frontmatter: the file must begin with a "---" fence', start + 1);
  }
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      return {
        frontmatter: lines.slice(start + 1, i).join('\n'),
        frontmatterLine: start + 2,
        body: lines.slice(i + 1).join('\n'),
        bodyLine: i + 2,
      };
    }
  }
  throw new MarkdownError('Frontmatter is never closed: add a matching "---" fence', start + 1);
}

/**
 * Parse the Markdown body into sections.
 * Returns { preamble, sections, citationRefs }.
 */
function parseBody(body, lineOffset = 0) {
  const lines = String(body == null ? '' : body).split('\n');
  const ctx = { citationRefs: new Map() };
  const preamble = [];
  const sections = [];
  let current = null;
  let i = 0;

  const push = (block) => {
    if (!block) return;
    (current ? current.blocks : preamble).push(block);
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = lineOffset + i;
    const trimmed = raw.trim();

    if (trimmed === '') {
      i += 1;
      continue;
    }

    // ---- section heading -------------------------------------------------
    if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed)) {
      const title = trimmed.replace(/^##\s+/, '').trim();
      if (!title) throw new MarkdownError('Empty "##" heading', line);
      current = { title, titleHtml: renderInline(title, ctx), meta: {}, blocks: [], line };
      sections.push(current);
      i += 1;
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      throw new MarkdownError(
        'A single "#" heading is not allowed: the page title comes from frontmatter `title`. Use "##" for sections',
        line,
      );
    }

    // ---- sub-heading -----------------------------------------------------
    if (/^###\s+/.test(trimmed)) {
      const text = trimmed.replace(/^#+\s+/, '').trim();
      if (!text) throw new MarkdownError('Empty "###" heading', line);
      push({ type: 'heading3', text, html: renderInline(text, ctx), line });
      i += 1;
      continue;
    }

    // ---- fenced component block -----------------------------------------
    const fence = /^(`{3,}|~{3,})\s*([A-Za-z][A-Za-z0-9-]*)?\s*$/.exec(trimmed);
    if (fence) {
      const marker = fence[1][0].repeat(3);
      const name = (fence[2] || '').trim();
      if (!name) {
        throw new MarkdownError(
          'A fenced block must name a component, for example ```callout. See docs/component-library.md',
          line,
        );
      }
      const bodyLines = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        if (lines[j].trim().startsWith(marker) && /^(`{3,}|~{3,})\s*$/.test(lines[j].trim())) {
          closed = true;
          break;
        }
        bodyLines.push(lines[j]);
        j += 1;
      }
      if (!closed) throw new MarkdownError(`Unterminated \`\`\`${name} block`, line);
      let data;
      try {
        data = parseYaml(bodyLines.join('\n'), line);
      } catch (err) {
        if (err instanceof YamlError) {
          throw new MarkdownError(`Invalid YAML inside \`\`\`${name} block: ${err.message}`, err.line || line);
        }
        throw err;
      }
      if (name === 'section') {
        if (!current) throw new MarkdownError('A ```section block must follow a "##" heading', line);
        if (Object.keys(current.meta).length) {
          throw new MarkdownError(`Section "${current.title}" already has a \`\`\`section block`, line);
        }
        current.meta = data || {};
        current.metaLine = line;
      } else {
        push({ type: 'component', name, data: data || {}, line });
      }
      i = j + 1;
      continue;
    }

    // ---- section rule ----------------------------------------------------
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      push({ type: 'rule', line });
      i += 1;
      continue;
    }

    // ---- table -----------------------------------------------------------
    if (trimmed.includes('|') && isDelimiterRow(lines[i + 1])) {
      const head = splitRow(trimmed).map((cell) => renderInline(cell, ctx));
      const rows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().includes('|') && lines[j].trim() !== '') {
        rows.push(splitRow(lines[j].trim()).map((cell) => renderInline(cell, ctx)));
        j += 1;
      }
      // A "Source: ..." paragraph directly after the table becomes its caption.
      let caption = null;
      let k = j;
      while (k < lines.length && lines[k].trim() === '') k += 1;
      if (k < lines.length && /^(\*|_)?source:/i.test(lines[k].trim())) {
        caption = renderInline(lines[k].trim().replace(/^[*_]+|[*_]+$/g, ''), ctx);
        j = k + 1;
      }
      push({ type: 'table', head, rows, caption, line });
      i = j;
      continue;
    }

    // ---- blockquote (thesis / lead statement) -----------------------------
    if (/^>\s?/.test(trimmed)) {
      const parts = [];
      let j = i;
      while (j < lines.length && /^>\s?/.test(lines[j].trim())) {
        parts.push(lines[j].trim().replace(/^>\s?/, ''));
        j += 1;
      }
      push({ type: 'thesis', html: renderInline(parts.join(' ').trim(), ctx), line });
      i = j;
      continue;
    }

    // ---- lists -----------------------------------------------------------
    const bullet = /^[-*+]\s+/.test(trimmed);
    const numbered = /^\d+[.)]\s+/.test(trimmed);
    if (bullet || numbered) {
      const pattern = bullet ? /^[-*+]\s+/ : /^\d+[.)]\s+/;
      const items = [];
      let j = i;
      while (j < lines.length) {
        const value = lines[j].trim();
        if (value === '') {
          const next = (lines[j + 1] || '').trim();
          if (pattern.test(next)) {
            j += 1;
            continue;
          }
          break;
        }
        if (pattern.test(value)) {
          items.push(value.replace(pattern, '').trim());
        } else if (items.length && /^\s{2,}/.test(lines[j])) {
          items[items.length - 1] += ` ${value}`;
        } else {
          break;
        }
        j += 1;
      }
      push({
        type: bullet ? 'bullet-list' : 'numbered-list',
        items: items.map((item) => renderInline(item, ctx)),
        line,
      });
      i = j;
      continue;
    }

    // ---- paragraph -------------------------------------------------------
    const paragraph = [];
    let j = i;
    while (j < lines.length) {
      const value = lines[j].trim();
      if (value === '') break;
      if (/^(##|###)\s+/.test(value)) break;
      if (/^(`{3,}|~{3,})/.test(value)) break;
      if (/^>\s?/.test(value)) break;
      if (/^[-*+]\s+/.test(value) || /^\d+[.)]\s+/.test(value)) break;
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(value)) break;
      paragraph.push(value);
      j += 1;
    }
    push({ type: 'paragraph', html: renderInline(paragraph.join(' '), ctx), line });
    i = j;
  }

  return { preamble, sections, citationRefs: ctx.citationRefs };
}

function isDelimiterRow(raw) {
  if (raw == null) return false;
  const value = raw.trim();
  if (!value.includes('-')) return false;
  return /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/.test(value);
}

function splitRow(raw) {
  let value = raw.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  const cells = [];
  let current = '';
  let escaped = false;
  for (const ch of value) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      current += ch;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Inline renderer. `ctx.citationRefs` accumulates `[^n]` references so the
 * validator can check every one resolves to a frontmatter citation.
 */
function renderInline(text, ctx) {
  const source = String(text == null ? '' : text);
  let out = '';
  let i = 0;

  const findClose = (marker, from) => {
    let k = from;
    while (k < source.length) {
      if (source[k] === '\\') {
        k += 2;
        continue;
      }
      if (source.startsWith(marker, k)) return k;
      k += 1;
    }
    return -1;
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === '\\' && i + 1 < source.length) {
      out += escapeText(source[i + 1]);
      i += 2;
      continue;
    }

    // Pass a pre-written character reference (&middot;, &amp;, &#8599;) through
    // untouched; a bare "&" is escaped by escapeText below.
    if (ch === '&') {
      const entity = /^&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/.exec(source.slice(i));
      if (entity) {
        out += entity[0];
        i += entity[0].length;
        continue;
      }
    }

    if (ch === '`') {
      const close = source.indexOf('`', i + 1);
      if (close > i) {
        out += `<code>${escapeText(source.slice(i + 1, close))}</code>`;
        i = close + 1;
        continue;
      }
    }

    if (ch === '[') {
      const citation = /^\[\^(\d+)\]/.exec(source.slice(i));
      if (citation) {
        const number = citation[1];
        if (ctx && ctx.citationRefs && !ctx.citationRefs.has(number)) ctx.citationRefs.set(number, true);
        out += `<sup><a href="#citation-${escapeAttr(number)}">[${escapeText(number)}]</a></sup>`;
        i += citation[0].length;
        continue;
      }
      const link = matchLink(source, i);
      if (link) {
        out += `<a href="${escapeAttr(link.href)}"${link.external ? ' target="_blank" rel="noopener"' : ''}>${renderInline(link.text, ctx)}</a>`;
        i = link.end;
        continue;
      }
    }

    if (source.startsWith('**', i)) {
      const close = findClose('**', i + 2);
      if (close > i + 1) {
        out += `<strong>${renderInline(source.slice(i + 2, close), ctx)}</strong>`;
        i = close + 2;
        continue;
      }
    }

    if ((ch === '*' || ch === '_') && source[i + 1] !== ' ' && source[i + 1] !== undefined) {
      const close = findClose(ch, i + 1);
      if (close > i) {
        out += `<em>${renderInline(source.slice(i + 1, close), ctx)}</em>`;
        i = close + 1;
        continue;
      }
    }

    out += escapeText(ch);
    i += 1;
  }

  return out;
}

function matchLink(source, start) {
  let depth = 0;
  let i = start;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  if (depth !== 0 || source[i + 1] !== '(') return null;
  const text = source.slice(start + 1, i);
  let j = i + 2;
  let paren = 1;
  let href = '';
  for (; j < source.length; j += 1) {
    const ch = source[j];
    if (ch === '(') paren += 1;
    if (ch === ')') {
      paren -= 1;
      if (paren === 0) break;
    }
    href += ch;
  }
  if (paren !== 0) return null;
  href = href.trim();
  const external = /^https?:\/\//i.test(href) && !/^https?:\/\/([a-z0-9-]+\.)*hginsights\.com/i.test(href);
  return { text, href, end: j + 1, external };
}

module.exports = { splitFrontmatter, parseBody, renderInline, MarkdownError };
