#!/usr/bin/env node
'use strict';

/**
 * Fingerprint a Claude Design export, so "which build was this reconciled against?" has an
 * answer that cannot be filled in wrong.
 *
 *   node scripts/export-lock.js --export <dir>            # write design-export.lock.json
 *   node scripts/export-lock.js --export <dir> --check    # exit 1 if the lock disagrees
 *   node scripts/export-lock.js --digest                  # print the committed digest
 *
 * WHY THIS EXISTS. The export has no version stamp and no commit. `_ds_manifest.json`'s
 * `namespace` was adopted as the build identity in 2026-08 on the premise that it changes when
 * the export is recompiled. That premise is false, twice over: the 2026-09-01 recompile and the
 * 2026-09-15 rebrand both shipped under `HGInsightsMarketingDesignSystem_3bf70b` while differing
 * in component files, CSS and the whole token layer. So `--audit` reported a rebrand as no change
 * at all, and the only method that worked was keeping the previous download and diffing folders.
 *
 * A digest over the files that actually define the system replaces that method. Two exports are
 * the same build when this file says so, and a component whose source moved is named.
 *
 * WHAT IS HASHED. Exactly the paths the export itself declares:
 *
 *   - `components[].sourcePath` — one digest per component, keyed by the export's own name
 *   - `globalCssPaths` — split into `tokens` (tokens/*.css) and `css` (everything else) only
 *     because reading a 21-entry flat map is worse; both are hashed identically
 *
 * The overall `digest` is SHA-256 over a canonical JSON of the namespace and those three maps.
 * The export *name* is recorded but deliberately left out of it: the name is a folder on
 * somebody's laptop, and renaming a folder is not a design change.
 *
 * The manifest is not hashed as a file. Its component list is what matters and that is captured
 * above component by component; hashing the JSON itself would make a reordered key look like a
 * new build.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOCK = path.join(ROOT, 'design-export.lock.json');
const MANIFEST = '_ds_manifest.json';
const SCHEMA = 'html-render/design-export-lock/v1';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function digestFile(exportDir, relative) {
  const full = path.join(exportDir, relative);
  if (!fs.existsSync(full)) return null;
  return sha256(fs.readFileSync(full));
}

/**
 * Canonical JSON: object keys sorted at every level, no whitespace. The digest has to be
 * reproducible on another machine from the same export, so key order cannot be allowed to
 * come from whatever order the manifest happened to list things in.
 */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

function sortedMap(entries) {
  const out = {};
  for (const key of Object.keys(entries).sort()) out[key] = entries[key];
  return out;
}

/** Build the lock content for an export directory. Pure: no clock, no git, no repo state. */
function fingerprint(exportDir) {
  const manifestPath = path.join(exportDir, MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`no ${MANIFEST} under ${exportDir} — not a Claude Design export`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.components) || !manifest.components.length) {
    throw new Error(`${MANIFEST} lists no components`);
  }

  const missing = [];
  const components = {};
  for (const component of manifest.components) {
    const digest = digestFile(exportDir, component.sourcePath);
    if (digest === null) {
      missing.push(component.sourcePath);
      continue;
    }
    components[component.name] = { source: component.sourcePath, sha256: digest };
  }

  const tokens = {};
  const css = {};
  for (const relative of manifest.globalCssPaths || []) {
    const digest = digestFile(exportDir, relative);
    if (digest === null) {
      missing.push(relative);
      continue;
    }
    (relative.startsWith('tokens/') ? tokens : css)[relative] = digest;
  }

  if (missing.length) {
    throw new Error(
      `${MANIFEST} names ${missing.length} file(s) the export does not contain: ${missing.join(', ')}`,
    );
  }

  const body = {
    namespace: String(manifest.namespace || ''),
    components: sortedMap(components),
    tokens: sortedMap(tokens),
    css: sortedMap(css),
  };

  return {
    schema: SCHEMA,
    // A label, not an identity: the folder the export was downloaded to. Not in the digest.
    export: path.basename(path.resolve(exportDir)),
    // Recorded because it is what `--audit` and the old `designCatalog.build` reported, so a
    // reader can see for themselves that two different builds share one namespace.
    namespace: body.namespace,
    digest: sha256(canonical(body)),
    counts: {
      components: Object.keys(components).length,
      tokens: Object.keys(tokens).length,
      css: Object.keys(css).length,
    },
    ...body,
  };
}

function readLock() {
  if (!fs.existsSync(LOCK)) {
    throw new Error(
      `no design-export.lock.json — run: node scripts/export-lock.js --export <export-dir>`,
    );
  }
  const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
  if (lock.schema !== SCHEMA) {
    throw new Error(`design-export.lock.json: schema is ${lock.schema}, expected ${SCHEMA}`);
  }
  if (!/^[0-9a-f]{64}$/.test(String(lock.digest || ''))) {
    throw new Error('design-export.lock.json: digest is not a sha256');
  }
  return lock;
}

function serialize(lock) {
  return `${JSON.stringify(lock, null, 2)}\n`;
}

/** What changed between two locks, component by component. Drives the sync skill's Step 1. */
function compare(previous, next) {
  const before = previous.components || {};
  const after = next.components || {};
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const added = names.filter((n) => !before[n] && after[n]);
  const removed = names.filter((n) => before[n] && !after[n]);
  const changed = names.filter((n) => before[n] && after[n] && before[n].sha256 !== after[n].sha256);

  const styleNames = (lock) => ({ ...(lock.tokens || {}), ...(lock.css || {}) });
  const beforeStyles = styleNames(previous);
  const afterStyles = styleNames(next);
  const stylePaths = [...new Set([...Object.keys(beforeStyles), ...Object.keys(afterStyles)])].sort();
  const styles = stylePaths.filter((p) => beforeStyles[p] !== afterStyles[p]);

  return { added, removed, changed, styles };
}

function formatComparison(previous, next) {
  if (previous.digest === next.digest) {
    return `design-export.lock.json is current (digest ${next.digest.slice(0, 12)}); the export has not moved.`;
  }
  const { added, removed, changed, styles } = compare(previous, next);
  const lines = [
    `Export moved: ${previous.digest.slice(0, 12)} -> ${next.digest.slice(0, 12)}`,
    `  namespace:  ${previous.namespace} -> ${next.namespace}`
      + (previous.namespace === next.namespace ? '   (unchanged, and therefore useless as an identity)' : ''),
    '',
  ];
  const bucket = (label, items) => {
    if (!items.length) return;
    lines.push(`${label} (${items.length}):`);
    for (const item of items) lines.push(`  - ${item}`);
    lines.push('');
  };
  bucket('Components added', added);
  bucket('Components removed', removed);
  bucket('Components changed', changed);
  bucket('Stylesheets and tokens changed', styles);
  if (!added.length && !removed.length && !changed.length && !styles.length) {
    lines.push('No component or stylesheet differs. The digest moved on the manifest alone.');
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '');
}

function main(argv) {
  const options = { export: null, check: false, digest: false, out: LOCK };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--export': options.export = argv[++i]; break;
      case '--check': options.check = true; break;
      case '--digest': options.digest = true; break;
      case '--out': options.out = path.resolve(argv[++i]); break;
      case '--help': case '-h':
        process.stdout.write(
          'usage: export-lock.js --export <dir> [--check] [--out <path>]\n'
          + '       export-lock.js --digest\n',
        );
        return 0;
      default:
        process.stderr.write(`export-lock: unknown argument ${argv[i]}\n`);
        return 2;
    }
  }

  if (options.digest) {
    process.stdout.write(`${readLock().digest}\n`);
    return 0;
  }

  if (!options.export) {
    process.stderr.write('export-lock: --export <dir> is required\n');
    return 2;
  }

  const next = fingerprint(path.resolve(options.export));

  if (options.check) {
    const previous = readLock();
    process.stdout.write(`${formatComparison(previous, next)}\n`);
    return previous.digest === next.digest ? 0 : 1;
  }

  if (fs.existsSync(options.out)) {
    try {
      process.stdout.write(`${formatComparison(readLock(), next)}\n\n`);
    } catch {
      /* An unreadable or older lock is replaced, not reported against. */
    }
  }
  fs.writeFileSync(options.out, serialize(next));
  process.stdout.write(
    `Wrote ${path.relative(ROOT, options.out)} — ${next.counts.components} components, `
    + `${next.counts.tokens} token files, ${next.counts.css} stylesheets, digest ${next.digest.slice(0, 12)}\n`,
  );
  return 0;
}

module.exports = { fingerprint, readLock, compare, formatComparison, LOCK, SCHEMA };

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`export-lock: ${error.message}\n`);
    process.exit(2);
  }
}
