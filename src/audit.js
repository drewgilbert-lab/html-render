'use strict';

/**
 * Export coverage audit for `html-render --audit <export-dir>`.
 *
 * Answers one question: which components of a Claude Design export does this
 * renderer implement, and which does it not? Generated from the live registry
 * and the live stylesheet, so it cannot fall out of date the way a hand-kept
 * list would.
 *
 * The export identifies components by name, unique per its `_ds_manifest.json`
 * (`components[].name`). Coverage is joined on two signals the repo maintains:
 *
 *   1. Every registry entry names its design source verbatim
 *      ( source: 'Figure' ).
 *   2. Every CSS block header names the component it implements, with no
 *      number ( /`* ---- Figure block ---- *`/ ). A header covers a component
 *      when, ignoring case and punctuation, it equals the component's name or
 *      begins with it — so "Figure block" covers `Figure` and
 *      "Comparison table" covers `ComparisonTable`.
 *
 * Signal 2 is what catches components with no registry entry of their own —
 * the ones fed by Markdown itself (tables, lists, rules) and the sub-components
 * shared across page components.
 *
 * Transitional state: entries and headers written before the Claude Design
 * export era still carry the retired numbered convention ('46-callout-box',
 * "(46)" in a header). Those cannot join against a manifest name, so they are
 * reported in their own "legacy" bucket rather than silently miscounted as
 * gaps or removals. Each migrates to the named convention when its component
 * is next touched — never in bulk.
 */

const fs = require('fs');
const path = require('path');

const { blocks, page } = require('./components');

const STYLES = path.join(__dirname, 'assets', 'styles.css');

const MANIFEST = '_ds_manifest.json';

/**
 * Exported components this renderer deliberately does not implement, keyed by
 * the export's own component names (verified against the real
 * HGInsightsMarketingDesignSystem manifest).
 *
 * html-render emits a page *body* for an existing page, so the site chrome
 * around it is not ours to render; and it emits web HTML, so the print-only
 * document chrome has no target. These are not gaps — without this list the
 * audit would report the same false gaps on every future run.
 *
 * The retired numbered catalog also excluded its site header ('01'); the
 * export has no site-header component, so that concern has no key here.
 */
const OUT_OF_SCOPE = {
  DocCover: 'document cover — print/PDF chrome, no web target',
  PageHeaderBand: 'document running header — print/PDF chrome, no web target',
  PageFooterBand: 'document running footer — print/PDF chrome, no web target',
  AboutBlock: 'about block — print/PDF chrome, no web target',
  Logo: 'logo lockup — site chrome, not page-body content',
};

/** True for a `source` or header written under the retired numbered convention. */
function isLegacyNumbered(reference) {
  return /^\d{2}\b/.test(String(reference));
}

/** Case- and punctuation-insensitive form used to join CSS headers to names. */
function normalizeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Does a CSS block header label name this component? */
function headerCovers(label, name) {
  const normalizedLabel = normalizeName(label);
  const normalizedName = normalizeName(name);
  return normalizedName !== '' && normalizedLabel.startsWith(normalizedName);
}

/** The live registry as a flat list of { kind, name, source }. */
function liveRegistry() {
  return [
    ...[...blocks.values()].map((component) => ({ kind: 'block', ...component })),
    ...[...page.values()].map((component) => ({ kind: 'page', ...component })),
  ];
}

/** Every CSS block header label, in file order. Numbered ones are legacy. */
function styleHeaders(cssText) {
  const labels = [];
  const header = /\/\*\s*-+\s*(.+?)\s*-+\s*\*\//g;
  let match;
  while ((match = header.exec(cssText)) !== null) labels.push(match[1]);
  return labels;
}

/** First non-empty line of a component's `.prompt.md`, as its one-line role. */
function promptSummary(exportDir, sourcePath) {
  const promptPath = path.join(exportDir, sourcePath.replace(/\.jsx$/, '.prompt.md'));
  if (!fs.existsSync(promptPath)) return '';
  const line = fs
    .readFileSync(promptPath, 'utf8')
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row.length);
  return line || '';
}

/**
 * Classify every exported component against what this renderer implements.
 *
 * `options.components` and `options.css` override the two coverage signals so
 * the join can be tested against a fixture instead of the live repo.
 */
function auditCatalog(exportDir, options = {}) {
  const manifestPath = path.join(exportDir, MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`no ${MANIFEST} under ${exportDir} — not a Claude Design export`);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`${MANIFEST} is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(manifest.components) || !manifest.components.length) {
    throw new Error(`${MANIFEST} lists no components`);
  }

  const registry = options.components || liveRegistry();
  const cssText = options.css != null ? options.css : fs.readFileSync(STYLES, 'utf8');
  const headers = styleHeaders(cssText);

  const legacy = {
    sources: registry
      .filter((component) => isLegacyNumbered(component.source))
      .map((component) => ({ source: component.source, claimedBy: `${component.kind} \`${component.name}\`` })),
    headers: headers.filter((label) => /\(([^)]*\b\d{2}\b[^)]*)\)/.test(label)),
  };

  const modern = registry.filter((component) => !isLegacyNumbered(component.source));
  const namedHeaders = headers.filter((label) => !legacy.headers.includes(label));

  const names = new Set();
  const entries = manifest.components.map((component) => {
    const name = component.name;
    names.add(name);
    const coveredBy = [
      ...modern.filter((entry) => entry.source === name).map((entry) => `${entry.kind} \`${entry.name}\``),
      ...namedHeaders.filter((label) => headerCovers(label, name)).map((label) => `css \`${label}\``),
    ];
    let status = 'new';
    if (coveredBy.length) status = 'covered';
    else if (OUT_OF_SCOPE[name]) status = 'out-of-scope';
    return {
      name,
      sourcePath: component.sourcePath || '',
      category: (component.sourcePath || '').split('/')[1] || '',
      role: promptSummary(exportDir, component.sourcePath || ''),
      status,
      reason: status === 'out-of-scope' ? OUT_OF_SCOPE[name] : '',
      coveredBy,
    };
  });

  // A registry source the manifest no longer names. Legacy numbered sources
  // are excluded — they predate name joins and live in their own bucket. CSS
  // headers are not checked for removal: an unnumbered header that matches no
  // component is indistinguishable from page plumbing ("Page composition").
  const removed = modern
    .filter((component) => !names.has(component.source))
    .map((component) => ({ source: component.source, claimedBy: `${component.kind} \`${component.name}\`` }));

  return {
    catalogDir: exportDir,
    namespace: manifest.namespace || 'unknown',
    entries,
    removed,
    legacy,
    counts: {
      catalogued: entries.length,
      covered: entries.filter((entry) => entry.status === 'covered').length,
      new: entries.filter((entry) => entry.status === 'new').length,
      outOfScope: entries.filter((entry) => entry.status === 'out-of-scope').length,
      removed: removed.length,
      legacy: legacy.sources.length + legacy.headers.length,
    },
  };
}

function table(rows, headings) {
  const widths = headings.map((heading, column) =>
    Math.max(heading.length, ...rows.map((row) => String(row[column]).length)),
  );
  const line = (cells) => `  ${cells.map((cell, column) => String(cell).padEnd(widths[column])).join('  ')}`.trimEnd();
  return [line(headings), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)].join('\n');
}

/** Render an audit result for the terminal. */
function formatAudit(result) {
  const out = [
    `# Export audit — ${result.catalogDir}`,
    '',
    `Export namespace: ${result.namespace}`,
    `${result.counts.catalogued} exported — ${result.counts.covered} covered, ` +
      `${result.counts.new} new, ${result.counts.outOfScope} out of scope, ${result.counts.removed} removed`,
    '',
  ];

  const listed = (status) => result.entries.filter((entry) => entry.status === status);

  const fresh = listed('new');
  out.push(`## New — not implemented here (${fresh.length})`, '');
  out.push(
    fresh.length
      ? table(
          fresh.map((entry) => [entry.name, entry.category, entry.role]),
          ['component', 'category', 'role'],
        )
      : '  none',
  );
  out.push('');

  if (result.removed.length) {
    out.push(`## Removed — implemented here, gone from the export (${result.removed.length})`, '');
    out.push(
      table(
        result.removed.map((entry) => [entry.source, entry.claimedBy]),
        ['source', 'claimed by'],
      ),
      '',
    );
  }

  if (result.legacy.sources.length || result.legacy.headers.length) {
    out.push(
      `## Legacy numbered convention — cannot join on export names (${result.counts.legacy})`,
      '',
      'Written against the retired design-web-components catalog. Each migrates to a',
      'verbatim export name when its component is next touched — never in bulk.',
      '',
    );
    if (result.legacy.sources.length) {
      out.push(
        table(
          result.legacy.sources.map((entry) => [entry.source, entry.claimedBy]),
          ['source', 'claimed by'],
        ),
        '',
      );
    }
    if (result.legacy.headers.length) {
      out.push(...result.legacy.headers.map((label) => `  css \`${label}\``), '');
    }
  }

  const skipped = listed('out-of-scope');
  out.push(`## Out of scope by design (${skipped.length})`, '');
  out.push(
    skipped.length
      ? table(
          skipped.map((entry) => [entry.name, entry.reason]),
          ['component', 'why'],
        )
      : '  none',
  );
  out.push('');

  const covered = listed('covered');
  out.push(`## Covered (${covered.length})`, '');
  out.push(
    covered.length
      ? table(
          covered.map((entry) => [entry.name, entry.coveredBy.join(', ')]),
          ['component', 'implemented by'],
        )
      : '  none',
    '',
  );

  return out.join('\n');
}

module.exports = { auditCatalog, formatAudit, headerCovers, isLegacyNumbered, OUT_OF_SCOPE };
