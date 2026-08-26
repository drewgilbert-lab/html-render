'use strict';

/**
 * Minimal valid documents per page class. Tests start from these and remove or
 * corrupt one thing at a time, so each failure case is isolated.
 */

const SHARED = `title: A Test Page About AI Visibility
eyebrow: GEO Measurement Guide
url: https://hginsights.com/geo/test-page/
description: A one sentence lead paragraph describing what this test page covers.
published: 2026-08-11
breadcrumbs:
  - label: Home
    url: https://hginsights.com/
  - label: GEO Resources
    url: https://hginsights.com/geo/
author:
  name: Jordan Lee
  title: Principal Analyst, HG Insights
faq:
  title: Common questions about this test page
  items:
    - q: What is this?
      a: A fixture used by the renderer test suite.
cta:
  title: Book a demo of GEO monitoring
  body: One sentence of CTA body copy.
  buttons:
    - label: Book a Demo
      url: https://hginsights.com/demo`;

const HERO = `hero:
  stats:
    - value: 60
      unit: M
      label: annual AI engine crawls
      source: HG Insights telemetry, 2026`;

const HERO_WITH_THESIS = `hero:
  thesis: A forty word statement engineered to be quoted verbatim by an answer engine.
  stats:
    - value: 4
      label: core metrics anchor the vocabulary`;

const INTRO = `intro:
  eyebrow: About This Guide
  title: What this guide covers
  body: |
    First intro paragraph.

    Second intro paragraph.`;

const BODY = `
## Why Does This Matter Right Now?

\`\`\`section
eyebrow: Why It Matters
id: why
nav_label: Why It Matters
\`\`\`

A body paragraph in the first section.

## What Should A Program Include?

\`\`\`section
eyebrow: Program Design
id: program
\`\`\`

A body paragraph in the second section.
`;

const RESOURCE_INDEX = `resource_index:
  title: Which guides cover this cluster?
  items:
    - group: Definitions
      title: What Is Share of Voice?
      description: Definition and formula.
      url: https://hginsights.com/geo/test-page/share-of-voice/`;

const RELATED = `related:
  title: Where to go next
  items:
    - tag: Cluster Hub
      title: Core Metrics and Vocabulary
      url: https://hginsights.com/geo/test-page/core-metrics/
      description: The parent cluster for this page.`;

function pillar(extra = '', hero = HERO) {
  return `---\npage_type: pillar\n${SHARED}\n${hero}\n${INTRO}\n${extra}---\n${BODY}`;
}

function cluster(extra = '', hero = HERO) {
  return `---\npage_type: cluster\n${SHARED}\n${hero}\n${INTRO}\n${RESOURCE_INDEX}\n${extra}---\n${BODY}`;
}

function spoke(extra = '') {
  return `---\npage_type: spoke\n${SHARED}\n${RELATED}\n${extra}---\n${BODY}`;
}

function bandedSpoke(extra = '') {
  return `---\npage_type: spoke\nlayout: banded\n${SHARED}\n${HERO}\n${RELATED}\n${extra}---\n${BODY}`;
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
  const config = require('../src/config');
  const result = render(source, { styles: false, script: false, schema: false, font: false });
  return { ...result, html: result.html.slice(result.html.indexOf(`<div class="${config.pageClass}`)) };
}

module.exports = {
  pillar,
  cluster,
  spoke,
  bandedSpoke,
  body,
  editLine,
  SHARED,
  HERO,
  HERO_WITH_THESIS,
  INTRO,
  BODY,
  RESOURCE_INDEX,
  RELATED,
};
