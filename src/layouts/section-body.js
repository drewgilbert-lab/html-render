'use strict';

/**
 * Shared body-block rendering.
 *
 * Layouts differ in how they *frame* a section (narrow article column, banded
 * full-width section, centred or left-aligned header). What goes *inside* a
 * section is identical everywhere, and lives here.
 */

const { el, lines, indent } = require('../html');
const { renderBlock } = require('../components');

/** Section-level metadata an author may set with a ```section block. */
const SECTION_FIELDS = {
  eyebrow: { type: 'text' },
  subtitle: { type: 'text' },
  id: { type: 'plain', hint: 'overrides the anchor derived from the heading' },
  nav_label: { type: 'text', hint: 'shorter label used in the table of contents' },
  band: { type: 'enum', values: ['white', 'tinted'], hint: 'overrides the alternating band colour' },
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

/**
 * Render a list of body nodes. When `groupByH3` is set, each `###` heading and
 * the nodes beneath it are wrapped in a `.grouping-block` — the cluster page's
 * grouping pattern.
 */
function renderNodes(nodes, options = {}) {
  if (!options.groupByH3) return lines(nodes.map((node) => renderNode(node, options)));

  const out = [];
  let group = null;
  const flush = () => {
    if (group) {
      out.push(el('div', { class: 'grouping-block' }, `\n${indent(lines(group))}\n`));
      group = null;
    }
  };
  for (const node of nodes) {
    if (node.type === 'heading3') {
      flush();
      group = [renderNode(node, options)];
      continue;
    }
    if (group) group.push(renderNode(node, options));
    else out.push(renderNode(node, options));
  }
  flush();
  return lines(out);
}

module.exports = { SECTION_FIELDS, renderNodes };
