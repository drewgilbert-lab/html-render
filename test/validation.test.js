'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { render, ValidationError } = require('../src/index');
const { page, spoke, EXAMPLE_CONFIG } = require('./helpers');

/**
 * The renderer checks one thing: can it render this document.
 *
 * There is no page class, no required slot, and no bound on how many of
 * anything a page may carry — what a page *should* contain belongs to the
 * skill that authors the Markdown. Everything asserted here is something the
 * renderer genuinely cannot produce output for.
 */

/** Render and return the validation errors, asserting that it did fail. */
function errorsFor(source) {
  try {
    render(source, { config: EXAMPLE_CONFIG });
  } catch (error) {
    assert.ok(error instanceof ValidationError, `expected a ValidationError, got ${error.name}: ${error.message}`);
    return error.errors;
  }
  throw new assert.AssertionError({ message: 'expected validation to fail, but rendering succeeded' });
}

/** Render, asserting that it did NOT fail validation. Returns the HTML. */
function rendersCleanly(source) {
  try {
    return render(source, { config: EXAMPLE_CONFIG }).html;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new assert.AssertionError({ message: `expected a clean render, got: ${error.message}` });
    }
    throw error;
  }
}

function messageFor(source, path) {
  const match = errorsFor(source).find((error) => error.path === path);
  assert.ok(match, `expected an error on "${path}", got: ${JSON.stringify(errorsFor(source))}`);
  return match;
}

const F = '```';

test('a component the registry does not have is named, with the ones that do exist', () => {
  const error = messageFor(page({ body: `${F}nonesuch\ntitle: x\n${F}` }), '```nonesuch');
  assert.match(error.message, /"nonesuch" is not a known component/);
  assert.match(error.message, /Available components: article-hero, bar-chart/);
});

test('a region the renderer has no wrapper for is named, with the ones that do exist', () => {
  const error = messageFor(page({ body: ':::nonesuch\n\ncopy\n:::' }), ':::nonesuch');
  assert.match(error.message, /is not a region this renderer can wrap. Available regions: section, two-column/);
});

test('a region attribute outside its declared values is rejected', () => {
  const error = messageFor(page({ body: ':::section\nband: chartreuse\n\ncopy\n:::' }), ':::section.band');
  assert.match(error.message, /must be one of: white, tinted/);
});

test('an unknown key names the keys the component does accept', () => {
  const error = messageFor(page({ body: `${F}callout\nbody: Some copy.\nnonesuch: x\n${F}` }), '```callout.nonesuch');
  assert.match(error.message, /is not a recognized key. Allowed keys: label, body, tone/);
});

test('a malformed repeated structure is reported rather than silently skipped', () => {
  const strings = page({ body: `${F}faq\ntitle: Questions\nitems:\n  - What is this?\n${F}` });
  assert.match(messageFor(strings, '```faq.items[0]').message, /is malformed: each entry needs keys \(q, a\)/);

  const notAList = page({ body: `${F}faq\ntitle: Questions\nitems: just a string\n${F}` });
  assert.match(messageFor(notAList, '```faq.items').message, /must be a list/);
});

test('an unusable link target is rejected', () => {
  const source = page({
    body: `${F}related\ntitle: Next\nitems:\n  - tag: Hub\n    title: A page\n    url: not a url\n    description: Copy.\n${F}`,
  });
  assert.match(messageFor(source, '```related.items[0].url').message, /is not a usable link target/);
});

test('an unbalanced region is a parse error naming the region', () => {
  assert.match(errorsFor(page({ body: ':::section\n\nNo closer.' }))[0].message, /Unclosed ":::section" region/);
  assert.match(errorsFor(page({ body: 'Copy.\n\n:::' }))[0].message, /has no open region/);
});

test('the error message lists every problem at once', () => {
  const broken = page({
    body: [`${F}nonesuch\ntitle: x\n${F}`, ':::nonesuch\n\ncopy\n:::', `${F}callout\nbody: Copy.\nnonesuch: x\n${F}`].join('\n\n'),
  });
  const errors = errorsFor(broken);
  assert.ok(errors.length >= 3, `expected every problem at once, got ${JSON.stringify(errors)}`);
  for (const error of errors) assert.ok(error.line > 0, `every error carries a line: ${JSON.stringify(error)}`);
});

test('nothing about what a page contains is a validation error', () => {
  // No hero, no faq, no cta, no breadcrumb, no sections. All fine.
  assert.match(rendersCleanly(page({ body: 'Just one paragraph.' })), /<p>Just one paragraph\.<\/p>/);

  // Two CTAs, two buttons in one, an empty component: all the author's call.
  const many = page({
    body: [
      `${F}cta\ntitle: One\nbody: Copy.\nbuttons:\n  - label: A\n    url: /a/\n  - label: B\n    url: /b/\n${F}`,
      `${F}cta\ntitle: Two\nbody: Copy.\n${F}`,
      `${F}faq\n${F}`,
    ].join('\n\n'),
  });
  const html = rendersCleanly(many);
  assert.equal((html.match(/class="cta-section on-dark"/g) || []).length, 2);
  // The first action takes the white fill, the rest the white outline.
  assert.equal((html.match(/class="btn-white"/g) || []).length, 1);
  assert.equal((html.match(/class="btn-secondary"/g) || []).length, 1);
});

test('a citation marker with no citations list is the author\'s business, not the renderer\'s', () => {
  assert.match(rendersCleanly(page({ body: 'A claim with a marker.[^7]' })), /<sup><a href="#citation-7">\[7\]<\/a><\/sup>/);
});

test('two sections may share an anchor, and two dark bands may sit together', () => {
  const html = rendersCleanly(
    page({
      body: [':::section\nid: same\nband: tinted\n\n## First\n:::', ':::section\nid: same\nband: tinted\n\n## Second\n:::'].join('\n\n'),
    }),
  );
  assert.equal((html.match(/id="same"/g) || []).length, 2);
  assert.equal((html.match(/class="page-section tinted"/g) || []).length, 2);
});

test('a ```section block only annotates its heading', () => {
  assert.match(rendersCleanly(spoke()), /<div class="section-eyebrow">Why It Matters<\/div>\s*<h2>Why Does This Matter Right Now\?<\/h2>/);

  const error = messageFor(page({ body: `## A heading\n\n${F}section\nid: why\n${F}` }), 'section "A heading".id');
  assert.match(error.message, /is not a recognized key. Allowed keys: eyebrow, subtitle/);
});

test('malformed input fails with a clear parse error', () => {
  assert.match(errorsFor('no frontmatter at all')[0].message, /Missing YAML frontmatter/);
  assert.match(errorsFor('---\ntitle: A\n')[0].message, /Frontmatter is never closed/);
  assert.match(errorsFor(page({ body: '# A single hash heading' }))[0].message, /A single "#" heading is not allowed/);
});
