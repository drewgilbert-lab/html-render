'use strict';

/**
 * Validation.
 *
 * The renderer refuses to guess. Anything missing, malformed, unsupported, or
 * unresolvable is reported as an error naming the frontmatter key or Markdown
 * line to fix. Nothing is silently invented and nothing is silently dropped.
 */

const { Report, validateFields, collectCitationRefs, isBlank } = require('./fields');
const { contractFor, tightenSpoke, applyStandalone, PAGE_TYPES, SPOKE_LAYOUTS } = require('./document-contract');
const { SECTION_FIELDS } = require('../layouts/section-body');
const { validateBlock } = require('../components');
const { locOf } = require('../parse/yaml');
const { slugify } = require('../html');

class ValidationError extends Error {
  constructor(errors, file) {
    const label = file ? `${file}: ` : '';
    const detail = errors.map((error) => `  - ${error.path ? `${error.path}: ` : ''}${error.message}${error.line ? ` [line ${error.line}]` : ''}`);
    super(`${label}${errors.length} validation ${errors.length === 1 ? 'error' : 'errors'}\n${detail.join('\n')}`);
    this.name = 'ValidationError';
    this.errors = errors;
    this.file = file || null;
  }
}

/**
 * Validate a parsed document. Returns { report, pageType, layout, sections }
 * where `sections` carry their resolved anchors.
 */
function validateDocument(parsed) {
  const report = new Report();
  const frontmatter = parsed.frontmatter || {};
  const pageType = frontmatter.page_type;

  if (isBlank(pageType)) {
    report.add('page_type', `is required. Supported page types: ${PAGE_TYPES.join(', ')}`, locOf(frontmatter, 'page_type'));
    return { report, pageType: null, layout: null, sections: [] };
  }
  if (!PAGE_TYPES.includes(String(pageType))) {
    report.add(
      'page_type',
      `"${pageType}" is not a supported page type. Supported page types: ${PAGE_TYPES.join(', ')}`,
      locOf(frontmatter, 'page_type'),
    );
    return { report, pageType: null, layout: null, sections: [] };
  }

  const layout = pageType === 'spoke' ? String(frontmatter.layout || 'article') : null;
  if (pageType === 'spoke' && !SPOKE_LAYOUTS.includes(layout)) {
    report.add('layout', `"${layout}" is not a supported spoke layout. Use one of: ${SPOKE_LAYOUTS.join(', ')}`, locOf(frontmatter, 'layout'));
  }

  const standalone = pageType === 'spoke' && frontmatter.standalone === true;
  let contract = contractFor(pageType);
  if (pageType === 'spoke' && SPOKE_LAYOUTS.includes(layout)) contract = tightenSpoke(contract, layout);
  if (pageType === 'spoke') contract = applyStandalone(contract, standalone);

  validateFields(contract, frontmatter, '', report, 1);

  // ---- body sections ----------------------------------------------------
  const sections = resolveSections(parsed.body.sections);
  if (!sections.length) {
    report.add('', 'the Markdown body has no sections. Add at least one "## Heading"', parsed.bodyLine);
  }
  for (const section of sections) {
    validateFields(SECTION_FIELDS, section.meta, `section "${section.title}"`, report, section.metaLine || section.line);
    for (const block of section.blocks) {
      if (block.type === 'component') {
        validateBlock(block, `\`\`\`${block.name}`, report);
      }
    }
  }
  for (const block of parsed.body.preamble) {
    if (block.type === 'component') validateBlock(block, `\`\`\`${block.name}`, report);
  }

  // ---- layout-specific body expectations --------------------------------
  if (standalone && !isBlank(frontmatter.breadcrumbs)) {
    report.add(
      'breadcrumbs',
      'a standalone spoke owns no ancestor trail. Remove `breadcrumbs`, or remove `standalone: true`',
      locOf(frontmatter, 'breadcrumbs'),
    );
  }
  if (standalone && !isBlank(frontmatter.breadcrumb_label)) {
    report.add(
      'breadcrumb_label',
      'a standalone spoke renders no breadcrumb trail, so `breadcrumb_label` has nothing to label. Remove it, or remove `standalone: true`',
      locOf(frontmatter, 'breadcrumb_label'),
    );
  }
  if (pageType === 'spoke' && layout === 'article' && frontmatter.hero && !isBlank(frontmatter.hero.stats)) {
    report.add(
      'hero.stats',
      'the "article" spoke layout uses the light article hero, which has no stat grid. Either remove hero.stats or set `layout: banded`',
      locOf(frontmatter.hero, 'stats'),
    );
  }
  if (pageType === 'pillar' && parsed.body.preamble.length) {
    report.add(
      '',
      'a Pillar page puts all body copy inside "##" sections; content found before the first heading',
      parsed.body.preamble[0].line,
    );
  }
  if (pageType === 'cluster' && parsed.body.preamble.length) {
    report.add(
      '',
      'a Cluster page puts all body copy inside "##" sections; content found before the first heading',
      parsed.body.preamble[0].line,
    );
  }

  // ---- duplicate anchors -------------------------------------------------
  const seen = new Map();
  for (const section of sections) {
    if (seen.has(section.anchor)) {
      report.add(
        `section "${section.title}"`,
        `produces the anchor "#${section.anchor}", which is already used by "${seen.get(section.anchor)}". Set a unique \`id\` in that section's \`\`\`section block`,
        section.line,
      );
    } else {
      seen.set(section.anchor, section.title);
    }
  }

  // ---- table of contents resolves ---------------------------------------
  const anchors = new Set([...seen.keys(), 'hero', 'overview', 'faq', 'citations', 'related', 'cta', 'methodology', 'resource-index']);
  const toc = frontmatter.intro && frontmatter.intro.toc;
  if (Array.isArray(toc)) {
    toc.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const anchor = String(item.anchor || '').replace(/^#/, '');
      if (anchor && !anchors.has(anchor)) {
        report.add(
          `intro.toc[${index}].anchor`,
          `"#${anchor}" does not match any section on this page. Available anchors: ${[...anchors].join(', ')}`,
          locOf(item, 'anchor') || locOf(toc, index),
        );
      }
    });
  }

  // ---- citation references resolve --------------------------------------
  const refs = new Map(parsed.body.citationRefs);
  collectCitationRefs(contract, frontmatter, refs);
  const citationCount = frontmatter.citations && Array.isArray(frontmatter.citations.items) ? frontmatter.citations.items.length : 0;
  const refNumbers = [...refs.keys()].map(Number).sort((a, b) => a - b);
  for (const number of refNumbers) {
    if (number < 1 || number > citationCount) {
      report.add(
        'citations',
        citationCount === 0
          ? `the body cites [^${number}] but no \`citations\` list is defined in frontmatter`
          : `the body cites [^${number}] but only ${citationCount} citation${citationCount === 1 ? '' : 's'} ${citationCount === 1 ? 'is' : 'are'} defined`,
        locOf(frontmatter, 'citations'),
      );
    }
  }

  return { report, pageType, layout, sections };
}

/** Resolve each section's anchor and nav label, deterministically. */
function resolveSections(sections) {
  return sections.map((section, index) => {
    const meta = section.meta || {};
    const explicit = meta.id ? String(meta.id).replace(/^#/, '') : '';
    const anchor = explicit || slugify(section.title) || `section-${index + 1}`;
    return { ...section, anchor, navLabel: meta.nav_label || section.title, index };
  });
}

module.exports = { validateDocument, ValidationError };
