'use strict';

/**
 * What this renderer can draw, printed for whoever writes the Markdown.
 *
 * This is a catalog, not a contract. It says what a component is called and
 * what fields it takes — never that a page must carry one, or where it should
 * sit. The document decides that.
 *
 * It is generated from the live registry, so it cannot drift from the code,
 * and it is what `scripts/generate-contract.js` ships downstream.
 */

const { components } = require('./components');
const { REGION_FIELDS, REGION_NAMES } = require('./body');
const { FRONTMATTER_FIELDS } = require('./schema-fields');
const { SECTION_FIELDS } = require('./section-body');

/** One field, with its type, allowed values, and hint. */
function fieldLine(name, spec, depth) {
  const pad = '  '.repeat(depth + 2);
  const notes = [];
  if (spec.type === 'enum') notes.push(`one of: ${spec.values.join(' | ')}`);
  else if (spec.type === 'list') notes.push('list');
  if (spec.hint) notes.push(spec.hint);
  const type = spec.type === 'list' || spec.type === 'object' ? '' : ` <${spec.type}>`;
  return `${pad}${name}${type}${notes.length ? `  — ${notes.join('; ')}` : ''}`;
}

function describeFields(fields, depth = 0) {
  const out = [];
  for (const name of Object.keys(fields)) {
    const spec = fields[name];
    out.push(fieldLine(name, spec, depth));
    if (spec.fields) out.push(...describeFields(spec.fields, depth + 1));
  }
  return out;
}

function componentSection() {
  const rows = [...components.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((component) =>
      [`  \`\`\`${component.name}`, `      ${component.summary}`, `      design source: ${component.source}`, ...describeFields(component.fields)].join('\n'),
    );
  return [
    'COMPONENTS',
    '',
    'Place one in the body with a fenced block naming it. Every component renders what',
    'it is given and omits what it is not; none of them require anything.',
    '',
    rows.join('\n\n'),
  ].join('\n');
}

function regionSection() {
  const rows = REGION_NAMES.map((name) => [`  :::${name}`, ...describeFields(REGION_FIELDS[name])].join('\n'));
  return [
    'REGIONS',
    '',
    'Open with ":::name", close with ":::". Attributes go on the lines directly after',
    'the opener and end at the first blank line. Regions nest.',
    '',
    rows.join('\n\n'),
    '',
    '  A `side-nav` placed inside a two-column region becomes the rail; everything else',
    '  in it becomes the reading column.',
  ].join('\n');
}

function headingSection() {
  return [
    'HEADINGS',
    '',
    'A "##" heading renders as an h2. A fenced `section` block directly after one',
    'annotates it; the anchor and the band belong to the enclosing `:::section`.',
    '',
    '  ```section',
    ...describeFields(SECTION_FIELDS),
  ].join('\n');
}

function frontmatterSection() {
  return [
    'FRONTMATTER',
    '',
    'Only what has no pixels: the page identity the output header and the graph need,',
    'and the JSON-LD nodes with no visible form of their own. Everything visible is a',
    'body block. Nothing here is required, and keys this renderer does not know are',
    'ignored rather than rejected.',
    '',
    'The rest of the graph is read from the body: the author from a hero or',
    'article-hero, the questions from an faq, the trail from a breadcrumb, the index',
    'from a resource-index or the link-cards.',
    '',
    ...describeFields(FRONTMATTER_FIELDS),
  ].join('\n');
}

/** The whole catalog, as printed by `html-render --components`. */
function formatCatalog() {
  return [componentSection(), regionSection(), headingSection(), frontmatterSection()].join('\n\n\n');
}

module.exports = { formatCatalog };
