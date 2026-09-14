'use strict';

/**
 * The body walk: render the Markdown body in the order the author wrote it.
 *
 * There is no page class, no slot order, and no composition the renderer
 * chooses. A component appears where the `.md` puts it; a region wraps what the
 * `.md` puts inside it. The renderer supplies the markup for each, and nothing
 * else.
 *
 * Regions are the one structural primitive, because two of the design system's
 * wrappers cannot be expressed by a component alone: a banded section and the
 * two-column reading-column-plus-rail grid. An author opens one with `:::name`
 * and closes it with `:::`.
 */

const { el, lines, indent, container } = require('./html');
const { renderBlock } = require('./components');
const { renderNode } = require('./layouts/section-body');

/** True for an attribute written as YAML `true`, or as the string "true". */
function flag(value) {
  return value === true || String(value).trim().toLowerCase() === 'true';
}

/**
 * A section. With no `band` it is a bare wrapper that paints nothing — the
 * reading-column section. `band: white` or `band: tinted` makes it one of the
 * full-width page bands. Nothing overrides the author's choice, including the
 * band before it: two tinted bands in a row are the author's to make.
 */
const SECTION_BANDS = { white: 'page-section', tinted: 'page-section tinted' };

function renderSection(region, children) {
  const attrs = region.attrs || {};
  const band = String(attrs.band || '').trim();
  const inner = flag(attrs.container) ? container(children) : children;
  return el('section', { class: SECTION_BANDS[band] || null, id: attrs.id || null }, `\n${indent(inner)}\n`);
}

/**
 * The reading column plus its rail. Any `side-nav` among the children is the
 * rail and sits as the grid's second child; everything else is the column.
 *
 * Three grids exist in the stylesheet, and `variant` names which one:
 *   spoke (default)  the wide reading column
 *   article          the narrow 780px column
 *   reading          the wide column in its prose measure
 */
const TWO_COLUMN_VARIANTS = {
  spoke: { wrapper: 'spoke-body-section', column: 'spoke-col' },
  article: { wrapper: 'article-body-section', column: 'main-col' },
  reading: { wrapper: 'spoke-body-section', column: 'spoke-col article-body' },
};

function renderTwoColumn(region, rendered) {
  const variant = String((region.attrs || {}).variant || '').trim() || 'spoke';
  const shape = TWO_COLUMN_VARIANTS[variant];
  if (!shape) {
    throw new Error(`Unknown two-column variant "${variant}". Use one of: ${Object.keys(TWO_COLUMN_VARIANTS).join(', ')}`);
  }
  const { wrapper, column: columnClass } = shape;

  const rail = [];
  const column = [];
  rendered.forEach((html, index) => {
    const node = region.nodes[index];
    if (node && node.type === 'component' && node.name === 'side-nav') rail.push(html);
    else column.push(html);
  });

  return el(
    'section',
    { class: wrapper },
    `\n${indent(container(lines(el('div', { class: columnClass }, `\n${indent(lines(column))}\n`), ...rail)))}\n`,
  );
}

const REGIONS = {
  section: renderSection,
  'two-column': renderTwoColumn,
};

/** Region names the renderer has a wrapper for. */
const REGION_NAMES = Object.keys(REGIONS);

function renderRegion(region) {
  const build = REGIONS[region.name];
  if (!build) throw new Error(`Unresolved region ":::${region.name}"`);
  const rendered = region.nodes.map((node) => renderNodeOrRegion(node));
  return build(region, region.name === 'two-column' ? rendered : lines(rendered));
}

function renderNodeOrRegion(node) {
  if (node.type === 'region') return renderRegion(node);
  if (node.type === 'heading2') {
    const meta = node.meta || {};
    return lines(
      meta.eyebrow ? el('div', { class: 'section-eyebrow' }, meta.eyebrow) : '',
      el('h2', { id: meta.id || null }, node.html),
      meta.subtitle ? el('p', { class: 'section-subtitle' }, meta.subtitle) : '',
    );
  }
  if (node.type === 'component') return renderBlock(node);
  return renderNode(node, {});
}

/** Render a parsed body's document-order node stream. */
function renderBody(nodes) {
  return lines((nodes || []).map((node) => renderNodeOrRegion(node)));
}

module.exports = { renderBody, renderNodeOrRegion, REGION_NAMES };
