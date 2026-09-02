'use strict';

/**
 * JSON-LD graph builder.
 *
 * Built entirely from validated frontmatter (plus the body blocks it points
 * at), with a fixed key order and no clock or randomness, so the same input
 * always serializes to the same bytes.
 *
 * The publishing organization is configuration, not a constant: see `config.js`.
 *
 * Graph per page class:
 *   all      Organization, Person, <root>, FAQPage
 *            where <root> is Article by default, or TechArticle / CollectionPage
 *            when frontmatter `article.type` says so
 *   all      + BreadcrumbList when frontmatter carries `breadcrumbs`
 *            (a standalone spoke has none, and emits neither BreadcrumbList
 *            nor <root>.isPartOf)
 *   cluster  + ItemList indexing every spoke in the resource index
 *   pillar   + ItemList indexing every ```link-card in the body, in order
 *   any      + DefinedTerm when frontmatter declares `term`
 *   any      + DefinedTermSet (with one DefinedTerm per entry) for `term_set`
 *   any      + Dataset (and DataCatalog when `dataset.catalog` is given)
 *   any      + ItemList for `item_list` (the options or items a page enumerates)
 *   any      + Service for `service`
 *   any      + one SoftwareApplication per `software` entry
 *   any      + HowTo for `howto`, its steps read from the one ```process-steps
 *            block flagged `howto: true`
 *   Person   + knowsAbout when the author declares `knows_about`
 *
 * The root node points at what the page is about. Precedence, first wins:
 * term, term_set, dataset, item_list, service, software[0]. An Article or
 * TechArticle uses `about`; a CollectionPage uses `mainEntity`, preferring the
 * page's own index (the cluster resource index or the pillar link-card list).
 */

const { plainText } = require('./validate/fields');
const { requireOrganization } = require('./config');
const { slugify } = require('./html');

function authorId(author, organization) {
  if (author.url) return `${trimSlash(author.url)}/#person`;
  const slug = plainText(author.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${organization.url}authors/${slug}/#person`;
}

function trimSlash(url) {
  return String(url).replace(/\/+$/, '');
}

/** A stable fragment for a named entity: an explicit `id` wins, else the slugified name. */
function fragmentOf(entry, fallback) {
  const explicit = entry && entry.id != null && String(entry.id).trim() !== '' ? String(entry.id).trim() : '';
  return explicit || slugify(plainText(entry && entry.name)) || fallback;
}

/** Every component block in body order, preamble first. */
function bodyBlocks(preamble, sections) {
  const out = [];
  for (const block of preamble || []) if (block.type === 'component') out.push(block);
  for (const section of sections || []) for (const block of section.blocks || []) if (block.type === 'component') out.push(block);
  return out;
}

function itemListOrder(order) {
  return order === 'unordered' ? 'https://schema.org/ItemListUnordered' : 'https://schema.org/ItemListOrderAscending';
}

function buildGraph(fm, { pageType, sections, preamble, config }) {
  const organization = requireOrganization(config);
  const pageUrl = fm.url;
  const base = trimSlash(pageUrl);
  const graph = [];
  const blocks = bodyBlocks(preamble, sections);

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
  if (Array.isArray(fm.author.knows_about) && fm.author.knows_about.length) {
    person.knowsAbout = fm.author.knows_about.map((topic) =>
      plainText(topic && typeof topic === 'object' ? topic.topic : topic),
    );
  }
  if (fm.author.url) person.url = fm.author.url;
  graph.push(person);

  const rootId = `${base}/#article`;

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
    term.subjectOf = { '@id': rootId };
    graph.push(term);
  }

  // A vocabulary this page defines: one DefinedTerm per entry, nested in its set.
  let termSetId = null;
  if (fm.term_set && Array.isArray(fm.term_set.terms) && fm.term_set.terms.length) {
    termSetId = `${base}/#termset`;
    const set = {
      '@type': 'DefinedTermSet',
      '@id': termSetId,
      name: plainText(fm.term_set.name),
    };
    if (fm.term_set.description) set.description = plainText(fm.term_set.description);
    set.hasDefinedTerm = fm.term_set.terms.map((entry, index) => {
      const term = {
        '@type': 'DefinedTerm',
        '@id': `${base}/#term-${fragmentOf(entry, String(index + 1))}`,
        name: plainText(entry.name),
        description: plainText(entry.definition),
      };
      if (entry.alternate_name) term.alternateName = plainText(entry.alternate_name);
      if (entry.term_code) term.termCode = plainText(entry.term_code);
      term.inDefinedTermSet = { '@id': termSetId };
      return term;
    });
    graph.push(set);
  }

  // ---- format-specific nodes the root points at ------------------------------
  const formatNodes = [];
  let datasetId = null;
  if (fm.dataset) {
    datasetId = `${base}/#dataset`;
    const dataset = {
      '@type': 'Dataset',
      '@id': datasetId,
      name: plainText(fm.dataset.name),
      description: plainText(fm.dataset.description),
      url: pageUrl,
      creator: { '@id': organization.id },
      publisher: { '@id': organization.id },
    };
    if (fm.dataset.license) dataset.license = fm.dataset.license;
    dataset.isAccessibleForFree = fm.dataset.free !== false;
    dataset.variableMeasured = (fm.dataset.variable_measured || []).map((item) => plainText(item));
    dataset.temporalCoverage = plainText(fm.dataset.temporal_coverage);
    dataset.spatialCoverage = { '@type': 'Place', name: plainText(fm.dataset.spatial_coverage) };
    if (fm.dataset.measurement_technique) dataset.measurementTechnique = plainText(fm.dataset.measurement_technique);
    if (fm.dataset.catalog) {
      const catalogId = `${trimSlash(fm.dataset.catalog.url)}/#datacatalog`;
      dataset.includedInDataCatalog = { '@id': catalogId };
      dataset.dateModified = String(fm.updated || fm.published);
      formatNodes.push(dataset);
      formatNodes.push({
        '@type': 'DataCatalog',
        '@id': catalogId,
        name: plainText(fm.dataset.catalog.name),
        url: fm.dataset.catalog.url,
        publisher: { '@id': organization.id },
        dataset: { '@id': datasetId },
      });
    } else {
      dataset.dateModified = String(fm.updated || fm.published);
      formatNodes.push(dataset);
    }
  }

  let itemListId = null;
  if (fm.item_list && Array.isArray(fm.item_list.items) && fm.item_list.items.length) {
    itemListId = `${base}/#list`;
    formatNodes.push({
      '@type': 'ItemList',
      '@id': itemListId,
      name: plainText(fm.item_list.name),
      itemListOrder: itemListOrder(fm.item_list.order),
      numberOfItems: fm.item_list.items.length,
      itemListElement: fm.item_list.items.map((item, index) => {
        const entry = { '@type': 'ListItem', position: index + 1, name: plainText(item.name) };
        if (item.description) entry.description = plainText(item.description);
        if (item.url) entry.url = String(item.url).startsWith('#') ? `${pageUrl}${item.url}` : item.url;
        return entry;
      }),
    });
  }

  let serviceId = null;
  if (fm.service) {
    serviceId = `${base}/#service`;
    const service = {
      '@type': 'Service',
      '@id': serviceId,
      name: plainText(fm.service.name),
      serviceType: plainText(fm.service.service_type),
      provider: { '@id': organization.id },
    };
    if (fm.service.audience_type || fm.service.audience_name) {
      service.audience = { '@type': 'Audience' };
      if (fm.service.audience_type) service.audience.audienceType = plainText(fm.service.audience_type);
      if (fm.service.audience_name) service.audience.name = plainText(fm.service.audience_name);
    }
    if (fm.service.area_served) service.areaServed = plainText(fm.service.area_served);
    if (Array.isArray(fm.service.offers) && fm.service.offers.length) {
      service.hasOfferCatalog = {
        '@type': 'OfferCatalog',
        name: `${plainText(fm.service.name)} applications`,
        itemListElement: fm.service.offers.map((offer) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: plainText(offer) },
        })),
      };
    }
    formatNodes.push(service);
  }

  const softwareIds = [];
  if (Array.isArray(fm.software)) {
    fm.software.forEach((entry, index) => {
      const id = `${base}/#software-${fragmentOf(entry, String(index + 1))}`;
      softwareIds.push(id);
      const node = {
        '@type': 'SoftwareApplication',
        '@id': id,
        name: plainText(entry.name),
        applicationCategory: plainText(entry.category || 'BusinessApplication'),
      };
      if (entry.operating_system) node.operatingSystem = plainText(entry.operating_system);
      if (entry.version) node.softwareVersion = plainText(entry.version);
      if (entry.url) node.url = entry.url;
      formatNodes.push(node);
    });
  }

  // HowTo: the steps are the one ```process-steps block flagged howto: true.
  // Validation guarantees exactly one exists whenever `howto` is declared.
  if (fm.howto) {
    const source = blocks.find((block) => block.name === 'process-steps' && block.data && block.data.howto === true);
    const items = source && Array.isArray(source.data.items) ? source.data.items : [];
    const howto = {
      '@type': 'HowTo',
      '@id': `${base}/#howto`,
      name: plainText(fm.howto.name),
    };
    if (fm.howto.description) howto.description = plainText(fm.howto.description);
    if (fm.howto.total_time) howto.totalTime = plainText(fm.howto.total_time);
    if (Array.isArray(fm.howto.tools) && fm.howto.tools.length) {
      howto.tool = fm.howto.tools.map((tool) => ({ '@type': 'HowToTool', name: plainText(tool) }));
    }
    howto.step = items.map((item, index) => {
      const step = {
        '@type': 'HowToStep',
        position: index + 1,
        name: plainText(item.title),
        text: plainText(item.body),
      };
      if (item.id) step.url = `${pageUrl}#${String(item.id).trim()}`;
      return step;
    });
    formatNodes.push(howto);
  }

  // ---- the root node -------------------------------------------------------
  const rootType = (fm.article && fm.article.type) || 'Article';
  const collection = rootType === 'CollectionPage';
  const root = { '@type': rootType, '@id': rootId };
  if (collection) {
    root.name = plainText(fm.title);
  } else {
    root.headline = plainText(fm.title);
  }
  root.description = plainText(fm.description);
  root.author = { '@id': authorId(fm.author, organization) };
  root.publisher = { '@id': organization.id };
  root.datePublished = String(fm.published);
  root.dateModified = String(fm.updated || fm.published);
  root.inLanguage = config.language;
  if (collection) {
    root.url = pageUrl;
  } else {
    root.mainEntityOfPage = pageUrl;
  }
  if (rootType === 'TechArticle' && fm.article) {
    if (fm.article.proficiency_level) root.proficiencyLevel = plainText(fm.article.proficiency_level);
    if (fm.article.dependencies) root.dependencies = plainText(fm.article.dependencies);
  }

  // ---- what the root node is about ------------------------------------------
  // The page's own index (cluster resource index, pillar link-card list) is
  // computed below; a CollectionPage prefers it as mainEntity.
  const aboutId = termId || termSetId || datasetId || itemListId || serviceId || softwareIds[0] || null;
  const indexId =
    pageType === 'cluster' && fm.resource_index && Array.isArray(fm.resource_index.items)
      ? `${base}/#spokes`
      : pageType === 'pillar' && blocks.some((block) => block.name === 'link-card' && block.data)
        ? `${base}/#index`
        : null;
  if (collection) {
    const mainEntity = indexId || aboutId;
    if (mainEntity) root.mainEntity = { '@id': mainEntity };
  } else if (aboutId) {
    root.about = { '@id': aboutId };
  }
  if (fm.breadcrumbs && fm.breadcrumbs.length) {
    const parent = fm.breadcrumbs[fm.breadcrumbs.length - 1];
    root.isPartOf = { '@type': 'WebPage', '@id': parent.url, name: plainText(parent.label) };
  }

  graph.push(root, ...formatNodes);

  // A standalone spoke carries no breadcrumbs, so it emits no BreadcrumbList
  // (and, above, no isPartOf) — the trail is never invented.
  if (Array.isArray(fm.breadcrumbs) && fm.breadcrumbs.length) {
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
  }

  // ---- the page's own index ----------------------------------------------
  if (pageType === 'cluster' && fm.resource_index && Array.isArray(fm.resource_index.items)) {
    graph.push({
      '@type': 'ItemList',
      '@id': indexId,
      name: plainText(fm.resource_index.title),
      numberOfItems: fm.resource_index.items.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: fm.resource_index.items.map((item, index) => {
        const entry = { '@type': 'ListItem', position: index + 1, name: plainText(item.title) };
        if (item.description) entry.description = plainText(item.description);
        if (item.url && item.status !== 'in-production') entry.url = item.url;
        return entry;
      }),
    });
  }

  // A pillar indexes the pages it routes to: every ```link-card, in body order.
  // Derived from the body so the list can never disagree with the page.
  if (pageType === 'pillar') {
    const cards = blocks.filter((block) => block.name === 'link-card' && block.data);
    if (cards.length) {
      graph.push({
        '@type': 'ItemList',
        '@id': indexId,
        name: plainText(fm.title),
        numberOfItems: cards.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: cards.map((card, index) => {
          const entry = { '@type': 'ListItem', position: index + 1, name: plainText(card.data.title) };
          if (card.data.description) entry.description = plainText(card.data.description);
          if (card.data.url && card.data.status !== 'in-production') entry.url = card.data.url;
          return entry;
        }),
      });
    }
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
