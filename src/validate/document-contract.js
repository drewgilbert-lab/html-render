'use strict';

/**
 * The frontmatter contract, exactly as an author writes it.
 *
 * Validation runs against this shape (not against assembled component inputs)
 * so every error message names a key the author can actually find in their
 * Markdown file. Slot shapes are borrowed from the component contracts in
 * src/components so the two can never drift.
 */

const { slotFields } = require('../components');
const { AUTHOR_FIELDS, PILL_LIST, STAT_FIELDS } = require('../components/page');

const PAGE_TYPES = ['pillar', 'cluster', 'spoke'];
const SPOKE_LAYOUTS = ['article', 'banded'];

const HERO_FIELDS = {
  thesis: { type: 'text', hint: 'the 40-50 word statement the page is built to have quoted' },
  freshness_badge: { type: 'text' },
  source: { type: 'text' },
  coverage: { type: 'text' },
  stats: { type: 'list', min: 1, max: 5, fields: STAT_FIELDS },
};

const SIDE_NAV_FIELDS = {
  label: { type: 'text', default: 'On this page' },
  note: { type: 'text' },
};

const TERM_FIELDS = {
  name: { type: 'plain', required: true },
  alternate_name: { type: 'plain' },
  term_code: { type: 'plain' },
  definition: { type: 'text', required: true },
  set_name: { type: 'plain' },
  set_url: { type: 'url' },
};

/*
 * Format-specific schema nodes. Every one is optional on every page class and
 * feeds src/schema.js only — nothing here renders visibly. They exist so a page
 * can carry the nested JSON-LD its format calls for (a HowTo, a Dataset, an
 * ItemList of options, a Service, a DefinedTermSet, a SoftwareApplication)
 * without the author writing a line of JSON-LD by hand.
 */

const ARTICLE_FIELDS = {
  type: {
    type: 'enum',
    values: ['Article', 'TechArticle', 'CollectionPage'],
    default: 'Article',
    hint: 'the schema type of the page\'s root node; CollectionPage suits a page whose job is to index other pages',
  },
  proficiency_level: { type: 'plain', hint: 'TechArticle only, e.g. "Expert"' },
  dependencies: { type: 'text', hint: 'TechArticle only: what the reader needs in place before the article applies' },
};

const HOWTO_FIELDS = {
  name: { type: 'text', required: true, hint: 'e.g. "How to score a vendor out of 20 points"' },
  description: { type: 'text' },
  total_time: { type: 'plain', hint: 'an ISO 8601 duration, e.g. "P30D" or "PT4H"' },
  tools: { type: 'list', of: { type: 'plain' }, hint: 'HowToTool names' },
};

const ITEM_LIST_FIELDS = {
  name: { type: 'text', required: true },
  order: {
    type: 'enum',
    values: ['ascending', 'unordered'],
    default: 'ascending',
    hint: 'ascending for a real ranking or numbered sequence, unordered for options with no rank',
  },
  items: {
    type: 'list',
    required: true,
    min: 1,
    fields: {
      name: { type: 'text', required: true },
      description: { type: 'text' },
      url: { type: 'url', hint: 'an absolute URL, or an "#anchor" that exists on this page' },
    },
  },
};

const DATASET_FIELDS = {
  name: { type: 'text', required: true },
  description: { type: 'text', required: true },
  variable_measured: { type: 'list', required: true, min: 1, of: { type: 'plain' }, hint: 'the measured variables, one per entry' },
  temporal_coverage: { type: 'plain', required: true, hint: 'e.g. "2025/2026" or "2026-Q1"' },
  spatial_coverage: { type: 'plain', required: true, hint: 'e.g. "Global (60+ countries)"' },
  measurement_technique: { type: 'text' },
  license: { type: 'url', hint: 'the citation-rights or license URL' },
  free: { type: 'bool', default: true, hint: 'isAccessibleForFree' },
  catalog: {
    type: 'object',
    fields: { name: { type: 'plain', required: true }, url: { type: 'url', required: true } },
    hint: 'the DataCatalog this dataset belongs to; omit when the page has no parent catalog',
  },
};

const SERVICE_FIELDS = {
  name: { type: 'plain', required: true },
  service_type: { type: 'text', required: true },
  audience_type: { type: 'text', hint: 'Audience.audienceType, e.g. "Cybersecurity software vendors"' },
  audience_name: { type: 'plain', hint: 'Audience.name, e.g. "Cybersecurity GTM teams"' },
  area_served: { type: 'plain' },
  offers: { type: 'list', of: { type: 'plain' }, hint: 'named applications; each becomes an Offer in the OfferCatalog' },
};

const TERM_SET_FIELDS = {
  name: { type: 'plain', required: true },
  description: { type: 'text' },
  terms: {
    type: 'list',
    required: true,
    min: 1,
    fields: {
      name: { type: 'plain', required: true },
      definition: { type: 'text', required: true },
      id: { type: 'plain', hint: 'the @id fragment, e.g. "field-product-id"; derived from the name when omitted' },
      alternate_name: { type: 'plain' },
      term_code: { type: 'plain' },
    },
  },
};

const SOFTWARE_FIELDS = {
  name: { type: 'plain', required: true },
  category: { type: 'plain', default: 'BusinessApplication', hint: 'schema.org applicationCategory' },
  operating_system: { type: 'plain', hint: 'e.g. "Cloud (SaaS)"' },
  version: { type: 'plain' },
  url: { type: 'url' },
  id: { type: 'plain', hint: 'the @id fragment; derived from the name when omitted' },
};

/** Fields shared by every page class. */
function baseFields() {
  return {
    page_type: { type: 'enum', values: PAGE_TYPES, required: true },
    title: { type: 'text', required: true },
    url: { type: 'url', required: true, hint: 'the page\'s final published URL, used for schema and the last breadcrumb' },
    description: { type: 'text', required: true, hint: 'the hero lead paragraph, also used as the schema description' },
    eyebrow: { type: 'text' },
    published: { type: 'plain', required: true, hint: 'an ISO date, e.g. 2026-08-11' },
    updated: { type: 'plain' },
    page_skill_version: { type: 'plain', hint: 'provenance: the skill and version that authored this page; echoed in the output header' },
    component_library_version: { type: 'plain', hint: 'provenance: the contract stamp this page was authored against; echoed in the output header' },
    breadcrumbs: {
      type: 'list',
      required: true,
      min: 1,
      fields: { label: { type: 'text', required: true }, url: { type: 'url', required: true } },
      hint: 'the ancestor trail; the current page is appended automatically',
    },
    breadcrumb_label: { type: 'text' },
    author: { type: 'object', required: true, fields: AUTHOR_FIELDS },
    pills: { ...PILL_LIST },
    hero: { type: 'object', fields: HERO_FIELDS },
    freshness: { type: 'object', fields: slotFields('freshness-bar') },
    intro: { type: 'object', fields: slotFields('intro-toc') },
    methodology: { type: 'object', fields: slotFields('methodology') },
    faq: { type: 'object', required: true, fields: slotFields('faq') },
    citations: { type: 'object', fields: slotFields('citations') },
    related: { type: 'object', fields: slotFields('related') },
    cta: { type: 'object', required: true, fields: slotFields('cta') },
    term: { type: 'object', fields: TERM_FIELDS },
    article: { type: 'object', fields: ARTICLE_FIELDS, hint: 'the root schema node\'s type and TechArticle extras' },
    howto: { type: 'object', fields: HOWTO_FIELDS, hint: 'adds HowTo schema; the steps come from the one ```process-steps block flagged howto: true' },
    item_list: { type: 'object', fields: ITEM_LIST_FIELDS, hint: 'adds ItemList schema naming the options or items this page enumerates' },
    dataset: { type: 'object', fields: DATASET_FIELDS, hint: 'adds Dataset schema (plus DataCatalog when `catalog` is given); for benchmark and data-report pages' },
    service: { type: 'object', fields: SERVICE_FIELDS, hint: 'adds Service schema tying an audience to an offering; for solution briefs' },
    term_set: { type: 'object', fields: TERM_SET_FIELDS, hint: 'adds a DefinedTermSet with one DefinedTerm per entry; for decision options and field dictionaries' },
    software: { type: 'list', fields: SOFTWARE_FIELDS, hint: 'adds one SoftwareApplication node per entry; for integration pages' },
  };
}

/**
 * Per-page-class contracts. Each one starts from the shared fields and then
 * tightens what that page class must supply, mirroring the approved layouts.
 */
function contractFor(pageType) {
  const fields = baseFields();

  if (pageType === 'pillar') {
    fields.eyebrow.required = true;
    fields.hero.required = true;
    fields.hero.fields = { ...HERO_FIELDS, stats: { ...HERO_FIELDS.stats, required: true } };
    fields.intro.required = true;
    fields.side_nav = { type: 'object', fields: SIDE_NAV_FIELDS };
    return fields;
  }

  if (pageType === 'cluster') {
    fields.eyebrow.required = true;
    fields.hero.required = true;
    fields.hero.fields = { ...HERO_FIELDS, stats: { ...HERO_FIELDS.stats, required: true } };
    fields.intro.required = true;
    fields.resource_index = { type: 'object', required: true, fields: slotFields('resource-index') };
    return fields;
  }

  if (pageType === 'spoke') {
    fields.layout = { type: 'enum', values: SPOKE_LAYOUTS, default: 'article' };
    fields.related.required = true;
    fields.side_nav = { type: 'object', fields: SIDE_NAV_FIELDS };
    fields.standalone = {
      type: 'bool',
      default: false,
      hint: 'a page with no parent hub: omits the breadcrumb bar and BreadcrumbList; `breadcrumbs` must then be absent',
    };
    const ctaFields = slotFields('cta');
    fields.cta = {
      type: 'object',
      required: true,
      fields: {
        ...ctaFields,
        buttons: { ...ctaFields.buttons, max: 1 },
      },
    };
    return fields;
  }

  throw new Error(`Unknown page type "${pageType}"`);
}

/**
 * The `banded` spoke variant uses the gradient hero, so it needs hero stats;
 * the `article` variant uses the light article hero and must not.
 */
function tightenSpoke(fields, layout) {
  if (layout === 'banded') {
    fields.hero = { type: 'object', required: true, fields: { ...HERO_FIELDS, stats: { ...HERO_FIELDS.stats, required: true } } };
  }
  return fields;
}

/**
 * A standalone spoke owns no ancestor trail, so `breadcrumbs` stops being
 * required. Presence of a trail on a standalone page is rejected separately,
 * with a message naming both keys — see validate.js.
 */
function applyStandalone(fields, standalone) {
  if (standalone) {
    fields.breadcrumbs = { ...fields.breadcrumbs, required: false };
  }
  return fields;
}

module.exports = {
  PAGE_TYPES,
  SPOKE_LAYOUTS,
  contractFor,
  tightenSpoke,
  applyStandalone,
  HERO_FIELDS,
  SIDE_NAV_FIELDS,
  TERM_FIELDS,
  ARTICLE_FIELDS,
  HOWTO_FIELDS,
  ITEM_LIST_FIELDS,
  DATASET_FIELDS,
  SERVICE_FIELDS,
  TERM_SET_FIELDS,
  SOFTWARE_FIELDS,
};
