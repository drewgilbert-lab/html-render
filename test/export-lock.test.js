'use strict';

/**
 * The export fingerprint, and the contract stamp that carries it.
 *
 * These two are one mechanism. The lock answers "which design build is this renderer reconciled
 * against?" — a question the export itself cannot answer, because three different exports have
 * shipped under one `namespace`. The contract stamp carries that answer, plus the full renderer
 * commit, downstream, where a consumer resolves the pair from it.
 *
 * What is actually proven here:
 *
 *   1. the digest is content-addressed — a byte changing in any component source, token file or
 *      stylesheet moves it, and a namespace that did not move does not save it;
 *   2. the digest is reproducible — same export, same digest, from a copy at a different path;
 *   3. renaming the export folder does NOT move it, because a folder name is not a design change;
 *   4. `--check` reports what moved, component by component;
 *   5. the committed lock is current for the committed contract, and the contract's stamp carries
 *      a full 40-character renderer SHA rather than an abbreviated one — `actions/checkout`
 *      cannot resolve a short SHA, so a short stamp makes the downstream resolver inoperable.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { fingerprint, compare, readLock, SCHEMA } = require('../scripts/export-lock');

const FIXTURE = path.join(__dirname, 'fixtures', 'design-export-sample');
const ROOT = path.join(__dirname, '..');

/** A throwaway copy of the fixture, so a test can mutate a file without touching the fixture. */
function copyExport(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-lock-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('fingerprints every component, token file and stylesheet the manifest names', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURE, '_ds_manifest.json'), 'utf8'));
  const lock = fingerprint(FIXTURE);

  assert.equal(lock.schema, SCHEMA);
  assert.equal(lock.namespace, manifest.namespace);
  assert.equal(Object.keys(lock.components).length, manifest.components.length);

  for (const component of manifest.components) {
    const entry = lock.components[component.name];
    assert.ok(entry, `${component.name} is missing from the lock`);
    assert.equal(entry.source, component.sourcePath);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  }

  const styles = { ...lock.tokens, ...lock.css };
  assert.deepEqual(
    Object.keys(styles).sort(),
    [...(manifest.globalCssPaths || [])].sort(),
  );
  assert.match(lock.digest, /^[0-9a-f]{64}$/);
});

test('the digest is reproducible from a copy at a different path', (t) => {
  assert.equal(fingerprint(copyExport(t)).digest, fingerprint(FIXTURE).digest);
});

test('renaming the export folder does not move the digest', (t) => {
  const dir = copyExport(t);
  const renamed = path.join(path.dirname(dir), `${path.basename(dir)}-renamed`);
  fs.renameSync(dir, renamed);
  t.after(() => fs.rmSync(renamed, { recursive: true, force: true }));

  const lock = fingerprint(renamed);
  assert.equal(lock.digest, fingerprint(FIXTURE).digest);
  // The name is still recorded — it is a label a reader recognises, just not an identity.
  assert.equal(lock.export, path.basename(renamed));
});

test('a changed component source moves the digest and is named, with the namespace unmoved', (t) => {
  const dir = copyExport(t);
  const before = fingerprint(dir);

  const target = path.join(dir, before.components.Callout.source);
  fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}\n/* a brand repaint */\n`);
  const after = fingerprint(dir);

  assert.notEqual(after.digest, before.digest);
  // Exactly the failure the old `build` field could not see: same namespace, different build.
  assert.equal(after.namespace, before.namespace);

  const diff = compare(before, after);
  assert.deepEqual(diff.changed, ['Callout']);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.styles, []);
});

test('a changed stylesheet moves the digest and is named', (t) => {
  const dir = copyExport(t);
  const before = fingerprint(dir);

  const relative = Object.keys({ ...before.tokens, ...before.css })[0];
  const target = path.join(dir, relative);
  fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}\n/* retuned */\n`);
  const after = fingerprint(dir);

  assert.notEqual(after.digest, before.digest);
  assert.deepEqual(compare(before, after).styles, [relative]);
  assert.deepEqual(compare(before, after).changed, []);
});

test('an added and a removed component are each named', (t) => {
  const dir = copyExport(t);
  const before = fingerprint(dir);

  const manifestPath = path.join(dir, '_ds_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const dropped = manifest.components.shift();
  manifest.components.push({ name: 'Newcomer', sourcePath: dropped.sourcePath });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const diff = compare(before, fingerprint(dir));
  assert.deepEqual(diff.added, ['Newcomer']);
  assert.deepEqual(diff.removed, [dropped.name]);
});

test('a manifest naming a file the export does not contain is rejected', (t) => {
  const dir = copyExport(t);
  const manifestPath = path.join(dir, '_ds_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.components.push({ name: 'Ghost', sourcePath: 'components/ghost/Ghost.jsx' });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  assert.throws(() => fingerprint(dir), /does not contain/);
});

test('the committed lock parses and carries a sha256 digest', () => {
  const lock = readLock();
  assert.match(lock.digest, /^[0-9a-f]{64}$/);
  assert.ok(lock.counts.components > 0);
  assert.ok(lock.export, 'the lock records which export folder it came from');
});

test('the generated contract stamps the full renderer SHA and the committed export digest', () => {
  const { execFileSync } = require('node:child_process');
  const out = path.join(os.tmpdir(), `contract-${process.pid}.md`);
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-contract.js'), '--out', out],
      { cwd: ROOT, stdio: 'ignore' });
    const stamp = fs.readFileSync(out, 'utf8').split('\n')[0];

    // 40 hex, not 7: `actions/checkout` refuses an abbreviated SHA, and resolving the renderer
    // by this value is the whole reason the stamp exists.
    const commit = /commit=([0-9a-f]+)/.exec(stamp);
    assert.ok(commit, `no commit= in the stamp: ${stamp}`);
    assert.equal(commit[1].length, 40);
    assert.equal(commit[1], execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim());

    const exported = /export=([0-9a-f]+)/.exec(stamp);
    assert.ok(exported, `no export= in the stamp: ${stamp}`);
    assert.equal(exported[1], readLock().digest);
  } finally {
    fs.rmSync(out, { force: true });
  }
});

test('the contract is a pure function of committed state, not of an export folder', () => {
  const { execFileSync } = require('node:child_process');
  const run = () => execFileSync(process.execPath,
    [path.join(ROOT, 'scripts', 'generate-contract.js')],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  // Two runs at the same commit must be byte-identical: the sync workflow decides whether to open
  // a downstream pull request by diffing this output, so anything varying here turns the no-op
  // path into a stream of empty pull requests.
  assert.equal(run(), run());
});
