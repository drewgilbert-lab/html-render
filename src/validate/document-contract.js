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
    fields.standalone = {
      type: 'bool',
      default: false,
      hint: 'a page with no parent hub: omits the breadcrumb bar and BreadcrumbList; `breadcrumbs` must then be absent',
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

module.exports = { PAGE_TYPES, SPOKE_LAYOUTS, contractFor, tightenSpoke, applyStandalone, HERO_FIELDS, SIDE_NAV_FIELDS, TERM_FIELDS };
