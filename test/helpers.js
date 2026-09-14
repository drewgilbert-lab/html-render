'use strict';

const path = require('node:path');

/**
 * Fixtures for a renderer with no page classes.
 *
 * `page()` builds one body-order document: frontmatter carrying only what has
 * no pixels, and a body that composes itself. Tests start from it and add or
 * corrupt one thing at a time, so each failure case is isolated.
 */

/**
 * The renderer has no built-in organization, so every render needs a config.
 * Tests use the same one the examples do — this repo's own consumer config.
 */
const EXAMPLE_CONFIG = path.join(__dirname, '..', 'examples', 'html-render.config.json');

/** Frontmatter: page identity. Everything visible lives in the body. */
const IDENTITY = `title: A Test Page About AI Visibility
url: https://hginsights.com/geo/test-page/
description: A one sentence lead paragraph describing what this test page covers.
published: 2026-08-11`;

const F = '```';

const BREADCRUMB = `${F}breadcrumb
items:
  - label: Home
    url: https://hginsights.com/
  - label: GEO Resources
    url: https://hginsights.com/geo/
current: A Test Page
${F}`;

const HERO = `${F}hero
title: A Test Page About AI Visibility
description: A one sentence lead paragraph describing what this test page covers.
author:
  name: Jordan Lee
  title: Principal Analyst, HG Insights
stats:
  - value: 60
    unit: M
    label: annual AI engine crawls
    source: HG Insights telemetry, 2026
${F}`;

const ARTICLE_HERO = `${F}article-hero
title: A Test Page About AI Visibility
author:
  name: Jordan Lee
  title: Principal Analyst, HG Insights
${F}`;

const INTRO = `${F}intro-toc
eyebrow: About This Guide
title: What this guide covers
body: |
  First intro paragraph.

  Second intro paragraph.
toc:
  - label: Why It Matters
    anchor: why
${F}`;

const SECTIONS = `:::section
id: why

## Why Does This Matter Right Now?

${F}section
eyebrow: Why It Matters
${F}

A body paragraph in the first section.
:::

:::section
id: program
band: tinted

## What Should A Program Include?

A body paragraph in the second section.
:::`;

const SIDE_NAV = `${F}side-nav
label: On this page
items:
  - label: Why It Matters
    anchor: why
${F}`;

const FAQ = `${F}faq
eyebrow: FAQ
title: Common questions about this test page
items:
  - q: What is this?
    a: A fixture used by the renderer test suite.
${F}`;

const CTA = `${F}cta
title: Book a demo of GEO monitoring
body: One sentence of CTA body copy.
buttons:
  - label: Book a Demo
    url: https://hginsights.com/demo
${F}`;

const RELATED = `${F}related
eyebrow: Keep Going
title: Where to go next
items:
  - tag: Cluster Hub
    title: Core Metrics and Vocabulary
    url: https://hginsights.com/geo/test-page/core-metrics/
    description: The parent cluster for this page.
    link_text: Read the guide
${F}`;

const RESOURCE_INDEX = `${F}resource-index
eyebrow: Full Resource Index
title: Which guides cover this cluster?
items:
  - group: Definitions
    title: What Is Share of Voice?
    description: Definition and formula.
    url: https://hginsights.com/geo/test-page/share-of-voice/
${F}`;

/**
 * One document. `frontmatter` is appended to the identity block; `body`
 * replaces the default composition when given.
 */
function page({ frontmatter = '', body: composition = null } = {}) {
  const fm = frontmatter ? `${IDENTITY}\n${frontmatter}` : IDENTITY;
  const composed =
    composition === null
      ? [BREADCRUMB, HERO, INTRO, ':::two-column', SECTIONS, SIDE_NAV, ':::', FAQ, RELATED, CTA].join('\n\n')
      : composition;
  return `---\n${fm}\n---\n\n${composed}\n`;
}

/*
 * Four named compositions, for tests that need a document of a particular
 * shape rather than a particular page class. The renderer has no page classes;
 * these are just different bodies.
 */

/** Gradient hero, banded sections, rail. */
function bandedSpoke(frontmatter = '') {
  return page({
    frontmatter,
    body: [BREADCRUMB, HERO, INTRO, ':::two-column', SECTIONS, SIDE_NAV, ':::', FAQ, RELATED, CTA].join('\n\n'),
  });
}

/** Light article hero, reading column, rail. */
function spoke(frontmatter = '') {
  return page({
    frontmatter,
    body: [BREADCRUMB, ARTICLE_HERO, ':::two-column\nvariant: reading', SECTIONS, SIDE_NAV, ':::', FAQ, RELATED, CTA].join('\n\n'),
  });
}

/** Gradient hero, narrow reading column, rail. */
function pillar(frontmatter = '') {
  return page({
    frontmatter,
    body: [BREADCRUMB, HERO, INTRO, ':::two-column\nvariant: article', SECTIONS, SIDE_NAV, ':::', FAQ, CTA].join('\n\n'),
  });
}

/** A hub that indexes what sits beneath it: a resource-index in the body. */
function cluster(frontmatter = '') {
  return page({
    frontmatter,
    body: [BREADCRUMB, HERO, INTRO, SECTIONS, RESOURCE_INDEX, FAQ, CTA].join('\n\n'),
  });
}

/** Replace a line in a document by prefix, or drop it when `to` is null. */
function editLine(source, prefix, to) {
  return source
    .split('\n')
    .flatMap((line) => (line.startsWith(prefix) ? (to === null ? [] : [to]) : [line]))
    .join('\n');
}

/**
 * Render just the markup: no stylesheet, script, or JSON-LD, and with the
 * comment header stripped, so structural assertions cannot match text that
 * happens to appear in the CSS or in the header itself.
 */
function body(source) {
  const { render } = require('../src/index');
  const result = render(source, { config: EXAMPLE_CONFIG, styles: false, script: false, schema: false, font: false });
  return { ...result, html: result.html.slice(result.html.indexOf(`<div class="${result.config.pageClass}`)) };
}

module.exports = {
  EXAMPLE_CONFIG,
  IDENTITY,
  BREADCRUMB,
  HERO,
  ARTICLE_HERO,
  INTRO,
  SECTIONS,
  SIDE_NAV,
  FAQ,
  CTA,
  RELATED,
  RESOURCE_INDEX,
  page,
  pillar,
  cluster,
  spoke,
  bandedSpoke,
  editLine,
  body,
};
