'use strict';

/**
 * Validation.
 *
 * The renderer checks one thing: can it render this document. An unknown
 * component, a field whose shape it cannot use, an unbalanced region — those
 * are errors, because there is no output to produce. Everything else is the
 * authoring skill's business.
 *
 * Nothing here says what a page must contain. There is no page class, no
 * required slot, and no bound on how many of anything a page may carry.
 */

const { Report, validateFields } = require('./fields');
const { FRONTMATTER_FIELDS } = require('../schema-fields');
const { SECTION_FIELDS } = require('../section-body');
const { validateBlock } = require('../components');
const { REGION_FIELDS, isKnownRegion, REGION_NAMES } = require('../body');
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
 * Validate a parsed document. Returns { report, sections } where `sections`
 * carry their resolved anchors — the renderer does not use them, but the
 * output header reports how many a page has.
 */
function validateDocument(parsed) {
  const report = new Report();
  // Frontmatter is read but never drawn: check only that the renderer can
  // serialize what it finds. Unknown keys are ignored, not rejected — a
  // document may carry whatever else its pipeline needs.
  validateFields(FRONTMATTER_FIELDS, parsed.frontmatter || {}, '', report, 1, { strict: false });
  walk(parsed.body.nodes, report);
  return { report, sections: resolveSections(parsed.body.sections) };
}

/** Every node, depth first: a component must exist, a region must be one we wrap. */
function walk(nodes, report) {
  for (const node of nodes || []) {
    if (node.type === 'region') {
      const at = `:::${node.name}`;
      if (!isKnownRegion(node.name)) {
        report.add(at, `is not a region this renderer can wrap. Available regions: ${REGION_NAMES.join(', ')}`, node.line);
      } else {
        validateFields(REGION_FIELDS[node.name], node.attrs, at, report, node.line);
      }
      walk(node.nodes, report);
      continue;
    }
    if (node.type === 'component') {
      validateBlock(node, `\`\`\`${node.name}`, report);
      continue;
    }
    if (node.type === 'heading2' && node.meta) {
      validateFields(SECTION_FIELDS, node.meta, `section "${node.title}"`, report, node.line);
    }
  }
}

/** Resolve each section's anchor deterministically, for the output header. */
function resolveSections(sections) {
  return (sections || []).map((section, index) => {
    const meta = section.meta || {};
    const explicit = meta.id ? String(meta.id).replace(/^#/, '') : '';
    const anchor = explicit || slugify(section.title) || `section-${index + 1}`;
    return { ...section, anchor, navLabel: meta.nav_label || section.title, index };
  });
}

module.exports = { validateDocument, ValidationError, locOf };
