'use strict';

/**
 * JSON-LD graph builder.
 *
 * Built entirely from validated frontmatter, with a fixed key order and no
 * clock or randomness, so the same input always serializes to the same bytes.
 *
 * The publishing organization is configuration, not a constant: see `config.js`.
 *
 * Graph per page class:
 *   all      Organization, Person, Article, BreadcrumbList, FAQPage
 *   cluster  + ItemList indexing every spoke in the resource index
 *   any      + DefinedTerm when frontmatter declares `term`
 */

const { plainText } = require('./validate/fields');
const { requireOrganization } = require('./config');

function authorId(author, organization) {
  if (author.url) return `${trimSlash(author.url)}/#person`;
  const slug = plainText(author.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${organization.url}authors/${slug}/#person`;
}

function trimSlash(url) {
  return String(url).replace(/\/+$/, '');
}

function buildGraph(fm, { pageType, sections, config }) {
  const organization = requireOrganization(config);
  const pageUrl = fm.url;
  const base = trimSlash(pageUrl);
  const graph = [];

  // logo and sameAs are optional config: a consumer who has not supplied one
  // gets a graph without the key, never a placeholder or an inherited value.
  const publisher = {
    '@type': 'Organization',
    '@id': organization.id,
    name: organization.name,
    url: organization.url,
  };
  if (organization.logo) publisher.logo = organization.logo;
  if (organization.sameAs) publisher.sameAs = organization.sameAs;
  graph.push(publisher);

  const person = {
    '@type': 'Person',
    '@id': authorId(fm.author, organization),
    name: plainText(fm.author.name),
    jobTitle: plainText(fm.author.title),
    worksFor: { '@id': organization.id },
  };
  if (fm.author.url) person.url = fm.author.url;
  graph.push(person);

  let termId = null;
  if (fm.term) {
    termId = `${base}/#term`;
    const term = {
      '@type': 'DefinedTerm',
      '@id': termId,
      name: plainText(fm.term.name),
      description: plainText(fm.term.definition),
    };
    if (fm.term.alternate_name) term.alternateName = plainText(fm.term.alternate_name);
    if (fm.term.term_code) term.termCode = plainText(fm.term.term_code);
    if (fm.term.set_name) {
      term.inDefinedTermSet = {
        '@type': 'DefinedTermSet',
        '@id': fm.term.set_url ? `${trimSlash(fm.term.set_url)}/#termset` : `${base}/#termset`,
        name: plainText(fm.term.set_name),
      };
      if (fm.term.set_url) term.inDefinedTermSet.url = fm.term.set_url;
    }
    term.subjectOf = { '@id': `${base}/#article` };
    graph.push(term);
  }

  const article = {
    '@type': 'Article',
    '@id': `${base}/#article`,
    headline: plainText(fm.title),
    description: plainText(fm.description),
    author: { '@id': authorId(fm.author, organization) },
    publisher: { '@id': organization.id },
    datePublished: String(fm.published),
    dateModified: String(fm.updated || fm.published),
    inLanguage: config.language,
    mainEntityOfPage: pageUrl,
  };
  if (termId) article.about = { '@id': termId };
  if (fm.breadcrumbs && fm.breadcrumbs.length) {
    const parent = fm.breadcrumbs[fm.breadcrumbs.length - 1];
    article.isPartOf = { '@type': 'WebPage', '@id': parent.url, name: plainText(parent.label) };
  }
  graph.push(article);

  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${base}/#breadcrumb`,
    itemListElement: [
      ...fm.breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: plainText(crumb.label),
        item: crumb.url,
      })),
      {
        '@type': 'ListItem',
        position: fm.breadcrumbs.length + 1,
        name: plainText(fm.breadcrumb_label || fm.title),
        item: pageUrl,
      },
    ],
  });

  if (pageType === 'cluster' && fm.resource_index && Array.isArray(fm.resource_index.items)) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${base}/#spokes`,
      name: plainText(fm.resource_index.title),
      numberOfItems: fm.resource_index.items.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: fm.resource_index.items.map((item, index) => {
        const entry = { '@type': 'ListItem', position: index + 1, name: plainText(item.title) };
        if (item.url) entry.url = item.url;
        return entry;
      }),
    });
  }

  graph.push({
    '@type': 'FAQPage',
    '@id': `${base}/#faq`,
    mainEntity: fm.faq.items.map((item) => ({
      '@type': 'Question',
      name: plainText(item.q),
      acceptedAnswer: { '@type': 'Answer', text: plainText(item.a) },
    })),
  });

  return { '@context': 'https://schema.org', '@graph': graph };
}

function renderSchema(fm, options) {
  const graph = buildGraph(fm, options);
  return `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`;
}

module.exports = { buildGraph, renderSchema };
