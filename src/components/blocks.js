'use strict';

/**
 * In-flow content blocks.
 *
 * These are the components an author places inside a page section with a
 * fenced ```name block. Each one is the single canonical implementation of a
 * component from the design-web-components catalog; the `source` field names
 * the design-system component it implements.
 *
 * A component is: { name, summary, source, fields, render(value, ctx) }.
 * `value` arrives already normalized and escaped by src/validate/fields.js.
 */

const { el, lines, indent } = require('../html');

/** Paragraph list from a richtext field. */
function paras(list, className) {
  return (list || []).map((html) => el('p', className ? { class: className } : null, html));
}

const callout = {
  name: 'callout',
  summary: 'A labelled note box: "Why It Matters", "Watch Out", "Coverage Note".',
  source: '46-callout-box',
  fields: {
    label: { type: 'text', required: true, hint: 'the uppercase kicker, e.g. "Why It Matters"' },
    body: { type: 'richtext', required: true },
    tone: { type: 'enum', values: ['note', 'warn'], default: 'note' },
  },
  render(value) {
    const cls = value.tone === 'warn' ? 'callout-box callout-box--melon' : 'callout-box';
    return el(
      'div',
      { class: cls },
      `\n${indent(lines(el('div', { class: 'callout-box-label' }, value.label), paras(value.body, 'callout-box-body')))}\n`,
    );
  },
};

const conceptCards = {
  name: 'concept-cards',
  summary: 'A 2-3 column grid of parallel concept cards.',
  source: '51-concept-card-grid',
  fields: {
    items: {
      type: 'list',
      required: true,
      min: 2,
      max: 6,
      fields: {
        title: { type: 'text', required: true },
        body: { type: 'text', required: true },
      },
    },
  },
  render(value) {
    const cards = value.items.map((item) =>
      el(
        'div',
        { class: 'concept-card' },
        `\n${indent(
          lines(
            el('h3', { class: 'concept-card-title' }, item.title),
            el('p', { class: 'concept-card-body' }, item.body),
          ),
        )}\n`,
      ),
    );
    return el('div', { class: 'concept-card-grid' }, `\n${indent(lines(cards))}\n`);
  },
};

const quote = {
  name: 'quote',
  summary: 'An attributed analyst pull quote.',
  source: '12-expert-quote-card',
  fields: {
    text: { type: 'text', required: true },
    name: { type: 'plain', required: true },
    title: { type: 'plain', required: true },
    initials: { type: 'plain' },
    link_text: { type: 'text' },
    link_url: { type: 'url' },
  },
  render(value, ctx) {
    const marks = (ctx && ctx.helpers && ctx.helpers.initialsOf) || ((name) => name.slice(0, 2).toUpperCase());
    const avatar = value.initials || marks(value.name);
    const reference =
      value.link_text && value.link_url
        ? el('a', { class: 'expert-quote-reference', href: value.link_url }, `${value.link_text} &rarr;`)
        : '';
    return el(
      'figure',
      { class: 'expert-quote-card' },
      `\n${indent(
        lines(
          el('span', { class: 'expert-quote-mark', 'aria-hidden': 'true' }, '&ldquo;'),
          el('blockquote', { class: 'expert-quote-text' }, value.text),
          el(
            'figcaption',
            { class: 'expert-quote-attribution' },
            `\n${indent(
              lines(
                el('span', { class: 'expert-quote-avatar' }, avatar),
                el(
                  'span',
                  { class: 'expert-quote-attribution-text' },
                  `\n${indent(
                    lines(
                      el('span', { class: 'expert-quote-name' }, value.name),
                      el('span', { class: 'expert-quote-title' }, value.title),
                      reference,
                    ),
                  )}\n`,
                ),
              ),
            )}\n`,
          ),
        ),
      )}\n`,
    );
  },
};

const processSteps = {
  name: 'process-steps',
  summary: 'A numbered step sequence with badges, titles, and bodies.',
  source: '49-process-steps',
  fields: {
    items: {
      type: 'list',
      required: true,
      min: 2,
      fields: {
        title: { type: 'text', required: true },
        body: { type: 'richtext', required: true },
      },
    },
  },
  render(value) {
    const steps = value.items.map((item, index) =>
      el(
        'div',
        { class: 'process-step' },
        `\n${indent(
          lines(
            el('div', { class: 'process-step-badge' }, String(index + 1)),
            el(
              'div',
              null,
              `\n${indent(lines(el('div', { class: 'process-step-title' }, item.title), paras(item.body, 'process-step-body')))}\n`,
            ),
          ),
        )}\n`,
      ),
    );
    return el('div', { class: 'process-steps' }, `\n${indent(lines(steps))}\n`);
  },
};

const beforeAfter = {
  name: 'before-after',
  summary: 'Two-column old-vs-new contrast.',
  source: '50-before-after',
  fields: {
    before: {
      type: 'object',
      required: true,
      fields: { label: { type: 'text', required: true }, body: { type: 'text', required: true } },
    },
    after: {
      type: 'object',
      required: true,
      fields: { label: { type: 'text', required: true }, body: { type: 'text', required: true } },
    },
  },
  render(value) {
    const col = (side, data) =>
      el(
        'div',
        { class: `ba-col ba-${side}` },
        `\n${indent(lines(el('div', { class: 'ba-label' }, data.label), el('p', { class: 'ba-body' }, data.body)))}\n`,
      );
    return el('div', { class: 'before-after' }, `\n${indent(lines(col('before', value.before), col('after', value.after)))}\n`);
  },
};

const formula = {
  name: 'formula',
  summary: 'A highlighted formula or calculation statement.',
  source: '31-thesis-block (formula variant)',
  fields: {
    text: { type: 'richtext', required: true },
  },
  render(value) {
    return el('div', { class: 'formula-block' }, value.text.join('<br>'));
  },
};

const bars = {
  name: 'bars',
  summary: 'A compact horizontal bar chart for indexed or ranked values.',
  source: '10-supporting-charts (mini bar)',
  fields: {
    title: { type: 'text' },
    items: {
      type: 'list',
      required: true,
      min: 2,
      fields: {
        label: { type: 'plain', required: true },
        value: { type: 'plain', required: true },
        share: { type: 'number' },
      },
    },
    note: { type: 'text' },
  },
  render(value) {
    return el(
      'div',
      { class: 'bf-tiers' },
      `\n${indent(
        lines(
          value.title ? el('div', { class: 'bf-tiers-title' }, value.title) : '',
          renderBarChart(value.items),
          value.note ? el('div', { class: 'bf-tiers-foot' }, value.note) : '',
        ),
      )}\n`,
    );
  },
};

/**
 * Bar widths: an explicit `share` wins; otherwise the leading number in each
 * `value` is indexed against the largest one in the set. Pure function of the
 * input, so widths are stable across runs.
 */
function renderBarChart(items) {
  const numbers = items.map((item) => {
    const match = /-?\d+(\.\d+)?/.exec(String(item.value));
    return match ? Math.abs(Number(match[0])) : 0;
  });
  const max = Math.max(...numbers, 0);
  const rows = items.map((item, index) => {
    let share = item.share;
    if (share == null) share = max > 0 ? Math.round((numbers[index] / max) * 100) : 0;
    share = Math.max(3, Math.min(100, Math.round(share)));
    return el(
      'div',
      { class: 'mini-bar-row' },
      `\n${indent(
        lines(
          el('div', { class: 'mini-bar-label' }, item.label),
          el('div', { class: 'mini-bar-track' }, el('div', { class: 'mini-bar-fill', style: `width:${share}%` }, '')),
          el('div', { class: 'mini-bar-value' }, item.value),
        ),
      )}\n`,
    );
  });
  return el('div', { class: 'mini-bar-chart' }, `\n${indent(lines(rows))}\n`);
}

const benchmarkFigure = {
  name: 'benchmark-figure',
  summary: 'A "lead with the number" benchmark: headline figure, optional head-to-head compare, indexed bars, and a definition of what the figures measure.',
  source: '24-benchmark-figure',
  fields: {
    eyebrow: { type: 'text' },
    figure: { type: 'plain', required: true, hint: 'the headline number, e.g. "5.1x"' },
    label: { type: 'text', required: true },
    compare: {
      type: 'object',
      fields: {
        left_label: { type: 'text', required: true },
        left_value: { type: 'plain', required: true },
        right_label: { type: 'text', required: true },
        right_value: { type: 'plain', required: true },
        delta: { type: 'text' },
        direction: { type: 'enum', values: ['up', 'down'], default: 'up' },
        delta_note: { type: 'text' },
      },
    },
    bars: {
      type: 'object',
      fields: {
        title: { type: 'text' },
        items: {
          type: 'list',
          required: true,
          min: 2,
          fields: {
            label: { type: 'plain', required: true },
            value: { type: 'plain', required: true },
            share: { type: 'number' },
          },
        },
        note: { type: 'text' },
      },
    },
    definition: {
      type: 'object',
      fields: {
        title: { type: 'text', required: true },
        body: { type: 'richtext', required: true },
      },
    },
    footer: { type: 'text' },
  },
  render(value) {
    const parts = [];
    parts.push(
      el(
        'div',
        { class: 'bf-hero' },
        `\n${indent(
          lines(
            value.eyebrow ? el('div', { class: 'bf-eyebrow' }, value.eyebrow) : '',
            el('div', { class: 'bf-figure' }, value.figure),
            el('div', { class: 'bf-figure-label' }, value.label),
          ),
        )}\n`,
      ),
    );

    if (value.compare) {
      const c = value.compare;
      parts.push(
        el(
          'div',
          { class: 'bf-compare' },
          `\n${indent(
            lines(
              el(
                'div',
                { class: 'bf-compare-cell' },
                `\n${indent(lines(el('div', { class: 'bf-compare-cap' }, c.left_label), el('div', { class: 'bf-compare-fig' }, c.left_value)))}\n`,
              ),
              el('div', { class: 'bf-compare-vs' }, 'vs.'),
              el(
                'div',
                { class: 'bf-compare-cell' },
                `\n${indent(lines(el('div', { class: 'bf-compare-cap' }, c.right_label), el('div', { class: 'bf-compare-fig baseline' }, c.right_value)))}\n`,
              ),
              c.delta
                ? el(
                    'div',
                    { class: 'bf-delta-wrap' },
                    `\n${indent(
                      lines(
                        el(
                          'span',
                          { class: `bf-delta ${c.direction === 'down' ? 'down' : 'up'}` },
                          `${c.direction === 'down' ? '&#9660;' : '&#9650;'} ${c.delta}`,
                        ),
                        c.delta_note ? el('span', { class: 'bf-delta-note' }, c.delta_note) : '',
                      ),
                    )}\n`,
                  )
                : '',
            ),
          )}\n`,
        ),
      );
    }

    if (value.bars) {
      parts.push(
        el(
          'div',
          { class: 'bf-tiers' },
          `\n${indent(
            lines(
              value.bars.title ? el('div', { class: 'bf-tiers-title' }, value.bars.title) : '',
              renderBarChart(value.bars.items),
              value.bars.note ? el('div', { class: 'bf-tiers-foot' }, value.bars.note) : '',
            ),
          )}\n`,
        ),
      );
    }

    if (value.definition) {
      parts.push(
        el(
          'div',
          { class: 'bf-definition' },
          `\n${indent(
            lines(el('div', { class: 'bf-definition-title' }, value.definition.title), paras(value.definition.body)),
          )}\n`,
        ),
      );
    }

    if (value.footer) parts.push(el('div', { class: 'bf-footer' }, value.footer));

    return el('div', { class: 'benchmark-figure-block' }, `\n${indent(lines(parts))}\n`);
  },
};

const linkCard = {
  name: 'link-card',
  summary: 'A single card linking down to a cluster or spoke, optionally flagged as still in production.',
  source: '13-data-cut-filters',
  fields: {
    tag: { type: 'text', required: true, hint: 'the small uppercase kicker, e.g. "Cluster Hub"' },
    title: { type: 'text', required: true },
    description: { type: 'text', required: true },
    url: { type: 'url' },
    status: { type: 'enum', values: ['published', 'in-production'], default: 'published' },
    status_label: { type: 'text', default: 'In production, not yet published' },
  },
  render(value) {
    const comingSoon = value.status === 'in-production';
    const body = lines(
      el('div', { class: 'data-cut-type' }, value.tag),
      el('h3', null, value.title),
      el('p', null, value.description),
      comingSoon ? el('span', { class: 'coming-soon-badge' }, value.status_label) : el('span', { class: 'data-cut-arrow' }, '&rarr;'),
    );
    if (comingSoon || !value.url) {
      return el('div', { class: 'data-cut-card coming-soon' }, `\n${indent(body)}\n`);
    }
    return el('a', { class: 'data-cut-card', href: value.url }, `\n${indent(body)}\n`);
  },
};

const relatedCards = {
  name: 'related-cards',
  summary: 'A grid of cross-link cards to related hubs, clusters, or spokes.',
  source: '14-spoke-page-cards',
  fields: {
    items: {
      type: 'list',
      required: true,
      min: 1,
      fields: {
        tag: { type: 'text', required: true },
        title: { type: 'text', required: true },
        url: { type: 'url', required: true },
        description: { type: 'text', required: true },
        link_text: { type: 'text', default: 'Read the guide' },
      },
    },
  },
  render(value) {
    return renderRelatedGrid(value.items);
  },
};

function renderRelatedGrid(items) {
  const cards = items.map((item) =>
    el(
      'a',
      { class: 'related-hub-card', href: item.url },
      `\n${indent(
        lines(
          el('div', { class: 'related-hub-tag' }, item.tag),
          el('h3', null, item.title),
          el('p', null, item.description),
          el('span', { class: 'related-hub-link' }, `${item.link_text} &rarr;`),
        ),
      )}\n`,
    ),
  );
  return el('div', { class: 'related-hubs-grid' }, `\n${indent(lines(cards))}\n`);
}

module.exports = {
  blocks: [callout, conceptCards, quote, processSteps, beforeAfter, formula, bars, benchmarkFigure, linkCard, relatedCards],
  renderRelatedGrid,
  paras,
};
