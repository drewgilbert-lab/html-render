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
 * A banded full-width section. `band: tinted` paints it; nothing overrides the
 * author's choice, including the band before it.
 */
function renderSection(region, children) {
  const attrs = region.attrs || {};
  const classes = attrs.band === 'tinted' ? 'page-section tinted' : 'page-section';
  const inner = flag(attrs.container) ? container(children) : children;
  return el('section', { class: classes, id: attrs.id || null }, `\n${indent(inner)}\n`);
}

/**
 * The reading column plus its rail. Any `side-nav` among the children is the
 * rail and sits as the grid's second child; everything else is the column.
 *
 * `variant: article` selects the narrower pillar column; the default is the
 * wider spoke column. Both are grids declared in the stylesheet.
 */
function renderTwoColumn(region, rendered) {
  const variant = String((region.attrs || {}).variant || '').trim();
  const article = variant === 'article';
  const wrapper = article ? 'article-body-section' : 'spoke-body-section';
  const columnClass = article ? 'main-col' : 'spoke-col';

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
