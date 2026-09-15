'use strict';

/**
 * Page chrome and full-width bands.
 *
 * These are invokable from the body like every other component — there are no
 * layouts and no frontmatter slots, so the document decides where they go and
 * how many of each it carries. They live in their own file because they are the
 * parts of a page rather than its content, not because the renderer treats them
 * differently; `src/components/index.js` merges this list with `blocks.js` into
 * one registry. Each is the one canonical build of its exported design
 * component; `source` names that component.
 */

const { el, lines, indent, container, initials } = require('../html');
const { renderRelatedGrid, paras } = require('./blocks');

const AUTHOR_FIELDS = {
  name: { type: 'plain' },
  title: { type: 'plain' },
  initials: { type: 'plain' },
  bio: { type: 'plain' },
  url: { type: 'url' },
  // Feeds Person.knowsAbout in the schema graph; never rendered visibly.
  knows_about: { type: 'list', primaryKey: 'topic', fields: { topic: { type: 'plain' } } },
};

// `melon` was the old brand's accent; the colour is now coral. Both spellings
// are accepted and render the same modifier, which is what the export's own CSS
// does, so documents written against either vocabulary keep working.
const PILL_FIELDS = {
  label: { type: 'text' },
  tone: { type: 'enum', values: ['default', 'coral', 'melon'] },
};

// A pill may be written as a bare string (its label) or as a label/tone pair.
const PILL_LIST = { type: 'list', primaryKey: 'label', fields: PILL_FIELDS };

const STAT_FIELDS = {
  value: { type: 'plain' },
  unit: { type: 'plain' },
  label: { type: 'text' },
  source: { type: 'text' },
  primary: { type: 'bool' },
};

/* ------------------------------------------------------------------ */
/* shared sub-renderers                                                */
/* ------------------------------------------------------------------ */

function renderMetaPills(pills) {
  if (!pills || !pills.length) return '';
  const items = pills.map((pill) =>
    el(
      'span',
      { class: pill.tone === 'melon' || pill.tone === 'coral' ? 'pill melon' : 'pill' },
      `${el('span', { class: 'dot' }, '')} ${pill.label}`,
    ),
  );
  return el('div', { class: 'meta' }, `\n${indent(lines(items))}\n`);
}

function renderAuthorByline(author, { dark = false } = {}) {
  if (!author || !author.name) return '';
  const cls = dark ? 'author-byline author-byline-dark' : 'author-byline';
  return el(
    'div',
    { class: cls },
    `\n${indent(
      lines(
        el('div', { class: 'author-byline-avatar author-byline-avatar-initials' }, author.initials || initials(author.name)),
        el(
          'div',
          { class: 'author-byline-info' },
          `\n${indent(
            lines(
              el('span', { class: 'author-byline-name' }, author.name),
              el('span', { class: 'author-byline-title' }, author.title),
              author.bio ? el('span', { class: 'author-byline-bio' }, author.bio) : '',
            ),
          )}\n`,
        ),
      ),
    )}\n`,
  );
}

function renderStatCards(stats) {
  if (!stats || !stats.length) return '';
  const anyPrimary = stats.some((stat) => stat.primary);
  const cards = stats.map((stat, index) => {
    const isPrimary = anyPrimary ? Boolean(stat.primary) : index === 0;
    return el(
      'div',
      { class: isPrimary ? 'stat-card primary' : 'stat-card' },
      `\n${indent(
        lines(
          el('div', { class: 'stat-number' }, stat.unit ? `${stat.value}${el('span', { class: 'stat-unit' }, stat.unit)}` : stat.value),
          el('div', { class: 'stat-label' }, stat.label),
          stat.source ? el('div', { class: 'stat-sublabel' }, stat.source) : '',
        ),
      )}\n`,
    );
  });
  return el('div', { class: 'hero-stats-grid' }, `\n${indent(lines(cards))}\n`);
}

function renderSectionHeader({ eyebrow, title, subtitle, align = 'center' }) {
  if (!eyebrow && !title && !subtitle) return '';
  const cls = align === 'left' ? 'section-header align-left' : 'section-header';
  return el(
    'div',
    { class: cls },
    `\n${indent(
      lines(
        eyebrow ? el('div', { class: 'section-eyebrow' }, eyebrow) : '',
        title ? el('h2', { class: 'section-title' }, title) : '',
        subtitle ? el('p', { class: 'section-subtitle' }, subtitle) : '',
      ),
    )}\n`,
  );
}

/* ------------------------------------------------------------------ */
/* page components                                                     */
/* ------------------------------------------------------------------ */

const breadcrumb = {
  name: 'breadcrumb',
  summary: 'Breadcrumb trail for hierarchy and crawlability.',
  source: 'Breadcrumb',
  fields: {
    items: { type: 'list', fields: { label: { type: 'text' }, url: { type: 'url' } } },
    current: { type: 'text' },
  },
  render(value) {
    const parts = [];
    for (const item of value.items) {
      parts.push(el('a', { href: item.url }, item.label));
      parts.push(el('span', { class: 'sep' }, '&rsaquo;'));
    }
    parts.push(el('span', { class: 'current' }, value.current));
    return el('nav', { class: 'breadcrumb-bar', 'aria-label': 'Breadcrumb' }, `\n${indent(container(lines(parts)))}\n`);
  },
};

const hero = {
  name: 'hero',
  summary: 'Flat navy hero cut by a linen and a coral wedge: eyebrow, H1, lead, meta pills, thesis, byline, freshness, coverage, and the stat-card grid.',
  source: 'HeroStatBlock',
  fields: {
    eyebrow: { type: 'text' },
    title: { type: 'text' },
    description: { type: 'text' },
    pills: { ...PILL_LIST },
    thesis: { type: 'text' },
    author: { type: 'object', fields: AUTHOR_FIELDS },
    freshness_badge: { type: 'text' },
    source: { type: 'text' },
    coverage: { type: 'text' },
    stats: { type: 'list', fields: STAT_FIELDS },
  },
  render(value) {
    const heroMeta =
      value.freshness_badge || value.source
        ? el(
            'div',
            { class: 'hero-meta' },
            `\n${indent(
              lines(
                value.freshness_badge
                  ? el('div', { class: 'data-freshness-badge' }, `\n${indent(lines(el('span', { class: 'dot' }, ''), value.freshness_badge))}\n`)
                  : '',
                value.source ? el('span', { class: 'hero-source' }, value.source) : '',
              ),
            )}\n`,
          )
        : '';

    const left = el(
      'div',
      { class: 'hero-left' },
      `\n${indent(
        lines(
          value.eyebrow ? el('span', { class: 'hero-eyebrow' }, value.eyebrow) : '',
          el('h1', null, value.title),
          el('p', { class: 'hero-description' }, value.description),
          renderMetaPills(value.pills),
          value.thesis ? el('p', { class: 'thesis-block' }, value.thesis) : '',
          renderAuthorByline(value.author, { dark: true }),
          heroMeta,
          value.coverage ? el('div', { class: 'hero-coverage' }, value.coverage) : '',
        ),
      )}\n`,
    );

    const right = value.stats && value.stats.length ? el('div', { class: 'hero-right' }, `\n${indent(renderStatCards(value.stats))}\n`) : '';

    return el('section', { class: 'hero', id: 'hero' }, `\n${indent(container(lines(left, right)))}\n`);
  },
};

const articleHero = {
  name: 'article-hero',
  summary: 'The light variant of EditorialHero: H1 plus author byline on the page ground, no navy band, for definition and glossary spokes.',
  source: 'EditorialHero',
  fields: {
    title: { type: 'text' },
    author: { type: 'object', fields: AUTHOR_FIELDS },
    pills: { ...PILL_LIST },
  },
  render(value) {
    return el(
      'div',
      { class: 'container article-hero' },
      `\n${indent(lines(el('h1', null, value.title), renderAuthorByline(value.author), renderMetaPills(value.pills)))}\n`,
    );
  },
};

const freshnessBar = {
  name: 'freshness-bar',
  summary: 'Navy band stating when the data was last updated and how often it refreshes.',
  source: 'DataFreshnessBar',
  fields: {
    label: { type: 'text', hint: 'the "last updated" value, e.g. "Q3 2026"' },
    note: { type: 'text' },
    cadence: { type: 'text' },
    link_text: { type: 'text' },
    link_url: { type: 'url' },
  },
  render(value) {
    const text = el(
      'span',
      { class: 'freshness-text' },
      [
        value.label,
        value.note ? `&nbsp;&middot;&nbsp; ${value.note}` : '',
        value.cadence ? el('span', { class: 'freshness-cadence' }, `&middot; ${value.cadence}`) : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    const link =
      value.link_text && value.link_url ? el('a', { class: 'methodology-link', href: value.link_url }, `${value.link_text} &#8599;`) : '';
    return el('div', { class: 'freshness-bar' }, `\n${indent(container(lines(text, link)))}\n`);
  },
};

const thesisBand = {
  name: 'thesis-band',
  summary: 'Full-width band carrying the page thesis statement, used when the hero does not.',
  source: 'ThesisBlock',
  fields: { text: { type: 'text' } },
  render(value) {
    return el('div', { class: 'thesis-wrap' }, `\n${indent(container(el('p', { class: 'thesis-block' }, value.text)))}\n`);
  },
};

const introToc = {
  name: 'intro-toc',
  summary: 'Two-column intro copy plus the sticky on-page jump nav.',
  source: 'IntroToc',
  fields: {
    eyebrow: { type: 'text' },
    title: { type: 'text' },
    body: { type: 'richtext' },
    toc_label: { type: 'text' },
    toc: { type: 'list', fields: { label: { type: 'text' }, anchor: { type: 'plain' } } },
  },
  render(value) {
    const text = el(
      'div',
      { class: 'hub-intro-text' },
      `\n${indent(
        lines(
          el('div', { class: 'hub-intro-eyebrow' }, value.eyebrow),
          el('h2', { class: 'hub-intro-title' }, value.title),
          paras(value.body),
        ),
      )}\n`,
    );
    const toc = value.toc && value.toc.length
      ? el(
          'div',
          { class: 'hub-toc' },
          `\n${indent(
            lines(
              el('div', { class: 'hub-toc-label' }, value.toc_label),
              el(
                'ul',
                null,
                `\n${indent(
                  lines(
                    value.toc.map((item) =>
                      el('li', null, el('a', { href: `#${item.anchor}` }, `${el('span', { class: 'hub-toc-dot' }, '')}${item.label}`)),
                    ),
                  ),
                )}\n`,
              ),
            ),
          )}\n`,
        )
      : '';
    return el(
      'section',
      { class: toc ? 'hub-intro-section' : 'hub-intro-section no-toc', id: 'overview' },
      `\n${indent(container(lines(text, toc)))}\n`,
    );
  },
};

const sideNav = {
  name: 'side-nav',
  summary: 'Right-rail "On this page" nav with scroll-spy highlighting.',
  source: 'StickySideNav',
  fields: {
    label: { type: 'text' },
    items: { type: 'list', fields: { label: { type: 'text' }, anchor: { type: 'plain' } } },
    note: { type: 'text' },
    button: {
      type: 'object',
      fields: {
        label: { type: 'text' },
        url: { type: 'url' },
      },
    },
  },
  render(value) {
    const nav = el(
      'nav',
      { class: 'nav-card', 'aria-label': 'On this page' },
      `\n${indent(
        lines(
          el('div', { class: 'nav-head' }, value.label),
          el(
            'ul',
            null,
            `\n${indent(lines(value.items.map((item) => el('li', null, el('a', { href: `#${item.anchor}` }, item.label)))))}\n`,
          ),
          value.note ? el('div', { class: 'nav-foot' }, value.note) : '',
          value.button
            ? el(
                'div',
                { class: 'nav-cta' },
                `\n${indent(el('a', { class: 'btn-primary', href: value.button.url }, value.button.label))}\n`,
              )
            : '',
        ),
      )}\n`,
    );
    return el('aside', { class: 'sidenav' }, `\n${indent(nav)}\n`);
  },
};

const resourceIndex = {
  name: 'resource-index',
  summary: 'The cluster resource index: every spoke beneath this cluster as a card grid.',
  source: 'DataCutCard',
  fields: {
    eyebrow: { type: 'text' },
    title: { type: 'text' },
    subtitle: { type: 'text' },
    items: {
      type: 'list',
      fields: {
        group: { type: 'text', hint: 'the card kicker, e.g. "Definitions"' },
        title: { type: 'text' },
        description: { type: 'text' },
        url: { type: 'url' },
        status: { type: 'enum', values: ['published', 'in-production'] },
        status_label: { type: 'text', hint: 'the badge text when status is in-production' },
      },
    },
  },
  render(value) {
    const cards = value.items.map((item) => {
      const body = lines(
        el('div', { class: 'data-cut-type' }, item.group),
        el('h3', null, item.title),
        el('p', null, item.description),
        item.status === 'in-production'
          ? el('span', { class: 'coming-soon-badge' }, item.status_label)
          : el('span', { class: 'data-cut-arrow' }, '&rarr;'),
      );
      if (item.status === 'in-production' || !item.url) {
        return el('div', { class: 'data-cut-card coming-soon' }, `\n${indent(body)}\n`);
      }
      return el('a', { class: 'data-cut-card', href: item.url }, `\n${indent(body)}\n`);
    });
    return el(
      'section',
      { class: 'data-cuts-section', id: 'resource-index' },
      `\n${indent(
        container(
          lines(
            renderSectionHeader({ eyebrow: value.eyebrow, title: value.title, subtitle: value.subtitle }),
            el('div', { class: 'data-cuts-grid' }, `\n${indent(lines(cards))}\n`),
          ),
        ),
      )}\n`,
    );
  },
};

const related = {
  name: 'related',
  summary: 'Off-white band of cross-link cards: where to go next.',
  source: 'RelatedHubCard',
  fields: {
    on_white: { type: 'bool', hint: 'paint this band white instead of its default tint' },
    eyebrow: { type: 'text' },
    title: { type: 'text' },
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
    return el(
      'section',
      { class: value.on_white ? 'related-hubs-section on-white' : 'related-hubs-section', id: 'related' },
      `\n${indent(
        container(lines(renderSectionHeader({ eyebrow: value.eyebrow, title: value.title }), renderRelatedGrid(value.items))),
      )}\n`,
    );
  },
};

const methodology = {
  name: 'methodology',
  summary: '"How we measure this" band with an optional melon caveat note.',
  source: 'Methodology',
  fields: {
    on_white: { type: 'bool', hint: 'paint this band white instead of its default tint' },
    eyebrow: { type: 'text' },
    title: { type: 'text' },
    body: { type: 'richtext' },
    caveat: { type: 'text' },
  },
  render(value) {
    const labelCol = el(
      'div',
      { class: 'methodology-label-col' },
      `\n${indent(lines(el('div', { class: 'methodology-eyebrow' }, value.eyebrow), el('h2', null, value.title)))}\n`,
    );
    const content = el(
      'div',
      { class: 'methodology-content' },
      `\n${indent(
        lines(
          paras(value.body),
          value.caveat
            ? el(
                'div',
                { class: 'methodology-caveats' },
                `\n${indent(lines(el('span', { class: 'methodology-caveats-flag' }, ''), el('div', null, value.caveat)))}\n`,
              )
            : '',
        ),
      )}\n`,
    );
    return el('section', { class: value.on_white ? 'methodology-section on-white' : 'methodology-section', id: 'methodology' }, `\n${indent(container(lines(labelCol, content)))}\n`);
  },
};

const faq = {
  name: 'faq',
  summary: 'Q&A band: a centred header over full-width rows, every answer open and in flow. The coral circle marks a row; it is not a toggle.',
  source: 'Faq',
  fields: {
    on_white: { type: 'bool', hint: 'paint this band white instead of its default tint' },
    eyebrow: { type: 'text' },
    title: { type: 'text' },
    intro: { type: 'text' },
    items: {
      type: 'list',
      fields: { q: { type: 'text' }, a: { type: 'richtext' } },
    },
  },
  render(value) {
    const header = el(
      'div',
      { class: 'faq-header' },
      `\n${indent(
        lines(
          value.eyebrow ? el('div', { class: 'section-eyebrow' }, value.eyebrow) : '',
          value.title ? el('h2', null, value.title) : '',
          value.intro ? el('p', null, value.intro) : '',
        ),
      )}\n`,
    );
    const items = value.items.map((item) =>
      el(
        'div',
        { class: 'faq-item' },
        `\n${indent(
          lines(
            el(
              'h3',
              { class: 'faq-question' },
              `\n${indent(lines(el('span', null, item.q), el('span', { class: 'faq-icon', 'aria-hidden': 'true' }, '')))}\n`,
            ),
            el('div', { class: 'faq-answer' }, item.a.length > 1 ? `\n${indent(paras(item.a))}\n` : item.a[0] || ''),
          ),
        )}\n`,
      ),
    );
    const list = el('div', { class: 'faq-list' }, `\n${indent(lines(items))}\n`);
    return el('section', { class: value.on_white ? 'faq-section on-white' : 'faq-section', id: 'faq' }, `\n${indent(container(lines(header, list)))}\n`);
  },
};

const citations = {
  name: 'citations',
  summary: 'Numbered reference list; every [^n] in the body resolves to an entry here.',
  source: 'CitationsList',
  fields: {
    eyebrow: { type: 'text' },
    title: { type: 'text' },
    subtitle: { type: 'text' },
    items: {
      type: 'list',
      fields: {
        source: { type: 'text', hint: 'the publisher, e.g. "Google Search Central"' },
        title: { type: 'text' },
        url: { type: 'url' },
        accessed: { type: 'plain' },
      },
    },
  },
  render(value) {
    const items = value.items.map((item, index) =>
      el(
        'li',
        { class: 'citation-item', id: `citation-${index + 1}` },
        lines(
          el('span', { class: 'citation-number' }, `${index + 1}.`),
          el(
            'span',
            { class: 'citation-body' },
            lines(
              `${el('span', { class: 'citation-source' }, item.source)}: ${el(
                'a',
                { class: 'citation-link', href: item.url, target: '_blank', rel: 'noopener' },
                item.title,
              )}`,
              item.accessed ? el('span', { class: 'citation-accessed' }, `Accessed ${item.accessed}`) : '',
            ),
          ),
        ),
      ),
    );
    return el(
      'section',
      { class: 'citations-section', id: 'citations' },
      `\n${indent(
        container(
          lines(
            renderSectionHeader({ eyebrow: value.eyebrow, title: value.title, subtitle: value.subtitle, align: 'left' }),
            el(
              'div',
              { class: 'citations-list' },
              `\n${indent(el('ol', { class: 'citations-list-items' }, `\n${indent(lines(items))}\n`))}\n`,
            ),
          ),
        ),
      )}\n`,
    );
  },
};

const cta = {
  name: 'cta',
  summary: 'End-of-page CTA band on flat coral with the diagonal hatch, with buttons, optional use-case pills, and optional meta pills.',
  source: 'CtaSection',
  fields: {
    layout: { type: 'enum', values: ['centered', 'split'], hint: 'centered is the standard band; split puts copy left, buttons right' },
    surface: { type: 'enum', values: ['coral', 'navy'], hint: 'the flat coral band, or navy when the page already ends on coral' },
    eyebrow: { type: 'text' },
    title: { type: 'text' },
    body: { type: 'text' },
    links: { type: 'list', fields: { label: { type: 'text' }, url: { type: 'url' } } },
    pills: { ...PILL_LIST },
    buttons: {
      type: 'list',
      fields: {
        label: { type: 'text' },
        url: { type: 'url' },
        variant: { type: 'enum', values: ['white', 'secondary', 'primary'] },
      },
    },
  },
  render(value) {
    const text = el(
      'div',
      { class: 'cta-text' },
      `\n${indent(
        lines(
          el('div', { class: 'section-eyebrow' }, value.eyebrow),
          el('h2', null, value.title),
          el('p', null, value.body),
          value.links && value.links.length
            ? el(
                'div',
                { class: 'cta-use-cases' },
                `\n${indent(
                  lines(value.links.map((link) => el('a', { class: 'cta-use-case-link', href: link.url }, `${link.label} &rarr;`))),
                )}\n`,
              )
            : '',
          renderMetaPills(value.pills),
        ),
      )}\n`,
    );
    // The first action takes the white fill — the one place white outranks
    // coral — and the rest the white outline.
    const buttons = value.buttons.length
      ? el(
          'div',
          { class: 'cta-buttons' },
          `\n${indent(
            lines(
              value.buttons.map((button, index) =>
                el(
                  'a',
                  { class: `btn-${button.variant || (index === 0 ? 'white' : 'secondary')}`, href: button.url },
                  button.label,
                ),
              ),
            ),
          )}\n`,
        )
      : '';
    const classes = ['cta-section', 'on-dark'];
    if (value.layout === 'split') classes.push('split');
    if (value.surface === 'navy') classes.push('navy');
    return el('section', { class: classes.join(' '), id: 'cta' }, `\n${indent(container(lines(text, buttons)))}\n`);
  },
};

module.exports = {
  pageComponents: [
    breadcrumb,
    hero,
    articleHero,
    freshnessBar,
    thesisBand,
    introToc,
    sideNav,
    resourceIndex,
    related,
    methodology,
    faq,
    citations,
    cta,
  ],
  renderSectionHeader,
  renderMetaPills,
  renderAuthorByline,
  renderStatCards,
  AUTHOR_FIELDS,
  PILL_FIELDS,
  PILL_LIST,
  STAT_FIELDS,
};
