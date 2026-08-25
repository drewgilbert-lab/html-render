'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { render, renderFile } = require('../src/index');
const { pillar, cluster, spoke, bandedSpoke } = require('./helpers');

const EXAMPLES = path.join(__dirname, '..', 'examples');

test('the same Markdown renders byte-identical HTML every time', () => {
  for (const [name, source] of [
    ['pillar', pillar()],
    ['cluster', cluster()],
    ['spoke', spoke()],
    ['banded spoke', bandedSpoke()],
  ]) {
    const first = render(source).html;
    const second = render(source).html;
    const third = render(source).html;
    assert.equal(first, second, `${name} differed between runs`);
    assert.equal(second, third, `${name} differed between runs`);
  }
});

test('the example files render byte-identical HTML across processes', () => {
  for (const file of ['pillar.md', 'cluster.md', 'spoke.md', 'spoke-banded.md']) {
    const target = path.join(EXAMPLES, file);
    const a = renderFile(target).html;
    const b = renderFile(target).html;
    assert.equal(a, b, `${file} differed between runs`);
  }
});

test('rendering does not read the clock or any random source', () => {
  const realNow = Date.now;
  const realRandom = Math.random;
  const realDate = global.Date;
  let touched = [];
  Date.now = () => {
    touched.push('Date.now');
    return 0;
  };
  Math.random = () => {
    touched.push('Math.random');
    return 0;
  };
  global.Date = class extends realDate {
    constructor(...args) {
      if (!args.length) touched.push('new Date()');
      super(...args);
    }
  };
  try {
    render(pillar());
    render(cluster());
    render(spoke());
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
    global.Date = realDate;
  }
  assert.deepEqual(touched, [], `renderer touched: ${touched.join(', ')}`);
});

test('the committed example output matches a fresh render', () => {
  const outputDir = path.join(__dirname, '..', 'output');
  for (const file of ['pillar', 'cluster', 'spoke', 'spoke-banded']) {
    const htmlPath = path.join(outputDir, `${file}.html`);
    assert.ok(fs.existsSync(htmlPath), `${file}.html is missing — run: npm run render:examples`);
    const committed = fs.readFileSync(htmlPath, 'utf8');
    const fresh = renderFile(path.join(EXAMPLES, `${file}.md`)).html;
    assert.equal(committed, fresh, `output/${file}.html is stale — run: npm run render:examples`);
  }
});
