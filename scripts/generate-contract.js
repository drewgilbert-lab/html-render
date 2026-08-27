#!/usr/bin/env node
'use strict';

/**
 * Generate the consolidated component contract that `geo-spoke-builder` consumes as
 * `references/html-render-contract.md`.
 *
 *   node scripts/generate-contract.js [--out <path>]
 *   node scripts/generate-contract.js --changelog-since <commit>
 *
 * Every section below is captured from the live CLI (`--contract pillar|cluster|spoke`,
 * `--components`), never hand-copied. That is the whole point: the old per-skill component
 * manifests in `geo-spoke-builder` drifted because they were transcribed by hand. If the registry
 * changes, this file changes with it or not at all.
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

/** The four CLI captures, in the order they appear in the output. */
const SECTIONS = [
  { heading: 'Pillar page — Markdown contract', args: ['--contract', 'pillar'] },
  { heading: 'Cluster page — Markdown contract', args: ['--contract', 'cluster'] },
  { heading: 'Spoke page — Markdown contract', args: ['--contract', 'spoke'] },
  { heading: 'Component registry', args: ['--components'] },
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

function header(pkg, commit) {
  const catalog = pkg.designCatalog || {};
  return [
    // Machine-readable stamp. The sync workflow parses `commit=` out of the *previous* copy of
    // this file to work out which changelog entries are new. Keep this line's shape stable.
    `<!-- html-render:contract version=${pkg.version} commit=${commit} catalog=${catalog.build || catalog.commit || 'unknown'} -->`,
    '',
    '# html-render — component and Markdown contract',
    '',
    'Generated from `html-render`, do not edit by hand. Edits here are overwritten by the next',
    'sync; to change anything below, change the renderer and cut a release.',
    '',
    '| | |',
    '| --- | --- |',
    `| Renderer version | \`v${pkg.version}\` |`,
    `| Renderer commit | \`${commit}\` |`,
    `| Design catalog | \`${catalog.catalog || 'unknown'}\` |`,
    `| Catalog build | \`${catalog.build || catalog.commit || 'unknown'}\` |`,
    `| Last reconciled | ${catalog.syncedAt || 'unknown'} |`,
    '',
    'This is the full contract for writing renderer-ready Markdown: the frontmatter each page class',
    'requires, the order its components render in, and every component a page section can invoke.',
    'A page that satisfies the contract below renders; one that does not is rejected by',
    '`html-render --check` with the field named.',
    '',
    'The four sections that follow are captured verbatim from the renderer CLI —',
    '`--contract pillar`, `--contract cluster`, `--contract spoke`, and `--components`. Run those',
    'commands against the version above to reproduce this file exactly.',
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

function buildContract() {
  const pkg = packageJson();
  const commit = git(['rev-parse', '--short', 'HEAD']);
  const parts = [header(pkg, commit)];

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

module.exports = { buildContract, fenceFor, changelogSince, renderChangelogSince, breakingTags, splitEntries };
