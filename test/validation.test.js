'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { render, ValidationError } = require('../src/index');
const { pillar, cluster, spoke, bandedSpoke, editLine, SHARED, HERO, INTRO, RELATED } = require('./helpers');

/** Render and return the validation errors, asserting that it did fail. */
function errorsFor(source) {
  try {
    render(source);
  } catch (error) {
    assert.ok(error instanceof ValidationError, `expected a ValidationError, got ${error.name}: ${error.message}`);
    return error.errors;
  }
  throw new assert.AssertionError({ message: 'expected validation to fail, but rendering succeeded' });
}

function messageFor(source, path) {
  const match = errorsFor(source).find((error) => error.path === path);
  assert.ok(match, `expected an error on "${path}", got: ${JSON.stringify(errorsFor(source))}`);
  return match;
}

test('an unsupported page type is rejected and names the supported ones', () => {
  const errors = errorsFor(pillar().replace('page_type: pillar', 'page_type: datasheet'));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'page_type');
  assert.match(errors[0].message, /not a supported page type/);
  assert.match(errors[0].message, /pillar, cluster, spoke/);
});

test('a missing page type is rejected before anything else is checked', () => {
  const errors = errorsFor(editLine(pillar(), 'page_type:', null));
  assert.deepEqual(errors.map((error) => error.path), ['page_type']);
});

test('missing required metadata is reported per key, with a line number', () => {
  const errors = errorsFor(editLine(editLine(pillar(), 'url:', null), 'published:', null));
  const paths = errors.map((error) => error.path);
  assert.ok(paths.includes('url'));
  assert.ok(paths.includes('published'));
  assert.match(messageFor(editLine(pillar(), 'url:', null), 'url').message, /is required/);
});

test('missing required component content is reported at its own path', () => {
  // A CTA with no buttons.
  const noButtons = pillar().replace(/  buttons:\n    - label: Book a Demo\n      url: https:\/\/hginsights\.com\/demo\n/, '');
  assert.match(messageFor(noButtons, 'cta.buttons').message, /is required/);

  // A cluster with no resource index.
  const noIndex = cluster().replace(/resource_index:\n(  .*\n|    .*\n|      .*\n)+/, '');
  assert.match(messageFor(noIndex, 'resource_index').message, /is required/);

  // A spoke with no related cards.
  const noRelated = spoke().replace(/related:\n(  .*\n|    .*\n|      .*\n)+/, '');
  assert.match(messageFor(noRelated, 'related').message, /is required/);
});

test('a required page class slot names the layout it belongs to', () => {
  // Pillar and cluster both require hero stats.
  const noStats = `---\npage_type: pillar\n${SHARED}\n${INTRO}\n---\n\n## A Section\n\nCopy.\n`;
  assert.match(messageFor(noStats, 'hero').message, /is required/);
});

test('a malformed repeated structure is reported rather than silently skipped', () => {
  const stringsNotMaps = pillar().replace(
    /faq:\n  title: .*\n  items:\n    - q: .*\n      a: .*/,
    'faq:\n  title: Common questions\n  items:\n    - What is this?\n    - And this?',
  );
  const error = messageFor(stringsNotMaps, 'faq.items[0]');
  assert.match(error.message, /is malformed: each entry needs keys \(q, a\)/);

  const notAList = pillar().replace(
    /faq:\n  title: .*\n  items:\n    - q: .*\n      a: .*/,
    'faq:\n  title: Common questions\n  items: just a string',
  );
  assert.match(messageFor(notAList, 'faq.items').message, /must be a list/);
});

test('an unknown key is reported with the allowed keys', () => {
  const error = messageFor(pillar('subtitle: not a real key\n'), 'subtitle');
  assert.match(error.message, /is not a recognized key/);
  assert.match(error.message, /page_type, title, url/);
});

test('an unsupported component variant is rejected', () => {
  const badTone = pillar().replace(
    '## Why Does This Matter Right Now?',
    '## Why Does This Matter Right Now?\n\n```callout\nlabel: Watch Out\nbody: Something to note.\ntone: danger\n```',
  );
  const error = messageFor(badTone, '```callout.tone');
  assert.match(error.message, /must be one of: note, warn/);
});

test('an unsupported spoke layout is rejected', () => {
  const error = messageFor(spoke().replace('page_type: spoke', 'page_type: spoke\nlayout: interactive'), 'layout');
  assert.match(error.message, /not a supported spoke layout/);
  assert.match(error.message, /article, banded/);
});

test('an unresolved component mapping names the components that do exist', () => {
  const unknown = pillar().replace(
    '## Why Does This Matter Right Now?',
    '## Why Does This Matter Right Now?\n\n```carousel\nitems:\n  - a\n```',
  );
  const error = messageFor(unknown, '```carousel');
  assert.match(error.message, /is not a known component/);
  assert.match(error.message, /concept-cards/);
});

test('an unresolved citation reference is rejected', () => {
  const withRef = pillar().replace('A body paragraph in the first section.', 'A claim that needs a source.[^2]');
  const error = messageFor(withRef, 'citations');
  assert.match(error.message, /cites \[\^2\] but no `citations` list is defined/);

  const oneCitation = withRef.replace(
    'cta:',
    'citations:\n  items:\n    - source: Google Search Central\n      title: AI Features and Your Website\n      url: https://developers.google.com/search/docs/appearance/ai-features\ncta:',
  );
  assert.match(messageFor(oneCitation, 'citations').message, /only 1 citation is defined/);
});

test('duplicate section anchors are rejected', () => {
  const duplicate = pillar().replace('id: program', 'id: why');
  const errors = errorsFor(duplicate);
  assert.ok(errors.some((error) => /already used by/.test(error.message)));
});

test('a table of contents entry that points nowhere is rejected', () => {
  const badToc = pillar().replace(
    'intro:\n  eyebrow: About This Guide',
    'intro:\n  toc:\n    - label: Nowhere\n      anchor: does-not-exist\n  eyebrow: About This Guide',
  );
  const error = messageFor(badToc, 'intro.toc[0].anchor');
  assert.match(error.message, /does not match any section on this page/);
});

test('an unusable link target is rejected', () => {
  const error = messageFor(pillar().replace('url: https://hginsights.com/geo/test-page/', 'url: geo/test-page'), 'url');
  assert.match(error.message, /is not a usable link target/);
});

test('the article spoke variant refuses hero stats', () => {
  const error = messageFor(`---\npage_type: spoke\n${SHARED}\n${HERO}\n${RELATED}\n---\n\n## A Section\n\nCopy.\n`, 'hero.stats');
  assert.match(error.message, /layout: banded/);
});

test('malformed input fails with a clear parse error', () => {
  assert.match(errorsFor('no frontmatter here\n')[0].message, /must begin with a "---" fence/);
  assert.match(errorsFor('---\npage_type: pillar\nstill open\n')[0].message, /never closed/);
  assert.match(
    errorsFor(pillar().replace('## Why Does This Matter Right Now?', '```\nan unnamed fence\n```'))[0].message,
    /must name a component/,
  );
  assert.match(
    errorsFor(pillar().replace('## Why Does This Matter Right Now?', '# A Top Level Heading'))[0].message,
    /single "#" heading is not allowed/,
  );
  assert.match(errorsFor(`---\npage_type: pillar\ntitle: A\ntitle: B\n---\n\n## X\n\nY\n`)[0].message, /Duplicate key "title"/);
});

test('a body with no sections is rejected', () => {
  const empty = `---\npage_type: spoke\n${SHARED}\n${RELATED}\n---\n`;
  assert.ok(errorsFor(empty).some((error) => /no sections/.test(error.message)));
});

test('Pillar and Cluster reject body copy before the first heading', () => {
  const stray = pillar().replace('\n## Why Does This Matter Right Now?', '\nStray copy before any heading.\n\n## Why Does This Matter Right Now?');
  assert.ok(errorsFor(stray).some((error) => /content found before the first heading/.test(error.message)));
});

test('a banded spoke still requires hero stats', () => {
  const noStats = bandedSpoke().replace(/hero:\n  stats:\n(    .*\n)+/, '');
  assert.match(messageFor(noStats, 'hero').message, /is required/);
});

test('the error message lists every problem at once', () => {
  const broken = editLine(editLine(pillar(), 'url:', null), 'description:', null);
  try {
    render(broken, { file: 'broken.md' });
    assert.fail('expected failure');
  } catch (error) {
    assert.match(error.message, /^broken\.md: 2 validation errors/);
    assert.match(error.message, /- url: is required/);
    assert.match(error.message, /- description: is required/);
  }
});
