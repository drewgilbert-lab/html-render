#!/usr/bin/env node
'use strict';

/**
 * Generate the consolidated component contract that `geo-spoke-builder` consumes as
 * `references/html-render-contract.md`.
 *
 *   node scripts/generate-contract.js [--out <path>]
 *   node scripts/generate-contract.js --changelog-since <commit>
 *
 * The document has two halves and neither is hand-copied here. `docs/authoring.md` is included
 * verbatim (how a document is assembled: the split, components, regions, the assembly order, the
 * named-element vocabulary), and the catalog is captured from the live CLI (`--components`). That
 * is the whole point: the old per-skill component manifests and assembly instructions in
 * `geo-spoke-builder` drifted because they were transcribed by hand, 16 times over. If the
 * registry or the authoring guide changes, this file changes with it or not at all.
 *
 * INVARIANT — the output must be a pure function of the repo's committed state.
 * No timestamps, no "generated on", no run IDs, nothing that varies between two runs at the same
 * commit. The sync workflow decides whether to open a PR by diffing this output against what is
 * already committed downstream; anything time-varying here makes every run look like a change and
 * turns the no-op path into a stream of empty PRs.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'html-render.js');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const AUTHORING = path.join(ROOT, 'docs', 'authoring.md');

const { readLock } = require('./export-lock');

/** The CLI capture that makes up the document. */
const SECTIONS = [{ heading: 'Catalog', args: ['--components'] }];

/**
 * Everything the contract's bytes are made of.
 *
 * The stamped commit is the last commit that touched one of these, NOT `HEAD`. That
 * distinction is the whole no-op path: stamping `HEAD` means every commit to `main` moves
 * the contract, so a README fix opens a downstream pull request and bumps the consumer's
 * plugin version for a catalog that did not change. It did exactly that once, on
 * 2026-09-16, taking the plugin to 0.53.0 for a docs-only commit.
 *
 * The stamp is self-consistent by construction: at the commit it names, this same query
 * returns that commit, because that commit touched an input. So a consumer that checks it
 * out and regenerates gets byte-identical output, which is what its required check asserts.
 */
const CONTRACT_INPUTS = [
  'package.json',              // the version in the header
  'design-export.lock.json',   // the export digest in the header
  'docs/authoring.md',         // the first half, verbatim
  'src',                       // what `--components` prints
  'bin',                       // the CLI that prints it
  'scripts/generate-contract.js',
  'scripts/export-lock.js',
];

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function cli(args) {
  return execFileSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }).replace(/\s+$/, '');
}

function packageJson() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function header(pkg, commit, lock) {
  const catalog = pkg.designCatalog || {};
  return [
    // Machine-readable stamp, and the only runtime reference downstream has to this renderer.
    //
    // `commit` is the FULL 40-character SHA, deliberately. Consumers resolve the renderer by
    // checking this commit out, and `actions/checkout` cannot resolve an abbreviated SHA — a
    // short stamp here makes the whole resolver inoperable. The version beside it is
    // human-readable metadata; the SHA is what identifies the code.
    //
    // It is the last commit that touched what this file is made of, not `HEAD`. See
    // CONTRACT_INPUTS: stamping `HEAD` would move the contract on every commit and defeat
    // the no-op path this workflow depends on.
    //
    // `export` is the design-export digest, read from the committed `design-export.lock.json`
    // and never recomputed here. The sync workflow decides whether to open a downstream PR by
    // diffing this file byte for byte against what is already committed, so every field in it
    // must be a pure function of this repo's committed state — a digest computed from an export
    // folder on the runner would depend on a download that CI does not have.
    //
    // The sync workflow parses `commit=` out of the *previous* copy of this file to work out
    // which changelog entries are new. Keep this line's shape stable.
    `<!-- html-render:contract version=${pkg.version} commit=${commit} export=${lock.digest} -->`,
    '',
    '# html-render — authoring guide and component catalog',
    '',
    'Generated from `html-render`, do not edit by hand. Edits here are overwritten by the next',
    'sync; to change anything below, change the renderer and cut a release.',
    '',
    '| | |',
    '| --- | --- |',
    `| Renderer version | \`v${pkg.version}\` |`,
    `| Renderer commit | \`${commit}\` |`,
    `| Design catalog | \`${catalog.catalog || 'unknown'}\` |`,
    // The export's `namespace` does not change when the export is recompiled: three exports
    // with different components, CSS and tokens have now shipped under the same one. It is
    // printed because a reader should be able to see that for themselves, never as an identity.
    // The digest below is the identity.
    `| Catalog export | \`${lock.export}\` (namespace \`${lock.namespace}\`) |`,
    `| Export digest | \`${lock.digest}\` |`,
    `| Export contents | ${lock.counts.components} components, ${lock.counts.tokens} token files, ${lock.counts.css} stylesheets |`,
    `| Last reconciled | ${catalog.syncedAt || 'unknown'} |`,
    '',
    'Two halves. **Authoring a document** is how a document is assembled: what goes in',
    'frontmatter versus the body, how components and regions are written, the order the',
    'parts of a finished page appear in, and the named-element vocabulary a pipeline can',
    'specify a page in. **Catalog** is what the renderer can draw: every component, the two',
    'regions that wrap them, and the frontmatter it reads but never draws.',
    '',
    '**Neither half is enforced by the renderer.** `html-render --check` rejects only what',
    'cannot be rendered: a component that does not exist, a region with no wrapper, a field',
    'whose shape cannot be used, an unbalanced region. A page missing an FAQ, or carrying',
    'two, or carrying its CTA first, renders without complaint. Deciding what a page of a',
    'given format must contain — its sections, its word budget, whether it is any good —',
    'belongs to whatever writes the Markdown, and is checked there.',
    '',
    'The first half is `docs/authoring.md` verbatim; the second is captured from',
    '`html-render --components`. Run that command against the version above to reproduce',
    'this file exactly.',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Contract document
// ---------------------------------------------------------------------------

/**
 * A code fence long enough to wrap `body` intact.
 *
 * `--components` prints the fenced-block syntax authors actually type (```` ```bars ````), so a
 * plain three-backtick wrapper is closed early by the content and the rest of the file spills out
 * as broken Markdown. CommonMark allows any run of three or more, closed by an equal or longer
 * run — so measure the longest run inside and go one better.
 */
function fenceFor(body) {
  const longest = (body.match(/`+/g) || []).reduce((max, run) => Math.max(max, run.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

/**
 * `docs/authoring.md`, minus its own H1.
 *
 * Included verbatim rather than fenced: it is Markdown prose, not a CLI capture, and its own
 * fenced examples survive nesting only if nothing wraps them. Dropping the H1 lets its `##`
 * headings sit at the same level as `## Catalog` below, so the two halves read as one document.
 */
function authoringGuide() {
  const text = fs.readFileSync(AUTHORING, 'utf8');
  return text.replace(/^#\s+.*\n+/, '').replace(/\s+$/, '');
}

/**
 * The commit a consumer should check out to reproduce this contract.
 *
 * Falls back to `HEAD` only when the query answers nothing, which means a shallow clone
 * with no history to search. The sync workflow checks out with `fetch-depth: 0` precisely
 * so that cannot happen; the fallback keeps a hand run in a shallow tree working rather
 * than stamping an empty string.
 */
function contractCommit() {
  const touched = git(['log', '-1', '--format=%H', '--', ...CONTRACT_INPUTS]);
  return touched || git(['rev-parse', 'HEAD']);
}

function buildContract() {
  const pkg = packageJson();
  const commit = contractCommit();
  const parts = [header(pkg, commit, readLock()), '---', '', authoringGuide(), ''];

  for (const section of SECTIONS) {
    const body = cli(section.args);
    const fence = fenceFor(body);
    parts.push('---', '', `## ${section.heading}`, '', fence, body, fence, '');
  }

  return `${parts.join('\n').replace(/\n+$/, '')}\n`;
}

// ---------------------------------------------------------------------------
// Changelog extraction — used by the sync workflow to build the PR body
// ---------------------------------------------------------------------------

/** Split a CHANGELOG body into `## `-delimited entries, preserving text verbatim. */
function splitEntries(text) {
  const entries = [];
  const lines = text.split('\n');
  let current = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) entries.push(current);
      current = { heading: line.slice(3).trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) entries.push(current);
  return entries.map((entry) => ({
    heading: entry.heading,
    // Trim the trailing `---` separator and blank padding between entries, keep the body verbatim.
    text: entry.lines.join('\n').replace(/\n+-{3,}\s*$/, '').replace(/\s+$/, ''),
  }));
}

/**
 * Every changelog entry present now but absent at `sinceCommit`.
 *
 * CHANGELOG.md is append-only by rule (see the sync skill, Step 6), so "new entries" is exactly
 * "headings that did not exist at that commit" — no diffing of the renderer's own code required.
 * Returns `{ entries, note }`; `note` explains any fallback so the PR body can say so out loud
 * rather than quietly under-reporting.
 */
function changelogSince(sinceCommit) {
  const now = splitEntries(fs.readFileSync(CHANGELOG, 'utf8'));

  if (!sinceCommit) {
    return { entries: now, note: 'No previous contract file to compare against — this is the first sync, so every changelog entry is listed.' };
  }

  let previous;
  try {
    previous = execFileSync('git', ['show', `${sinceCommit}:CHANGELOG.md`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'], // we report the fallback ourselves; don't echo git's error
    });
  } catch (error) {
    return {
      entries: now,
      note: `Could not read CHANGELOG.md at \`${sinceCommit}\` (the commit stamped in the previous contract file) — it may be missing from this checkout's history. Listing every entry instead of only the new ones; some of these may already have been synced.`,
    };
  }

  const seen = new Set(splitEntries(previous).map((entry) => entry.heading));
  return { entries: now.filter((entry) => !seen.has(entry.heading)), note: null };
}

/**
 * Conservative breaking-change screen.
 *
 * `**Removed**` and `**Deprecated**` are unambiguous. `**Changed**` is flagged too: whether a
 * change carries an incompatible field is a judgement about prose that this script cannot make,
 * and a missed breaking change costs a downstream maintainer far more than a flag Drew dismisses
 * in five seconds. The flag names the tag that tripped it so it is quick to clear.
 */
function breakingTags(entries) {
  const tags = ['Removed', 'Deprecated', 'Changed'];
  const found = new Set();
  for (const entry of entries) {
    for (const tag of tags) {
      if (new RegExp(`\\*\\*${tag}\\*\\*`).test(entry.text)) found.add(tag);
    }
  }
  return [...found];
}

function renderChangelogSince(sinceCommit) {
  const { entries, note } = changelogSince(sinceCommit);
  const blocks = [];

  const tags = breakingTags(entries);
  if (tags.length) {
    blocks.push(
      `**Potentially breaking** — the changelog entries below are tagged ${tags.map((t) => `\`${t}\``).join(', ')}. Read them before merging; a removed, deprecated, or field-incompatible component breaks pages already using it.`,
    );
  }

  if (note) blocks.push(`> ${note}`);

  if (!entries.length) {
    blocks.push('No new changelog entries since the last synced version.');
  } else {
    blocks.push(...entries.map((entry) => entry.text));
  }

  return `${blocks.join('\n\n').replace(/\s+$/, '')}\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  let out = null;
  let changelogSinceArg;

  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--out':
      case '-o':
        out = argv[++i];
        break;
      case '--changelog-since':
        changelogSinceArg = argv[++i] || '';
        break;
      case '-h':
      case '--help':
        process.stdout.write(
          [
            'generate-contract — build the component contract geo-spoke-builder consumes',
            '',
            'Usage:',
            '  node scripts/generate-contract.js [--out <path>]',
            '  node scripts/generate-contract.js --changelog-since <commit>',
            '',
            'Options:',
            '  -o, --out <path>            write to <path> instead of stdout',
            '      --changelog-since <c>   print the PR-body changelog block instead of the',
            '                              contract: every entry newer than commit <c>, plus a',
            '                              breaking-change flag. Empty <c> means "first sync".',
            '  -h, --help                  show this message',
            '',
          ].join('\n'),
        );
        return;
      default:
        process.stderr.write(`generate-contract: unknown option "${argv[i]}"\n`);
        process.exit(1);
    }
  }

  const text = changelogSinceArg !== undefined ? renderChangelogSince(changelogSinceArg) : buildContract();

  if (out) {
    const target = path.resolve(out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, 'utf8');
    process.stderr.write(`wrote ${path.relative(process.cwd(), target)} — ${text.split('\n').length} lines\n`);
  } else {
    process.stdout.write(text);
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { buildContract, authoringGuide, fenceFor, changelogSince, renderChangelogSince, breakingTags, splitEntries };
