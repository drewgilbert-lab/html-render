'use strict';

/**
 * Catalog coverage audit for `html-render --audit <catalog-dir>`.
 *
 * Answers one question: which design-web-components entries does this renderer
 * implement, and which does it not? Generated from the live registry and the
 * live stylesheet, so it cannot fall out of date the way a hand-kept list would.
 *
 * Coverage is joined on two signals the repo already maintains:
 *
 *   1. Every registry entry names its design source ( source: '46-callout-box' ).
 *   2. Every CSS block header names the component it implements
 *      ( /`* ---- Comparison table (11) ---- *`/ ).
 *
 * Signal 2 is what catches components with no registry entry of their own —
 * the ones fed by Markdown itself (tables, lists, rules) and the sub-components
 * shared across page components.
 */

const fs = require('fs');
const path = require('path');

const { blocks, page } = require('./components');

const STYLES = path.join(__dirname, 'assets', 'styles.css');

/**
 * Catalogued components this renderer deliberately does not implement.
 *
 * html-render emits a page *body* for an existing page, so the site chrome
 * around it is not ours to render; and it emits web HTML, so the print-only
 * document chrome has no target. These are not gaps — without this
 * list the audit would report the same six false gaps on every future run.
 */
const OUT_OF_SCOPE = {
  '01': 'site header — site chrome the renderer does not own',
  '40': 'document cover — print/PDF chrome, no web target',
  '41': 'document running header — print/PDF chrome, no web target',
  '42': 'document running footer — print/PDF chrome, no web target',
  '43': 'about block — print/PDF chrome, no web target',
  '56': 'logo lockup — site chrome, not page-body content',
};

/** The leading NN of a catalog reference, ignoring any trailing "(variant)" note. */
function componentNumber(reference) {
  const match = String(reference).replace(/\s*\([^)]*\)\s*$/, '').match(/^(\d{2})\b/);
  return match ? match[1] : null;
}

/** The live registry as a flat list of { kind, name, source }. */
function liveRegistry() {
  return [
    ...[...blocks.values()].map((component) => ({ kind: 'block', ...component })),
    ...[...page.values()].map((component) => ({ kind: 'page', ...component })),
  ];
}

/** Every NN named by a registry entry's `source`, mapped to the components claiming it. */
function registryCoverage(components) {
  const found = new Map();
  for (const component of components) {
    const number = componentNumber(component.source);
    if (!number) continue;
    if (!found.has(number)) found.set(number, []);
    found.get(number).push(`${component.kind} \`${component.name}\``);
  }
  return found;
}

/**
 * Every NN named by a CSS block header, mapped to that header's label.
 *
 * Headers carrying no number are page plumbing rather than a catalogued
 * component ("Page composition", "Responsive") and are correctly skipped.
 */
function styleCoverage(cssText) {
  const found = new Map();
  const header = /\/\*\s*-+\s*(.+?)\s*-+\s*\*\//g;
  let match;
  while ((match = header.exec(cssText)) !== null) {
    const label = match[1];
    const parenthetical = label.match(/\(([^)]*)\)/);
    if (!parenthetical) continue;
    for (const number of parenthetical[1].match(/\b\d{2}\b/g) || []) {
      if (!found.has(number)) found.set(number, []);
      found.get(number).push(`css \`${label}\``);
    }
  }
  return found;
}

/** Role, context, and JS need for each file, from the INDEX.md catalog tables. */
function parseIndex(indexText) {
  const rows = new Map();
  const row = /^\|\s*(.+?)\s*\|\s*`([^`]+\.md)`\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/gm;
  let match;
  while ((match = row.exec(indexText)) !== null) {
    const file = match[2];
    const number = componentNumber(file);
    if (!number) continue;
    rows.set(number, {
      role: match[1].replace(/`/g, '').trim(),
      context: match[3].trim(),
      js: /yes/i.test(match[4]) ? 'yes' : 'none',
    });
  }
  return rows;
}

/**
 * Reasons a covered component may still need a human look.
 *
 * "Changed" is deliberately not auto-classified — deciding it needs a semantic
 * comparison of HTML and CSS, and guessing would give false confidence. What
 * the audit can do reliably is surface where the catalog itself says something
 * moved, and let the operator judge.
 */
function reviewTriggers(skillText, componentText) {
  const triggers = new Map();

  const history = skillText.split(/^##\s+Refresh history\s*$/m)[1];
  for (const line of (history || '').split('\n')) {
    if (!/^\s*-\s+/.test(line)) continue;
    const numbers = new Set((line.match(/`(\d{2})`/g) || []).map((token) => token.replace(/`/g, '')));
    for (const number of numbers) {
      if (!triggers.has(number)) triggers.set(number, []);
      triggers.get(number).push('named in the catalog’s Refresh history');
    }
  }

  for (const [number, text] of componentText) {
    // Refresh notes live in "Usage notes"; scanning the whole file would drag in
    // the token list, where "refreshed" shows up as incidental prose.
    const notes = (text.split(/^##\s+Usage notes\s*$/m)[1] || '').split(/^##\s+/m)[0];
    for (const line of notes.split('\n')) {
      if (!/^\s*-\s+/.test(line)) continue;
      if (!/refreshed|updated against|verified against|not part of the/i.test(line)) continue;
      const note = line.replace(/^\s*-\s+/, '').replace(/[*`]/g, '').trim();
      if (!triggers.has(number)) triggers.set(number, []);
      triggers.get(number).push(note.length > 96 ? `${note.slice(0, 93)}...` : note);
    }
  }

  return triggers;
}

/**
 * Classify every catalogued component against what this renderer implements.
 *
 * `options.components` and `options.css` override the two coverage signals so
 * the join can be tested against a fixture instead of the live repo.
 */
function auditCatalog(catalogDir, options = {}) {
  const componentsDir = path.join(catalogDir, 'components');
  if (!fs.existsSync(componentsDir)) {
    throw new Error(`no components/ directory under ${catalogDir}`);
  }

  const files = fs
    .readdirSync(componentsDir)
    .filter((name) => /^\d{2}-.*\.md$/.test(name))
    .sort();
  if (!files.length) throw new Error(`no NN-name.md component files in ${componentsDir}`);

  const indexPath = path.join(componentsDir, 'INDEX.md');
  const indexText = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const skillPath = path.join(catalogDir, 'SKILL.md');
  const skillText = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';

  const index = parseIndex(indexText);
  const componentText = new Map(
    files.map((name) => [componentNumber(name), fs.readFileSync(path.join(componentsDir, name), 'utf8')]),
  );
  const triggers = reviewTriggers(skillText, componentText);

  const fromRegistry = registryCoverage(options.components || liveRegistry());
  const fromStyles = styleCoverage(options.css != null ? options.css : fs.readFileSync(STYLES, 'utf8'));

  const entries = files.map((file) => {
    const number = componentNumber(file);
    const meta = index.get(number) || {};
    const coveredBy = [...(fromRegistry.get(number) || []), ...(fromStyles.get(number) || [])];
    let status = 'new';
    if (coveredBy.length) status = 'covered';
    else if (OUT_OF_SCOPE[number]) status = 'out-of-scope';
    return {
      number,
      file,
      role: meta.role || '',
      context: meta.context || '',
      js: meta.js || '',
      status,
      reason: status === 'out-of-scope' ? OUT_OF_SCOPE[number] : '',
      coveredBy,
      reviewTriggers: status === 'covered' ? triggers.get(number) || [] : [],
    };
  });

  const catalogued = new Set(entries.map((entry) => entry.number));
  const removed = [];
  for (const [number, claims] of [...fromRegistry, ...fromStyles]) {
    if (catalogued.has(number)) continue;
    removed.push({ number, claimedBy: claims });
  }

  const refreshed = (indexText.match(/\*\*Refreshed\s+([\d-]+)\.?\*\*/) || [])[1] || 'unknown';

  return {
    catalogDir,
    refreshed,
    entries,
    removed,
    counts: {
      catalogued: entries.length,
      covered: entries.filter((entry) => entry.status === 'covered').length,
      new: entries.filter((entry) => entry.status === 'new').length,
      outOfScope: entries.filter((entry) => entry.status === 'out-of-scope').length,
      removed: removed.length,
      needsReview: entries.filter((entry) => entry.reviewTriggers.length).length,
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
    `# Catalog audit — ${result.catalogDir}`,
    '',
    `Catalog refreshed: ${result.refreshed}`,
    `${result.counts.catalogued} catalogued — ${result.counts.covered} covered, ` +
      `${result.counts.new} new, ${result.counts.outOfScope} out of scope, ${result.counts.removed} removed`,
    '',
  ];

  const listed = (status) => result.entries.filter((entry) => entry.status === status);

  const fresh = listed('new');
  out.push(`## New — not implemented here (${fresh.length})`, '');
  out.push(
    fresh.length
      ? table(
          fresh.map((entry) => [entry.number, entry.role, entry.context, entry.js, entry.file]),
          ['#', 'role', 'context', 'js', 'file'],
        )
      : '  none',
  );
  out.push('');

  if (result.removed.length) {
    out.push(`## Removed — implemented here, gone from the catalog (${result.removed.length})`, '');
    out.push(
      table(
        result.removed.map((entry) => [entry.number, entry.claimedBy.join(', ')]),
        ['#', 'claimed by'],
      ),
      '',
    );
  }

  const review = result.entries.filter((entry) => entry.reviewTriggers.length);
  out.push(`## Covered, but the catalog says something moved (${review.length})`, '');
  out.push('Changed is not auto-classified — compare these by hand before deciding.', '');
  if (review.length) {
    for (const entry of review) {
      out.push(`  ${entry.number} ${entry.role}`);
      for (const trigger of entry.reviewTriggers) out.push(`      ${trigger}`);
    }
  } else {
    out.push('  none');
  }
  out.push('');

  const skipped = listed('out-of-scope');
  out.push(`## Out of scope by design (${skipped.length})`, '');
  out.push(
    skipped.length
      ? table(
          skipped.map((entry) => [entry.number, entry.role, entry.reason]),
          ['#', 'role', 'why'],
        )
      : '  none',
  );
  out.push('');

  const covered = listed('covered');
  out.push(`## Covered (${covered.length})`, '');
  out.push(
    table(
      covered.map((entry) => [entry.number, entry.role, entry.coveredBy.join(', ')]),
      ['#', 'role', 'implemented by'],
    ),
    '',
  );

  return out.join('\n');
}

module.exports = { auditCatalog, formatAudit, componentNumber, OUT_OF_SCOPE };
