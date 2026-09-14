'use strict';

/**
 * Body-block rendering: what a paragraph, list, table, rule, or heading becomes.
 *
 * The document decides where these appear; this module only decides what each
 * one looks like.
 */

const { el, lines, indent } = require('./html');
const { renderBlock } = require('./components');

/**
 * What a ```section block may say about the "##" heading above it. The anchor
 * and the band belong to the enclosing `:::section` region; the nav label
 * belongs to whatever side-nav or intro-toc the document writes.
 */
const SECTION_FIELDS = {
  eyebrow: { type: 'text' },
  subtitle: { type: 'text' },
};

function renderNode(node, options) {
  switch (node.type) {
    case 'paragraph':
      return el('p', null, node.html);
    case 'heading3':
      return el('h3', options.h3Class ? { class: options.h3Class } : null, node.html);
    case 'bullet-list':
      return el('ul', { class: 'bullet-list' }, `\n${indent(lines(node.items.map((item) => el('li', null, item))))}\n`);
    case 'numbered-list':
      return el('ol', { class: 'numbered-list' }, `\n${indent(lines(node.items.map((item) => el('li', null, item))))}\n`);
    case 'thesis':
      return el('p', { class: 'thesis-block' }, node.html);
    case 'rule':
      return '<hr class="section-rule">';
    case 'table':
      return renderTable(node);
    case 'component':
      return renderBlock(node);
    default:
      throw new Error(`Unknown body node type "${node.type}"`);
  }
}

/**
 * Tables render as the canonical comparison table. The first cell of every
 * body row carries `.vendor-name`, which is the design system's row-label
 * treatment (heavy, dark blue).
 */
function renderTable(node) {
  const head = el(
    'thead',
    null,
    `\n${indent(el('tr', null, `\n${indent(lines(node.head.map((cell) => el('th', null, cell))))}\n`))}\n`,
  );
  const body = el(
    'tbody',
    null,
    `\n${indent(
      lines(
        node.rows.map((row) =>
          el(
            'tr',
            null,
            `\n${indent(lines(row.map((cell, index) => el('td', index === 0 ? { class: 'vendor-name' } : null, cell))))}\n`,
          ),
        ),
      ),
    )}\n`,
  );
  const table = el(
    'div',
    { class: 'table-wrapper' },
    `\n${indent(el('table', { class: 'comparison-table' }, `\n${indent(lines(head, body))}\n`))}\n`,
  );
  return lines(table, node.caption ? el('p', { class: 'table-caption' }, node.caption) : '');
}

module.exports = { SECTION_FIELDS, renderNode };
