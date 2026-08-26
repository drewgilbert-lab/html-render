'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { render, renderFile } = require('../src/index');
const { resolveConfig, requireOrganization, ConfigError, CONFIG_FILENAME, DEFAULTS } = require('../src/config');
const { pillar, EXAMPLE_CONFIG } = require('./helpers');

const ROOT = path.join(__dirname, '..');
const ACME = {
  organization: {
    name: 'Acme Analytics',
    url: 'https://acme.example/',
    id: 'https://acme.example/#org',
    logo: 'https://acme.example/logo.png',
    sameAs: ['https://www.linkedin.com/company/acme/'],
  },
  pageClass: 'acme-page',
  language: 'en-GB',
  fontHref: 'https://fonts.googleapis.com/css2?family=Inter&display=swap',
};

function graphOf(html) {
  const match = /<script type="application\/ld\+json">\n([\s\S]*?)\n\s*<\/script>/.exec(html);
  assert.ok(match, 'no JSON-LD block found');
  return JSON.parse(match[1]);
}

function nodeOf(graph, type) {
  return graph['@graph'].find((node) => node['@type'] === type);
}

/** A temp directory that cleans itself up, for the config files these tests write. */
function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-render-config-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('config drives the organization, wrapper class, language, and webfont', () => {
  const { html } = render(pillar(), { config: ACME });
  const graph = graphOf(html);

  assert.deepEqual(nodeOf(graph, 'Organization'), {
    '@type': 'Organization',
    '@id': 'https://acme.example/#org',
    name: 'Acme Analytics',
    url: 'https://acme.example/',
    logo: 'https://acme.example/logo.png',
    sameAs: ['https://www.linkedin.com/company/acme/'],
  });
  assert.equal(nodeOf(graph, 'Person').worksFor['@id'], 'https://acme.example/#org');
  assert.equal(nodeOf(graph, 'Article').publisher['@id'], 'https://acme.example/#org');
  assert.equal(nodeOf(graph, 'Article').inLanguage, 'en-GB');

  assert.match(html, /<div class="acme-page" data-page-type="pillar">/);
  assert.match(html, /\.acme-page \.hero \{/);
  assert.match(html, /querySelector\('\.acme-page'\)/);
  assert.match(html, /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Inter&display=swap'\)/);
});

test('a config file is read from disk, and found in the working directory', (t) => {
  const dir = tempDir(t);
  const file = path.join(dir, CONFIG_FILENAME);
  fs.writeFileSync(file, JSON.stringify(ACME), 'utf8');

  assert.equal(resolveConfig(file).organization.name, 'Acme Analytics');

  const cwd = process.cwd();
  try {
    process.chdir(dir);
    assert.equal(resolveConfig(null).organization.name, 'Acme Analytics', 'auto-detection missed ./' + CONFIG_FILENAME);
  } finally {
    process.chdir(cwd);
  }
});

test('the renderer ships no organization of its own', () => {
  const bare = resolveConfig(null, { cwd: os.tmpdir() });
  assert.equal(bare.organization, null);
  assert.equal(bare.pageClass, DEFAULTS.pageClass);
  assert.equal(bare.fontHref, null, 'a webfont is a brand choice; the default links none');

  assert.throws(() => requireOrganization(bare), (error) => {
    assert.ok(error instanceof ConfigError);
    // The error names what is missing and how to supply it — never a placeholder.
    assert.match(error.message, /organization\.name, organization\.url/);
    assert.match(error.message, /--config <file>/);
    assert.match(error.message, new RegExp(CONFIG_FILENAME));
    return true;
  });
});

test('rendering without a config fails on the schema, not silently', () => {
  const inTemp = { cwd: os.tmpdir() };
  const bare = resolveConfig(null, inTemp);
  assert.throws(() => render(pillar(), { config: bare }), ConfigError);

  // --no-schema needs no identity at all: nothing is asserted about a publisher.
  const html = render(pillar(), { config: bare, schema: false }).html;
  assert.doesNotMatch(html, /ld\+json/);
  assert.match(html, new RegExp(`<div class="${DEFAULTS.pageClass}"`));
  assert.match(html, /^<!-- =+\n {5}page body - html-render v/);
});

test('optional organization fields are absent from the graph, never invented', () => {
  const minimal = { organization: { name: 'Acme Analytics', url: 'https://acme.example/' } };
  const organization = nodeOf(graphOf(render(pillar(), { config: minimal }).html), 'Organization');
  assert.deepEqual(organization, {
    '@type': 'Organization',
    '@id': 'https://acme.example/#organization',
    name: 'Acme Analytics',
    url: 'https://acme.example/',
  });
});

test('a malformed config is rejected by name, not half-applied', () => {
  const cases = [
    [{ organisation: { name: 'A', url: 'https://a.example/' } }, /unknown config key: organisation/],
    [{ organization: { name: 'A' } }, /missing required configuration: organization\.url/],
    [{ organization: { name: 'A', url: 'a.example' } }, /organization\.url must be an http\(s\) URL/],
    [{ organization: { name: 'A', url: 'https://a.example/', linkedin: 'x' } }, /unknown organization key: linkedin/],
    // pageClass is interpolated into CSS, a script, and an attribute.
    [{ pageClass: 'x"></style><script>alert(1)</script>' }, /pageClass must be a valid CSS class name/],
    [{ language: '' }, /language must be a non-empty string/],
  ];
  for (const [input, message] of cases) {
    assert.throws(() => resolveConfig(input), (error) => {
      assert.ok(error instanceof ConfigError, `expected a ConfigError for ${JSON.stringify(input)}`);
      assert.match(error.message, message);
      return true;
    });
  }
});

test('--config reaches the rendered page through the CLI', (t) => {
  const dir = tempDir(t);
  const file = path.join(dir, 'acme.json');
  fs.writeFileSync(file, JSON.stringify(ACME), 'utf8');

  const html = execFileSync(
    process.execPath,
    [path.join(ROOT, 'bin', 'html-render.js'), path.join(ROOT, 'examples', 'spoke.md'), '--config', file, '--stdout'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );

  assert.equal(nodeOf(graphOf(html), 'Organization').name, 'Acme Analytics');
  assert.match(html, /^<!-- =+\n {5}Acme Analytics page body/);
  assert.match(html, /<div class="acme-page"/);
});

test('the examples config is what the repo renders its own examples with', () => {
  const config = resolveConfig(EXAMPLE_CONFIG);
  assert.equal(config.organization.name, 'HG Insights');
  const graph = graphOf(renderFile(path.join(ROOT, 'examples', 'spoke.md'), { config }).html);
  assert.equal(nodeOf(graph, 'Organization').url, 'https://hginsights.com/');
});
