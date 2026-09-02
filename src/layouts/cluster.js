'use strict';

/**
 * Cluster layout — the sub-hub and domain router between a Pillar and its
 * spokes.
 *
 * Component order (fixed):
 *   breadcrumb -> gradient hero -> freshness-bar -> intro + TOC ->
 *   thesis-band? -> first body section (scope) -> resource index ->
 *   remaining body sections -> methodology? -> FAQ -> citations? -> related? -> CTA
 *
 * The resource index sits immediately after the first body section, which is
 * where the approved design puts it: the page states its scope, then indexes
 * every spoke beneath it.
 *
 * Hero omits eyebrow, pills, and thesis. Thesis sits in its own band after the
 * intro. The freshness bar always renders. The footer CTA is a single primary
 * button.
 */

const { el, lines, indent, container } = require('../html');
const { renderSlot } = require('../components');
const { renderNodes } = require('./section-body');
const { renderSectionHeader } = require('../components/page');
const assemble = require('./assemble');

const pageType = 'cluster';

const describe = () => ({
  pageType,
  summary: 'Domain router: defines one domain of the parent conversation and indexes every spoke beneath it.',
  order: [
    'breadcrumb',
    'hero (no eyebrow, pills, or thesis)',
    'freshness-bar',
    'intro-toc',
    'thesis-band (optional)',
    'first body section',
    'resource-index',
    'remaining body sections',
    'methodology (optional)',
    'faq',
    'citations (optional)',
    'related (optional)',
    'cta (single primary button)',
  ],
});

function renderSection(section, index) {
  const meta = section.meta || {};
  const tinted = meta.band ? meta.band === 'tinted' : index % 2 === 1;
  return el(
    'section',
    { class: tinted ? 'page-section tinted' : 'page-section', id: section.anchor },
    `\n${indent(
      container(
        lines(
          renderSectionHeader({ eyebrow: meta.eyebrow, title: section.titleHtml, subtitle: meta.subtitle }),
          renderNodes(section.blocks, { groupByH3: true, h3Class: 'grouping-h2' }),
        ),
      ),
    )}\n`,
  );
}

function render(doc) {
  const fm = doc.frontmatter;
  const sections = doc.sections;
  const tocOptions = { resourceIndexAfterFirst: true };

  const parts = [
    renderSlot('breadcrumb', assemble.breadcrumbInput(fm)),
    renderSlot('hero', assemble.heroInput(fm)),
    renderSlot('freshness-bar', assemble.freshnessInput(fm)),
    renderSlot('intro-toc', assemble.introTocInput(fm, sections, tocOptions)),
  ];
  const thesis = assemble.thesisBandInput(fm);
  if (thesis) parts.push(renderSlot('thesis-band', thesis));

  sections.forEach((section, index) => {
    parts.push(renderSection(section, index));
    if (index === 0) parts.push(renderSlot('resource-index', fm.resource_index));
  });

  if (fm.methodology) parts.push(renderSlot('methodology', fm.methodology));
  parts.push(renderSlot('faq', fm.faq));
  if (fm.citations) parts.push(renderSlot('citations', fm.citations));
  if (fm.related) parts.push(renderSlot('related', fm.related));
  parts.push(renderSlot('cta', assemble.ctaInput(fm)));

  return lines(parts);
}

module.exports = { pageType, describe, render };
