'use strict';

/**
 * Frontmatter the renderer reads but never draws.
 *
 * Everything visible on a page is a body block; these keys exist only so the
 * JSON-LD graph can carry the nodes a page needs and the output header can
 * name the page. They are the one thing left in frontmatter, and the renderer
 * validates their *shape* — it must be able to serialize them — while
 * requiring none of them. Whether a page ought to declare a Dataset is the
 * authoring skill's rule, not this renderer's.
 */

const IDENTITY_FIELDS = {
  title: { type: 'text', hint: 'the page name, used in the graph and the output header' },
  url: { type: 'url', hint: 'the final published URL; every @id is a fragment on it' },
  description: { type: 'text', hint: 'the meta description, also the graph description' },
  published: { type: 'plain', hint: 'an ISO date, e.g. 2026-08-11' },
  updated: { type: 'plain' },
  page_skill_version: { type: 'plain', hint: 'provenance: the skill and version that authored this page' },
  component_library_version: { type: 'plain', hint: 'provenance: the contract stamp this page was authored against' },
};

const ARTICLE_FIELDS = {
  type: {
    type: 'enum',
    values: ['Article', 'TechArticle', 'CollectionPage'],
    hint: 'the schema type of the root node; CollectionPage suits a page whose job is to index other pages',
  },
  proficiency_level: { type: 'plain', hint: 'TechArticle only, e.g. "Expert"' },
  dependencies: { type: 'text', hint: 'TechArticle only: what the reader needs in place before the article applies' },
};

const TERM_FIELDS = {
  name: { type: 'plain' },
  alternate_name: { type: 'plain' },
  term_code: { type: 'plain' },
  definition: { type: 'text' },
  set_name: { type: 'plain' },
  set_url: { type: 'url' },
};

const HOWTO_FIELDS = {
  name: { type: 'text', hint: 'e.g. "How to score a vendor out of 20 points"' },
  description: { type: 'text' },
  total_time: { type: 'plain', hint: 'an ISO 8601 duration, e.g. "P30D" or "PT4H"' },
  tools: { type: 'list', of: { type: 'plain' }, hint: 'HowToTool names' },
};

const ITEM_LIST_FIELDS = {
  name: { type: 'text' },
  order: { type: 'enum', values: ['ascending', 'unordered'], hint: 'ascending for a ranking, unordered for options with no rank' },
  items: {
    type: 'list',
    fields: {
      name: { type: 'text' },
      description: { type: 'text' },
      url: { type: 'url', hint: 'an absolute URL, or an "#anchor" on this page' },
    },
  },
};

const DATASET_FIELDS = {
  name: { type: 'text' },
  description: { type: 'text' },
  variable_measured: { type: 'list', of: { type: 'plain' }, hint: 'the measured variables, one per entry' },
  temporal_coverage: { type: 'plain', hint: 'e.g. "2025/2026" or "2026-Q1"' },
  spatial_coverage: { type: 'plain', hint: 'e.g. "Global (60+ countries)"' },
  measurement_technique: { type: 'text' },
  license: { type: 'url', hint: 'the citation-rights or license URL' },
  free: { type: 'bool', hint: 'isAccessibleForFree; true unless set false' },
  catalog: {
    type: 'object',
    fields: { name: { type: 'plain' }, url: { type: 'url' } },
    hint: 'the DataCatalog this dataset belongs to',
  },
};

const SERVICE_FIELDS = {
  name: { type: 'plain' },
  service_type: { type: 'text' },
  audience_type: { type: 'text', hint: 'Audience.audienceType, e.g. "Cybersecurity software vendors"' },
  audience_name: { type: 'plain' },
  area_served: { type: 'plain' },
  offers: { type: 'list', of: { type: 'plain' }, hint: 'named applications; each becomes an Offer in the OfferCatalog' },
};

const TERM_SET_FIELDS = {
  name: { type: 'plain' },
  description: { type: 'text' },
  terms: {
    type: 'list',
    fields: {
      name: { type: 'plain' },
      definition: { type: 'text' },
      id: { type: 'plain', hint: 'the @id fragment; derived from the name when omitted' },
      alternate_name: { type: 'plain' },
      term_code: { type: 'plain' },
    },
  },
};

const SOFTWARE_FIELDS = {
  name: { type: 'plain' },
  category: { type: 'plain', hint: 'schema.org applicationCategory; BusinessApplication when omitted' },
  operating_system: { type: 'plain', hint: 'e.g. "Cloud (SaaS)"' },
  version: { type: 'plain' },
  url: { type: 'url' },
  id: { type: 'plain', hint: 'the @id fragment; derived from the name when omitted' },
};

/** The whole frontmatter contract: identity plus the graph-only nodes. */
const FRONTMATTER_FIELDS = {
  ...IDENTITY_FIELDS,
  article: { type: 'object', fields: ARTICLE_FIELDS, hint: 'the root node\'s type and TechArticle extras' },
  term: { type: 'object', fields: TERM_FIELDS, hint: 'adds DefinedTerm schema' },
  term_set: { type: 'object', fields: TERM_SET_FIELDS, hint: 'adds a DefinedTermSet with one DefinedTerm per entry' },
  howto: { type: 'object', fields: HOWTO_FIELDS, hint: 'adds HowTo schema; steps come from a ```process-steps block flagged howto: true' },
  item_list: { type: 'object', fields: ITEM_LIST_FIELDS, hint: 'adds ItemList schema' },
  dataset: { type: 'object', fields: DATASET_FIELDS, hint: 'adds Dataset schema, plus DataCatalog when `catalog` is given' },
  service: { type: 'object', fields: SERVICE_FIELDS, hint: 'adds Service schema tying an audience to an offering' },
  software: { type: 'list', fields: SOFTWARE_FIELDS, hint: 'adds one SoftwareApplication node per entry' },
};

module.exports = {
  FRONTMATTER_FIELDS,
  IDENTITY_FIELDS,
  ARTICLE_FIELDS,
  TERM_FIELDS,
  HOWTO_FIELDS,
  ITEM_LIST_FIELDS,
  DATASET_FIELDS,
  SERVICE_FIELDS,
  TERM_SET_FIELDS,
  SOFTWARE_FIELDS,
};
