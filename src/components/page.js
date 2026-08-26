'use strict';

/**
 * Page-level components: the chrome and full-width bands a layout assembles.
 *
 * These are not author-invokable. Their inputs come from frontmatter slots, so
 * an author cannot reorder or duplicate them — the layout owns composition and
 * these components own implementation. Each is the one canonical build of its
 * catalogued design component; `source` names that component.
 */

const { el, lines, indent, container, initials } = require('../html');
const { renderRelatedGrid, paras } = require('./blocks');

const AUTHOR_FIELDS = {
  name: { type: 'plain', required: true },
  title: { type: 'plain', required: true },
  initials: { type: 'plain' },
  bio: { type: 'plain' },
  url: { type: 'url' },
};

const PILL_FIELDS = {
  label: { type: 'text', required: true },
  tone: { type: 'enum', values: ['default', 'melon'], default: 'default' },
};

// A pill may be written as a bare string (its label) or as a label/tone pair.
const PILL_LIST = { type: 'list', primaryKey: 'label', fields: PILL_FIELDS };

const STAT_FIELDS = {
  value: { type: 'plain', required: true },
  unit: { type: 'plain' },
  label: { type: 'text', required: true },
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
      { class: pill.tone === 'melon' ? 'pill melon' : 'pill' },
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
  source: '02-breadcrumb',
  fields: {
    items: { type: 'list', required: true, min: 1, fields: { label: { type: 'text', required: true }, url: { type: 'url', required: true } } },
    current: { type: 'text', required: true },
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
  summary: 'Gradient hero band: eyebrow, H1, lead, meta pills, thesis, byline, freshness, coverage, and the stat-card grid.',
  source: '03-hero-stat-block',
  fields: {
    eyebrow: { type: 'text' },
    title: { type: 'text', required: true },
    description: { type: 'text', required: true },
    pills: { ...PILL_LIST },
    thesis: { type: 'text' },
    author: { type: 'object', fields: AUTHOR_FIELDS },
    freshness_badge: { type: 'text' },
    source: { type: 'text' },
    coverage: { type: 'text' },
    stats: { type: 'list', min: 1, max: 5, fields: STAT_FIELDS },
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
  summary: 'Light article hero: H1 plus author byline, for definition and glossary spokes.',
  source: '34-editorial-hero (light variant)',
  fields: {
    title: { type: 'text', required: true },
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
  summary: 'Dark-blue band stating when the data was last reviewed and how often it refreshes.',
  source: '04-data-freshness-bar',
  fields: {
    label: { type: 'text', required: true, hint: 'the "last reviewed" value, e.g. "Q3 2026"' },
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
        `Data last reviewed: ${el('span', null, value.label)}`,
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
  source: '31-thesis-block',
  fields: { text: { type: 'text', required: true } },
  render(value) {
    return el('div', { class: 'thesis-wrap' }, `\n${indent(container(el('p', { class: 'thesis-block' }, value.text)))}\n`);
  },
};

const introToc = {
  name: 'intro-toc',
  summary: 'Two-column intro copy plus the sticky on-page jump nav.',
  source: '06-hub-intro-toc',
  fields: {
    eyebrow: { type: 'text', required: true },
    title: { type: 'text', required: true },
    body: { type: 'richtext', required: true },
    toc_label: { type: 'text', default: 'On This Page' },
    toc: { type: 'list', fields: { label: { type: 'text', required: true }, anchor: { type: 'plain', required: true } } },
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
    return el('section', { class: 'hub-intro-section', id: 'overview' }, `\n${indent(container(lines(text, toc)))}\n`);
  },
};

const sideNav = {
  name: 'side-nav',
  summary: 'Right-rail "On this page" nav with scroll-spy highlighting.',
  source: '30-sticky-side-nav',
  fields: {
    label: { type: 'text', default: 'On this page' },
    items: { type: 'list', required: true, min: 1, fields: { label: { type: 'text', required: true }, anchor: { type: 'plain', required: true } } },
    note: { type: 'text' },
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
        ),
      )}\n`,
    );
    return el('aside', { class: 'sidenav' }, `\n${indent(nav)}\n`);
  },
};

const resourceIndex = {
  name: 'resource-index',
  summary: 'The cluster resource index: every spoke beneath this cluster as a card grid.',
  source: '13-data-cut-filters',
  fields: {
    eyebrow: { type: 'text', default: 'Full Resource Index' },
    title: { type: 'text', required: true },
    subtitle: { type: 'text' },
    items: {
      type: 'list',
      required: true,
      min: 1,
      fields: {
        group: { type: 'text', required: true, hint: 'the card kicker, e.g. "Definitions"' },
        title: { type: 'text', required: true },
        description: { type: 'text', required: true },
        url: { type: 'url' },
        status: { type: 'enum', values: ['published', 'in-production'], default: 'published' },
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
          ? el('span', { class: 'coming-soon-badge' }, 'In production')
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
  source: '14-spoke-page-cards',
  fields: {
    eyebrow: { type: 'text', default: 'Keep Going' },
    title: { type: 'text', required: true },
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
    return el(
      'section',
      { class: 'related-hubs-section', id: 'related' },
      `\n${indent(
        container(lines(renderSectionHeader({ eyebrow: value.eyebrow, title: value.title }), renderRelatedGrid(value.items))),
      )}\n`,
    );
  },
};

const methodology = {
  name: 'methodology',
  summary: '"How we measure this" band with an optional melon caveat note.',
  source: '16-methodology-section',
  fields: {
    eyebrow: { type: 'text', default: 'Methodology' },
    title: { type: 'text', required: true },
    body: { type: 'richtext', required: true },
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
    return el('section', { class: 'methodology-section', id: 'methodology' }, `\n${indent(container(lines(labelCol, content)))}\n`);
  },
};

const faq = {
  name: 'faq',
  summary: 'Expand/collapse FAQ stack with a label column.',
  source: '15-faq-accordion',
  fields: {
    eyebrow: { type: 'text', default: 'FAQ' },
    title: { type: 'text', required: true },
    intro: { type: 'text' },
    items: {
      type: 'list',
      required: true,
      min: 1,
      fields: { q: { type: 'text', required: true }, a: { type: 'richtext', required: true } },
    },
  },
  render(value) {
    const labelCol = el(
      'div',
      { class: 'faq-label-col' },
      `\n${indent(
        lines(
          el('div', { class: 'section-eyebrow' }, value.eyebrow),
          el('h2', null, value.title),
          value.intro ? el('p', null, value.intro) : '',
        ),
      )}\n`,
    );
    const items = value.items.map((item, index) =>
      el(
        'div',
        { class: index === 0 ? 'faq-item open' : 'faq-item' },
        `\n${indent(
          lines(
            el(
              'button',
              { class: 'faq-question', type: 'button', 'aria-expanded': index === 0 ? 'true' : 'false' },
              `\n${indent(lines(item.q, el('span', { class: 'faq-icon' }, '+')))}\n`,
            ),
            el('div', { class: 'faq-answer' }, item.a.length > 1 ? `\n${indent(paras(item.a))}\n` : item.a[0] || ''),
          ),
        )}\n`,
      ),
    );
    const list = el('div', null, `\n${indent(el('div', { class: 'faq-list' }, `\n${indent(lines(items))}\n`))}\n`);
    return el('section', { class: 'faq-section', id: 'faq' }, `\n${indent(container(lines(labelCol, list)))}\n`);
  },
};

const citations = {
  name: 'citations',
  summary: 'Numbered reference list; every [^n] in the body resolves to an entry here.',
  source: '60-citations-list',
  fields: {
    eyebrow: { type: 'text', default: 'References' },
    title: { type: 'text', default: 'Citations' },
    subtitle: { type: 'text' },
    items: {
      type: 'list',
      required: true,
      min: 1,
      fields: {
        source: { type: 'text', required: true, hint: 'the publisher, e.g. "Google Search Central"' },
        title: { type: 'text', required: true },
        url: { type: 'url', required: true },
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
              `${el('span', { class: 'citation-source' }, item.source)} &mdash; ${el(
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
  summary: 'End-of-page gradient CTA band with buttons, optional use-case pills, and optional meta pills.',
  source: '17-sticky-cta-footer',
  fields: {
    eyebrow: { type: 'text', default: 'Put This Data to Work' },
    title: { type: 'text', required: true },
    body: { type: 'text', required: true },
    links: { type: 'list', fields: { label: { type: 'text', required: true }, url: { type: 'url', required: true } } },
    pills: { ...PILL_LIST },
    buttons: {
      type: 'list',
      required: true,
      min: 1,
      max: 3,
      fields: {
        label: { type: 'text', required: true },
        url: { type: 'url', required: true },
        variant: { type: 'enum', values: ['primary', 'secondary'], default: 'primary' },
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
    const buttons = el(
      'div',
      { class: 'cta-buttons' },
      `\n${indent(
        lines(
          value.buttons.map((button) =>
            el('a', { class: button.variant === 'secondary' ? 'btn-secondary' : 'btn-primary', href: button.url }, button.label),
          ),
        ),
      )}\n`,
    );
    return el('section', { class: 'cta-section', id: 'cta' }, `\n${indent(container(lines(text, buttons)))}\n`);
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
