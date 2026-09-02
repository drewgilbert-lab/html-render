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

  // ---- HowTo steps: one flagged process-steps block, and only when declared ---
  const blocks = [...parsed.body.preamble, ...sections.flatMap((section) => section.blocks)];
  const stepBlocks = blocks.filter((block) => block.type === 'component' && block.name === 'process-steps');
  const flagged = stepBlocks.filter((block) => block.data && block.data.howto === true);
  if (!isBlank(frontmatter.howto)) {
    if (!flagged.length) {
      report.add(
        'howto',
        'declares HowTo schema, but no ```process-steps block carries `howto: true`. Flag exactly one block; its steps become the HowToStep list',
        locOf(frontmatter, 'howto'),
      );
    }
    for (const block of flagged.slice(1)) {
      report.add('```process-steps', 'a second block carries `howto: true`; only one block can supply the HowTo steps', block.line);
    }
  } else {
    for (const block of flagged) {
      report.add(
        '```process-steps',
        'carries `howto: true`, but the frontmatter declares no `howto`. Add a `howto` node (name, description, total_time) or remove the flag',
        block.line,
      );
    }
  }

  // ---- step anchors: lowercase slugs, unique against sections and each other ---
  const stepIds = new Set();
  for (const block of stepBlocks) {
    const items = block.data && Array.isArray(block.data.items) ? block.data.items : [];
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object' || isBlank(item.id)) return;
      const id = String(item.id);
      const at = `\`\`\`process-steps.items[${index}].id`;
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
        report.add(at, `"${id}" is not a usable anchor. Use lowercase letters, digits, and hyphens, e.g. "level-1"`, locOf(item, 'id') || block.line);
      } else if (seen.has(id)) {
        report.add(at, `"#${id}" is already the anchor of section "${seen.get(id)}". Give the step a different id`, locOf(item, 'id') || block.line);
      } else if (stepIds.has(id)) {
        report.add(at, `"#${id}" is already used by another step. Step ids must be unique on the page`, locOf(item, 'id') || block.line);
      } else {
        stepIds.add(id);
      }
    });
  }

  // ---- table of contents resolves ---------------------------------------
  const anchors = new Set([...seen.keys(), ...stepIds, 'hero', 'overview', 'faq', 'citations', 'related', 'cta', 'methodology', 'resource-index']);
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

  // ---- item_list anchors resolve -----------------------------------------
  const listItems = frontmatter.item_list && frontmatter.item_list.items;
  if (Array.isArray(listItems)) {
    listItems.forEach((item, index) => {
      if (!item || typeof item !== 'object' || typeof item.url !== 'string' || !item.url.startsWith('#')) return;
      const anchor = item.url.slice(1);
      if (anchor && !anchors.has(anchor)) {
        report.add(
          `item_list.items[${index}].url`,
          `"#${anchor}" does not match any anchor on this page. Available anchors: ${[...anchors].join(', ')}`,
          locOf(item, 'url') || locOf(listItems, index),
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
