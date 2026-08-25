'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseBody, renderInline, splitFrontmatter } = require('../src/parse/markdown');
const { parseYaml, locOf } = require('../src/parse/yaml');

const ctx = () => ({ citationRefs: new Map() });

test('inline Markdown maps to the expected HTML', () => {
  assert.equal(renderInline('plain text', ctx()), 'plain text');
  assert.equal(renderInline('**bold**', ctx()), '<strong>bold</strong>');
  assert.equal(renderInline('*em* and _also em_', ctx()), '<em>em</em> and <em>also em</em>');
  assert.equal(renderInline('`code`', ctx()), '<code>code</code>');
  assert.equal(renderInline('a **bold _nested_** run', ctx()), 'a <strong>bold <em>nested</em></strong> run');
  assert.equal(renderInline('\\*not emphasis\\*', ctx()), '*not emphasis*');
});

test('links keep their target and open external hosts in a new tab', () => {
  assert.equal(
    renderInline('[the cluster](/geo/core-metrics/)', ctx()),
    '<a href="/geo/core-metrics/">the cluster</a>',
  );
  assert.equal(
    renderInline('[HG](https://hginsights.com/geo/)', ctx()),
    '<a href="https://hginsights.com/geo/">HG</a>',
  );
  assert.equal(
    renderInline('[Gartner](https://www.gartner.com/x)', ctx()),
    '<a href="https://www.gartner.com/x" target="_blank" rel="noopener">Gartner</a>',
  );
});

test('citation references become superscript links and are collected', () => {
  const context = ctx();
  assert.equal(
    renderInline('a claim[^12]', context),
    'a claim<sup><a href="#citation-12">[12]</a></sup>',
  );
  assert.deepEqual([...context.citationRefs.keys()], ['12']);
});

test('text is escaped but pre-written character references survive', () => {
  assert.equal(renderInline('A & B', ctx()), 'A &amp; B');
  assert.equal(renderInline('Q3 &middot; 2026', ctx()), 'Q3 &middot; 2026');
  assert.equal(renderInline('&amp; already escaped', ctx()), '&amp; already escaped');
  assert.equal(renderInline('a <script> tag', ctx()), 'a &lt;script&gt; tag');
});

test('block constructs map to the expected node types', () => {
  const body = [
    '## A Heading',
    '',
    '> A thesis statement.',
    '',
    'A paragraph',
    'wrapped over two lines.',
    '',
    '- one',
    '- two',
    '',
    '1. first',
    '2. second',
    '',
    '---',
    '',
    '### A sub-heading',
  ].join('\n');
  const { sections } = parseBody(body, 1);
  assert.equal(sections.length, 1);
  assert.deepEqual(
    sections[0].blocks.map((block) => block.type),
    ['thesis', 'paragraph', 'bullet-list', 'numbered-list', 'rule', 'heading3'],
  );
  assert.equal(sections[0].blocks[1].html, 'A paragraph wrapped over two lines.');
  assert.deepEqual(sections[0].blocks[2].items, ['one', 'two']);
});

test('a pipe table becomes a table node, and a following Source line becomes its caption', () => {
  const body = [
    '## Comparison',
    '',
    '| Dimension | A | B |',
    '| --- | --- | --- |',
    '| What | one | two |',
    '| Why | three | four |',
    'Source: HG Insights, 2026.',
    '',
    'A paragraph after the table.',
  ].join('\n');
  const { sections } = parseBody(body, 1);
  const [table, paragraph] = sections[0].blocks;
  assert.equal(table.type, 'table');
  assert.deepEqual(table.head, ['Dimension', 'A', 'B']);
  assert.deepEqual(table.rows, [['What', 'one', 'two'], ['Why', 'three', 'four']]);
  assert.equal(table.caption, 'Source: HG Insights, 2026.');
  assert.equal(paragraph.type, 'paragraph');
});

test('a ```section block attaches metadata to the enclosing section, not the body', () => {
  const body = ['## A Heading', '', '```section', 'eyebrow: Why It Matters', 'id: why', '```', '', 'Copy.'].join('\n');
  const { sections } = parseBody(body, 1);
  assert.deepEqual(sections[0].meta, { eyebrow: 'Why It Matters', id: 'why' });
  assert.deepEqual(sections[0].blocks.map((block) => block.type), ['paragraph']);
});

test('content before the first heading is kept as the preamble', () => {
  const { preamble, sections } = parseBody('Lead copy.\n\n## First\n\nBody.', 1);
  assert.equal(preamble.length, 1);
  assert.equal(preamble[0].html, 'Lead copy.');
  assert.equal(sections.length, 1);
});

test('frontmatter is split on the first pair of fences', () => {
  const { frontmatter, body } = splitFrontmatter('---\na: 1\n---\n\n## H\n\nbody --- with dashes\n');
  assert.equal(frontmatter, 'a: 1');
  assert.match(body, /body --- with dashes/);
});

test('the YAML subset covers the shapes the contract needs', () => {
  const parsed = parseYaml(
    [
      'scalar: a value',
      'quoted: "with: a colon"',
      'number: 13',
      'bool: true',
      'nothing:',
      'inline: [a, b, c]',
      'nested:',
      '  key: value',
      'listOfMaps:',
      '  - a: 1',
      '    b: 2',
      '  - a: 3',
      'block: |',
      '  line one',
      '',
      '  line two',
      'folded: >',
      '  wrapped',
      '  together',
    ].join('\n'),
  );
  assert.equal(parsed.scalar, 'a value');
  assert.equal(parsed.quoted, 'with: a colon');
  assert.equal(parsed.number, 13);
  assert.equal(parsed.bool, true);
  assert.equal(parsed.nothing, null);
  assert.deepEqual([...parsed.inline], ['a', 'b', 'c']);
  assert.deepEqual({ ...parsed.nested }, { key: 'value' });
  assert.equal(parsed.listOfMaps.length, 2);
  assert.equal(parsed.listOfMaps[0].b, 2);
  assert.equal(parsed.block, 'line one\n\nline two');
  assert.equal(parsed.folded, 'wrapped together');
  assert.equal(locOf(parsed, 'number'), 3);
});

test('unsupported YAML raises an error naming the line', () => {
  assert.throws(() => parseYaml('a: 1\nb: { inline: map }\n'), /Inline maps/);
  assert.throws(() => parseYaml('a: 1\n\tb: 2\n'), /Tabs are not allowed/);
  assert.throws(() => parseYaml('a: 1\nnot a pair\n'), /Expected "key: value"/);
});
