'use strict';

/**
 * In-flow content blocks.
 *
 * These are the components a document places inside a page section with a
 * fenced ```name block. Each one is the single canonical implementation of a
 * component from the Claude Design export; the `source` field names the
 * design-system component it implements, verbatim.
 *
 * A component is: { name, summary, source, fields, render(value, ctx) }.
 * `value` arrives already normalized and escaped by src/validate/fields.js.
 */

const { el, lines, indent, escapeAttr } = require('../html');

/**
 * A field the author did not supply. Absent scalars normalize to the empty
 * string (see defaultOf in src/validate/fields.js), so a numeric field is
 * absent when it is null, undefined, or ''.
 */
function absent(value) {
  return value == null || value === '';
}

/** Paragraph list from a richtext field. */
function paras(list, className) {
  return (list || []).map((html) => el('p', className ? { class: className } : null, html));
}

const callout = {
  name: 'callout',
  summary: 'A note box: "Why It Matters", "Watch Out", "Coverage Note" — or an unlabelled aside.',
  source: 'Callout',
  fields: {
    label: { type: 'text', hint: 'the uppercase kicker, e.g. "Why It Matters"; omit for an unlabelled note' },
    body: { type: 'richtext' },
    tone: { type: 'enum', values: ['note', 'warn'] },
  },
  render(value) {
    const cls = value.tone === 'warn' ? 'callout-box callout-box--melon' : 'callout-box';
    return el(
      'div',
      { class: cls },
      `\n${indent(
        lines(value.label ? el('div', { class: 'callout-box-label' }, value.label) : '', paras(value.body, 'callout-box-body')),
      )}\n`,
    );
  },
};

const conceptCards = {
  name: 'concept-cards',
  summary: 'A 2-3 column grid of parallel concept cards.',
  source: 'ConceptCard',
  fields: {
    items: {
      type: 'list',
      fields: {
        title: { type: 'text' },
        body: { type: 'text' },
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
  source: 'ExpertQuote',
  fields: {
    text: { type: 'text' },
    name: { type: 'plain' },
    title: { type: 'plain' },
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
  source: 'ProcessSteps',
  fields: {
    // Renderer-owned, not a design prop: marks this block as the single source of the
    // page's HowTo schema steps. Requires `howto:` in frontmatter (see src/schema.js).
    howto: { type: 'bool', hint: 'true makes these steps the HowToStep list of the `howto` frontmatter node; exactly one block per page' },
    items: {
      type: 'list',
      fields: {
        id: { type: 'plain', hint: 'a lowercase anchor for this step, e.g. "level-1"; also the HowToStep url fragment' },
        title: { type: 'text' },
        body: { type: 'richtext' },
      },
    },
  },
  render(value) {
    const steps = value.items.map((item, index) =>
      el(
        'div',
        item.id ? { class: 'process-step', id: item.id } : { class: 'process-step' },
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
  source: 'BeforeAfter',
  fields: {
    before: {
      type: 'object',
      fields: { label: { type: 'text' }, body: { type: 'text' } },
    },
    after: {
      type: 'object',
      fields: { label: { type: 'text' }, body: { type: 'text' } },
    },
  },
  render(value) {
    const col = (side, data) =>
      el(
        'div',
        { class: `ba-col ba-${side}` },
        `\n${indent(lines(el('div', { class: 'ba-label' }, data && data.label), el('p', { class: 'ba-body' }, data && data.body)))}\n`,
      );
    return el('div', { class: 'before-after' }, `\n${indent(lines(col('before', value.before), col('after', value.after)))}\n`);
  },
};

const formula = {
  name: 'formula',
  summary: 'A highlighted formula or calculation statement.',
  source: 'ThesisBlock',
  fields: {
    text: { type: 'richtext' },
  },
  render(value) {
    return el('div', { class: 'formula-block' }, value.text.join('<br>'));
  },
};

const bars = {
  name: 'bars',
  summary: 'A compact horizontal bar chart for indexed or ranked values.',
  source: 'MiniBarChart',
  fields: {
    title: { type: 'text' },
    items: {
      type: 'list',
      fields: {
        label: { type: 'plain' },
        value: { type: 'plain' },
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
    if (absent(share)) share = max > 0 ? Math.round((numbers[index] / max) * 100) : 0;
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
  source: 'BenchmarkFigure',
  fields: {
    eyebrow: { type: 'text' },
    figure: { type: 'plain', hint: 'the headline number, e.g. "5.1x"' },
    label: { type: 'text' },
    compare: {
      type: 'object',
      fields: {
        left_label: { type: 'text' },
        left_value: { type: 'plain' },
        right_label: { type: 'text' },
        right_value: { type: 'plain' },
        delta: { type: 'text' },
        direction: { type: 'enum', values: ['up', 'down'] },
        delta_note: { type: 'text' },
      },
    },
    bars: {
      type: 'object',
      fields: {
        title: { type: 'text' },
        items: {
          type: 'list',
          fields: {
            label: { type: 'plain' },
            value: { type: 'plain' },
            share: { type: 'number' },
          },
        },
        note: { type: 'text' },
      },
    },
    definition: {
      type: 'object',
      fields: {
        title: { type: 'text' },
        body: { type: 'richtext' },
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
  source: 'DataCutCard',
  fields: {
    tag: { type: 'text', hint: 'the small uppercase kicker, e.g. "Cluster Hub"' },
    title: { type: 'text' },
    description: { type: 'text' },
    url: { type: 'url' },
    status: { type: 'enum', values: ['published', 'in-production'] },
    status_label: { type: 'text' },
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
  source: 'RelatedHubCard',
  fields: {
    items: {
      type: 'list',
      fields: {
        tag: { type: 'text' },
        title: { type: 'text' },
        url: { type: 'url' },
        description: { type: 'text' },
        link_text: { type: 'text' },
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

const figure = {
  name: 'figure',
  summary: 'An image, diagram, or screenshot with an optional italic caption — or a dashed draft placeholder when the asset is outstanding.',
  source: 'Figure',
  fields: {
    src: { type: 'url' },
    alt: { type: 'plain' },
    caption: { type: 'text', hint: 'e.g. "Figure 1. CRM install share, Q2 2026."' },
    placeholder: { type: 'plain' },
  },
  render(value) {
    // <img> is a void element and an empty alt must survive serialization;
    // `el()` closes every tag and drops empty attributes, so it is written out.
    const media = value.src
      ? `<img src="${escapeAttr(value.src)}" alt="${escapeAttr(value.alt || '')}">`
      : el('div', { class: 'figure-placeholder' }, el('span', { class: 'figure-placeholder-label' }, value.placeholder));
    return el(
      'figure',
      { class: 'figure-block' },
      `\n${indent(lines(media, value.caption ? el('figcaption', { class: 'figure-caption' }, value.caption) : ''))}\n`,
    );
  },
};

const TREND_FIELDS = {
  direction: { type: 'enum', values: ['up', 'down', 'flat'], hint: 'up is blue, down is melon, flat is grey; never green' },
  value: { type: 'plain', hint: 'the figure, e.g. "+3.1pp"; the arrow glyph is supplied' },
};

const TREND_ARROWS = { up: '&#9650;', down: '&#9660;', flat: '&rarr;' };

/** Shared by the `trend-indicator` block and `comparison-table` trend cells. */
function renderTrendIndicator(value) {
  const arrow = TREND_ARROWS[value.direction] || '';
  const cls = value.direction ? `trend-indicator ${value.direction}` : 'trend-indicator';
  return el('span', { class: cls }, [arrow, value.value].filter(Boolean).join(' '));
}

const trendIndicator = {
  name: 'trend-indicator',
  summary: 'A directional value: arrow plus figure. Its main home is a comparison-table cell, where the table composes it.',
  source: 'TrendIndicator',
  fields: TREND_FIELDS,
  render(value) {
    return renderTrendIndicator(value);
  },
};

const SHARE_BAR_FIELDS = {
  width: { type: 'number', hint: 'percent of the track, or the bar\'s own pixel length with no_track' },
  value: { type: 'plain', hint: 'the bold figure beside the bar, e.g. "38.2%"' },
  emphasis: { type: 'enum', values: ['default', 'primary', 'accent', 'dim'] },
  no_track: { type: 'bool' },
};

/** Shared by the `share-bar` block and `comparison-table` share cells. */
function renderShareBar(value) {
  const fill = el(
    'span',
    {
      class: value.emphasis && value.emphasis !== 'default' ? `share-bar-fill ${value.emphasis}` : 'share-bar-fill',
      style: absent(value.width) ? null : `width:${value.width}${value.no_track ? 'px' : '%'}`,
    },
    '',
  );
  return el('span', { class: value.no_track ? 'share-bar no-track' : 'share-bar' }, [
    value.no_track ? fill : el('span', { class: 'share-bar-track' }, fill),
    absent(value.value) ? '' : el('span', { class: 'share-bar-value' }, value.value),
  ]);
}

const shareBar = {
  name: 'share-bar',
  summary: 'An inline relative-share bar: a small fill plus an optional bold figure. Track mode fills a 70px track by percent; no_track makes the bar\'s pixel length the magnitude.',
  source: 'ShareBar',
  fields: SHARE_BAR_FIELDS,
  render(value) {
    return renderShareBar(value);
  },
};

const comparisonTable = {
  name: 'comparison-table',
  summary: 'A vendor comparison table with a flat navy header row and per-column alignment. Renders structure only; a share cell composes share-bar and a trend cell composes trend-indicator.',
  source: 'ComparisonTable',
  fields: {
    columns: {
      type: 'list',
      fields: {
        label: { type: 'text' },
        align: { type: 'enum', values: ['left', 'center', 'right'] },
      },
    },
    rows: {
      type: 'list',
      fields: {
        cells: {
          type: 'list',
          primaryKey: 'text',
          fields: {
            text: { type: 'text' },
            share: { type: 'object', fields: SHARE_BAR_FIELDS },
            trend: { type: 'object', fields: TREND_FIELDS },
          },
        },
      },
    },
  },
  render(value) {
    const head = el(
      'thead',
      null,
      `\n${indent(
        el(
          'tr',
          null,
          `\n${indent(
            lines(value.columns.map((column) => el('th', column.align ? { style: `text-align:${column.align}` } : null, column.label))),
          )}\n`,
        ),
      )}\n`,
    );
    const body = el(
      'tbody',
      null,
      `\n${indent(
        lines(
          value.rows.map((row) =>
            el(
              'tr',
              null,
              `\n${indent(
                lines(
                  value.columns.map((column, index) => {
                    const cell = row.cells[index];
                    const attrs = {};
                    if (index === 0) attrs.class = 'vendor-name';
                    if (column.align) attrs.style = `text-align:${column.align}`;
                    let content = '';
                    if (cell && cell.share) content = renderShareBar(cell.share);
                    else if (cell && cell.trend) content = renderTrendIndicator(cell.trend);
                    else if (cell) content = cell.text || '';
                    return el('td', Object.keys(attrs).length ? attrs : null, content);
                  }),
                ),
              )}\n`,
            ),
          ),
        ),
      )}\n`,
    );
    const table = el(
      'div',
      { class: 'table-wrapper' },
      `\n${indent(el('table', { class: 'comparison-table' }, `\n${indent(lines(head, body))}\n`))}\n`,
    );
    return table;
  },
};

const limitationsCards = {
  name: 'limitations-cards',
  summary: 'A stacked set of named caveats, each with a melon left-border accent; usually right after a methodology section.',
  source: 'LimitationsCards',
  fields: {
    items: {
      type: 'list',
      fields: {
        title: { type: 'text' },
        body: { type: 'text' },
      },
      hint: 'the design intends three or more named caveats; for a single caveat use a callout with tone: warn, or methodology.caveat',
    },
  },
  render(value) {
    const cards = value.items.map((item) =>
      el('div', { class: 'limit' }, `\n${indent(lines(el('h3', null, item.title), el('p', null, item.body)))}\n`),
    );
    return el('div', { class: 'limitations-cards' }, `\n${indent(lines(cards))}\n`);
  },
};

// The check glyph is inline SVG path data, as the export ships it: no icon font, no file.
const KEY_INSIGHTS_CHECK =
  '<svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const keyInsights = {
  name: 'key-insights',
  summary: 'A panel of analyst takeaways: check-icon bullets, each with a bold lead clause and an attribution pointing at the exhibit that backs it.',
  source: 'KeyInsights',
  fields: {
    label: { type: 'text' },
    title: { type: 'text' },
    items: {
      type: 'list',
      fields: {
        lead: { type: 'text', hint: 'the bolded lead clause' },
        text: { type: 'text', hint: 'the supporting detail' },
        attribution: { type: 'text', hint: 'a pointer to the backing exhibit, e.g. "See primary chart"' },
      },
    },
  },
  render(value) {
    const items = value.items.map((item) =>
      el(
        'div',
        { class: 'insight-item' },
        `\n${indent(
          lines(
            el('div', { class: 'insight-icon' }, KEY_INSIGHTS_CHECK),
            el(
              'div',
              null,
              `\n${indent(
                lines(
                  el('p', { class: 'insight-text' }, item.lead ? `${el('strong', null, item.lead)} ${item.text}` : item.text),
                  item.attribution ? el('div', { class: 'insight-attribution' }, item.attribution) : '',
                ),
              )}\n`,
            ),
          ),
        )}\n`,
      ),
    );
    return el(
      'div',
      { class: 'insights-panel' },
      `\n${indent(
        lines(
          el('div', { class: 'insights-panel-label' }, value.label),
          value.title ? el('h3', null, value.title) : '',
          el('div', { class: 'insight-list' }, `\n${indent(lines(items))}\n`),
        ),
      )}\n`,
    );
  },
};

const BAR_SERIES = ['s1', 's2', 's3', 'dim'];

const BAR_SEGMENT_FIELDS = {
  width: { type: 'number', hint: 'percent of the row' },
  series: { type: 'enum', values: BAR_SERIES, hint: 's1 gradient, s2 blue, s3 light blue, dim gray; keep it consistent with the legend' },
  title: { type: 'plain', hint: 'hover title for the segment' },
};

/** An unsupplied segment width or series contributes no inline style or modifier. */
function barWidth(width) {
  return absent(width) ? null : `width:${width}%`;
}

function barSeriesClass(base, series) {
  return series ? `${base} ${series}` : base;
}

const barChart = {
  name: 'bar-chart',
  summary: 'The card-framed horizontal bar chart that ranks items by one metric, with stacked and grouped variants. Pick one variant per page.',
  source: 'BarChart',
  fields: {
    variant: { type: 'enum', values: ['single', 'stacked', 'grouped'] },
    title: { type: 'text' },
    subtitle: { type: 'text', hint: 'the small grey line under the title, e.g. "500+ employees &middot; 47,218 installs"' },
    date_badge: { type: 'plain', hint: 'the pill at the top right, e.g. "Q2 2026"' },
    rows: {
      type: 'list',
      fields: {
        label: { type: 'text' },
        value: { type: 'plain', hint: 'the printed figure at the right of the row, e.g. "38.2%"' },
        width: { type: 'number', hint: 'single variant: bar width as a percent; derived from the leading number in `value`, indexed to the largest, when omitted' },
        emphasis: { type: 'enum', values: ['default', 'accent', 'dim'], hint: 'single variant: default dark-blue gradient, accent blue ramp, dim gray' },
        segments: { type: 'list', fields: BAR_SEGMENT_FIELDS, hint: 'stacked variant only: the parts of this row' },
        bars: { type: 'list', fields: BAR_SEGMENT_FIELDS, hint: 'grouped variant only: one bar per series' },
      },
    },
    legend: {
      type: 'list',
      fields: {
        label: { type: 'text' },
        series: { type: 'enum', values: BAR_SERIES },
      },
      hint: 'required for stacked and grouped',
    },
    source: { type: 'text', hint: 'e.g. "Source: HG Insights &middot; Q2 2026 &middot; 47,218 verified installs"' },
    download_label: { type: 'text', hint: 'with download_url: the data-download link in the footer' },
    download_url: { type: 'url' },
  },
  render(value) {
    const rows = value.rows;
    // Single-variant widths: an explicit `width` wins; otherwise index the leading
    // number in each value against the largest, exactly as the `bars` block does.
    const numbers = rows.map((row) => {
      const match = /-?\d+(\.\d+)?/.exec(String(row.value == null ? '' : row.value));
      return match ? Math.abs(Number(match[0])) : 0;
    });
    const max = Math.max(...numbers, 0);
    const widthOf = (row, index) => {
      if (!absent(row.width)) return row.width;
      const share = max > 0 ? Math.round((numbers[index] / max) * 100) : 0;
      return Math.max(3, Math.min(100, share));
    };

    const title = el(
      'div',
      { class: 'chart-title' },
      value.subtitle
        ? `${value.title}<br><span style="font-weight:400;font-size:13px;color:var(--hg-text-light)">${value.subtitle}</span>`
        : value.title,
    );
    const titleRow = el(
      'div',
      { class: 'chart-title-row' },
      `\n${indent(lines(title, value.date_badge ? el('span', { class: 'chart-date-badge' }, value.date_badge) : ''))}\n`,
    );

    const legend =
      value.legend && value.legend.length
        ? el(
            'div',
            { class: 'bar-legend' },
            `\n${indent(
              lines(
                value.legend.map((entry) =>
                  el('span', { class: 'bar-legend-item' }, `${el('span', { class: `bar-legend-swatch ${entry.series}` }, '')}${entry.label}`),
                ),
              ),
            )}\n`,
          )
        : '';

    const barRows = rows.map((row, index) => {
      let middle;
      if (value.variant === 'grouped') {
        middle = el(
          'div',
          { class: 'bar-group' },
          `\n${indent(lines(row.bars.map((bar) => el('div', { class: barSeriesClass('bar-subbar', bar.series), style: barWidth(bar.width) }, ''))))}\n`,
        );
      } else if (value.variant === 'stacked') {
        middle = el(
          'div',
          { class: 'bar-track' },
          `\n${indent(
            lines(
              row.segments.map((segment) =>
                el('div', { class: barSeriesClass('bar-seg', segment.series), style: barWidth(segment.width), title: segment.title || null }, ''),
              ),
            ),
          )}\n`,
        );
      } else {
        const cls = row.emphasis && row.emphasis !== 'default' ? `bar-fill ${row.emphasis}` : 'bar-fill';
        middle = el('div', { class: 'bar-track' }, el('div', { class: cls, style: `width:${widthOf(row, index)}%` }, ''));
      }
      return el(
        'div',
        { class: 'bar-row' },
        `\n${indent(lines(el('div', { class: 'bar-label' }, row.label), middle, el('div', { class: 'bar-value' }, row.value == null ? '' : row.value)))}\n`,
      );
    });
    const chart = el(
      'div',
      { class: value.variant && value.variant !== 'single' ? `bar-chart ${value.variant}` : 'bar-chart' },
      `\n${indent(lines(barRows))}\n`,
    );

    const footer =
      value.source || (value.download_label && value.download_url)
        ? el(
            'div',
            { class: 'chart-footer' },
            `\n${indent(
              lines(
                value.source ? el('span', null, value.source) : '',
                value.download_label && value.download_url ? el('a', { href: value.download_url }, value.download_label) : '',
              ),
            )}\n`,
          )
        : '';

    return el('div', { class: 'chart-wrapper' }, `\n${indent(lines(titleRow, legend, chart, footer))}\n`);
  },
};

module.exports = {
  blocks: [
    callout,
    conceptCards,
    quote,
    processSteps,
    beforeAfter,
    formula,
    bars,
    benchmarkFigure,
    linkCard,
    relatedCards,
    figure,
    shareBar,
    trendIndicator,
    comparisonTable,
    limitationsCards,
    keyInsights,
    barChart,
  ],
  renderRelatedGrid,
  renderShareBar,
  renderTrendIndicator,
  paras,
};
