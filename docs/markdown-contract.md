# The renderer-ready Markdown contract

One `.md` file produces one finished HTML page body. The file has two parts:

1. **YAML frontmatter** — page metadata and the structured values the page-level
   components need.
2. **A Markdown body** — the page's sections, written as ordinary Markdown, with
   fenced blocks where a section needs an approved component.

The renderer is deliberately strict. If something is missing, malformed, or not
recognized, it fails and tells you which key or line to fix. It never invents
content and never guesses a layout.

Run `html-render --contract pillar|cluster|spoke` to print the live contract for
a page class, and `html-render --components` to list every component.

---

## The two halves, and why the split matters

**Frontmatter holds page-level chrome.** The hero, the freshness bar, the intro
and table of contents, the cluster resource index, the methodology band, the
FAQ, the citations, the related-links band, and the CTA are all fixed parts of
an approved layout. Their content lives in frontmatter, and the layout decides
where they appear. You cannot reorder or duplicate them.

**The body holds in-flow content.** Everything a reader scrolls through inside a
section — paragraphs, lists, tables, callouts, card grids, quotes — lives in the
Markdown body, in the order you write it.

That split is what keeps the renderer from becoming a generic page builder.

---

## Frontmatter

### Required on every page

```yaml
page_type: pillar | cluster | spoke   # picks the layout
title: The page H1
url: https://hginsights.com/geo/...   # final published URL
description: One sentence. Becomes the hero lead and the schema description.
published: 2026-08-11                 # ISO date
breadcrumbs:                          # ancestors only; this page is appended
  - label: Home
    url: https://hginsights.com/
  - label: GEO Resources
    url: https://hginsights.com/geo/
author:
  name: Jordan Lee
  title: Principal Analyst, HG Insights
  # optional: feeds Person.knowsAbout in the schema graph
  # knows_about: [Generative Engine Optimization, AI Share of Voice]
faq:
  title: Common questions about ...
  items:
    - q: A question phrased the way a buyer would ask it
      a: The answer.
cta:
  title: The closing call to action
  body: One sentence of supporting copy.
  buttons:
    - label: Request a Demo
      url: https://hginsights.com/demo
```

`eyebrow` is also required on Pillar and Cluster pages. Pillar and Cluster
additionally require `hero.stats` and `intro`; Cluster requires
`resource_index`; Spoke requires `related`. `cta.buttons` allows one
entry on every page class (the footer Request a Demo).

### Optional on every page

```yaml
updated: 2026-08-11            # defaults to `published`
eyebrow: GEO Measurement Guide # accepted on every page; not rendered in the hero
breadcrumb_label: A shorter label for the current page in the trail
page_skill_version: 0.24.0 (create-glossary-spoke)   # provenance; echoed in the output header
component_library_version: html-render v1.3.0        # provenance; echoed in the output header
pills:                         # accepted but not rendered
  - Ungated & citable
  - label: Last reviewed: August 2026
    tone: melon                # default | melon
hero:
  thesis: The 40-50 word statement the page is built to have quoted.
  freshness_badge: Figures reflect 2026 telemetry
  source: Source: HG Insights
  coverage: What the figures do and do not cover.
  stats:                       # 1-5; the first is the large primary card
    - value: 60
      unit: M
      label: what the number counts
      source: HG Insights internal telemetry, 2026
      primary: true
freshness:                     # always rendered under the hero
  label: Q3 2026               # the only field used (`Data last updated: {label}`)
  note: What the figures reflect
  cadence: How often they refresh
  link_text: See how these figures are tracked
  link_url: "#faq"
intro:                         # pillar/cluster: intro copy + jump nav; spoke: optional copy (`toc` feeds the rail)
  eyebrow: About This Guide
  title: What this guide covers
  body: |
    First paragraph.

    Second paragraph.
  toc:                         # omit to derive it from the body sections
    - label: Why It Matters
      anchor: market-drivers
methodology:                   # "how we measure this" band
  title: How we measure this
  body: One or more paragraphs.
  caveat: The honest limitation.
citations:                     # every [^n] in the body must resolve here
  subtitle: Optional line under the heading
  items:
    - source: Google Search Central
      title: AI Features and Your Website
      url: https://developers.google.com/search/docs/appearance/ai-features
      accessed: 2026-08-01
related:                       # the "where to go next" band
  title: Where to go next
  items:
    - tag: Cluster Hub
      title: Core AI Visibility Metrics and Vocabulary
      url: https://hginsights.com/geo/.../core-metrics-vocabulary/
      description: One sentence on what the reader gets there.
      link_text: Explore the hub
term:                          # adds DefinedTerm schema; for glossary pages
  name: AI Share of Voice
  alternate_name: AI SOV
  term_code: AI-SOV
  definition: The canonical one-sentence definition.
  set_name: Core AI Visibility Metrics and Vocabulary
  set_url: https://hginsights.com/geo/.../core-metrics-vocabulary/
```

### Format-specific schema nodes

A page format usually calls for more than `Article` + `FAQPage`. These keys add
the nested nodes a format needs, and nothing here renders visibly. Every one is
optional on every page class; the graph they produce is described in
[page-layouts.md](page-layouts.md#the-json-ld-graph).

```yaml
article:                       # the root node's type; Article when omitted
  type: TechArticle            # Article | TechArticle | CollectionPage
  proficiency_level: Expert    # TechArticle only
  dependencies: Salesforce Enterprise Edition or higher   # TechArticle only
howto:                         # adds HowTo; the steps come from the body (see below)
  name: How to score a technology intelligence vendor out of 20 points
  description: A five-step scoring procedure a buying committee runs in a 30-day POC.
  total_time: P30D             # ISO 8601 duration
  tools:                       # HowToTool names
    - HG Insights REST API v3 client credentials
item_list:                     # adds ItemList: the options or items the page enumerates
  name: Enterprise intent data approaches compared
  order: unordered             # ascending (default) for a real ranking or numbered list
  items:
    - name: HG Insights Contextual Intent Data
      description: One sentence on the option.
      url: "#contextual-intent"     # an absolute URL or an #anchor on this page
dataset:                       # adds Dataset (+ DataCatalog when `catalog` is given)
  name: 2026 Global Enterprise IT Spend Benchmark
  description: A forward-facing projection of enterprise IT spend across 128 categories.
  variable_measured:           # all three coverage keys are required
    - Total IT Spend
    - Software Spend
  temporal_coverage: 2025/2026
  spatial_coverage: Global (60+ countries)
  measurement_technique: Aggregation of verified install and spend signals.
  license: https://hginsights.com/reports/it-spend-benchmark-2026/#citation-rights
  free: true                   # isAccessibleForFree; defaults to true
  catalog:                     # omit when the page has no parent catalog
    name: HG Insights Research Data Catalog
    url: https://hginsights.com/research/
service:                       # adds Service; for solution briefs
  name: HG Insights Technology Intelligence for Cybersecurity GTM
  service_type: Technographic and IT spend intelligence for competitive displacement
  audience_type: Cybersecurity software vendors and managed security service providers
  audience_name: Cybersecurity GTM teams
  area_served: Global
  offers:                      # each becomes an Offer in the Service's OfferCatalog
    - Behind-the-firewall legacy security appliance detection
term_set:                      # adds DefinedTermSet with one DefinedTerm per entry
  name: HG Technographics API Field Dictionary
  description: Every field the company install endpoint returns, as of Q2 2026.
  terms:
    - name: product_id
      definition: An integer that uniquely identifies a product in the taxonomy.
      id: field-product-id     # the @id fragment; derived from the name when omitted
      term_code: PID
software:                      # adds one SoftwareApplication per entry
  - name: HG Insights Revenue Growth Intelligence Fabric
    category: BusinessApplication   # default
    operating_system: Cloud (SaaS)
    version: REST API v3
    id: rgi-fabric
```

**`howto` reads its steps from the body.** The visible steps are already a
```` ```process-steps ```` block, so the schema takes them from there rather than
from a second copy: flag exactly one block with `howto: true`, and each of its
items becomes a `HowToStep` in order, `text` being the item's body with
Markdown stripped. Give an item an `id` and the step carries a `url` pointing
at that anchor. Declaring `howto` with no flagged block, flagging a block with
no `howto`, or flagging two blocks is an error.

**What the root node is about.** `Article.about` (or `CollectionPage.mainEntity`)
points at the first of `term`, `term_set`, `dataset`, `item_list`, `service`,
`software[0]` that the page declares. A `CollectionPage` prefers the page's own
index when it has one: a cluster's resource index, or a pillar's list of
`link-card` blocks.

### Page-class-specific keys

| Key | Page class | Required | What it does |
|---|---|---|---|
| `hero.stats` | pillar, cluster, banded spoke | yes | The stat-card grid in the gradient hero |
| `intro` | pillar, cluster (required); spoke (optional) | see class | Pillar/cluster: intro copy plus the sticky jump nav. Spoke: intro copy only; `intro.toc` feeds the right-rail link list rather than a visible jump nav |
| `side_nav` | pillar, spoke | no | `label` and `note` for the right-rail nav. Links are derived from body sections (or `intro.toc`). On spoke, the footer Request a Demo button is assembled from the first `cta.buttons` entry with `variant: primary` (default); it is not a `side_nav` key |
| `resource_index` | cluster | yes | The card grid indexing every spoke in the cluster |
| `related` | spoke | yes | The closing cross-link band |
| `layout` | spoke | no | `article` (default) or `banded` — see [page-layouts.md](page-layouts.md) |
| `standalone` | spoke | no | `true` = no parent hub: omits the breadcrumb bar, `BreadcrumbList`, and `isPartOf`; `breadcrumbs` must then be absent |
| `cta.buttons` | all | yes (one) | A single footer button. Secondary buttons, `cta.links`, and `cta.pills` are not rendered |
| `freshness` | all | no | Always rendered under the hero. `label` if supplied, otherwise a quarter derived from `updated` (else `published`). Note, cadence, and methodology link are ignored |
| `pills` | all | no | Accepted but not rendered |
| *(derived)* | pillar | — | Every ```` ```link-card ```` in the body becomes an entry in the pillar's `ItemList`, in body order. Nothing to author |

### Frontmatter rules

- **Quote any value containing `": "`.** `- "Primary reader: GEO Specialist"`,
  not `- Primary reader: GEO Specialist` — the second is read as a key/value
  pair and rejected. A value where the colon follows the key is fine:
  `source: Source: HG Insights`.
- **Use `|` for multi-paragraph values.** Blank lines inside a `|` block become
  paragraph breaks.
- **Lists are `- ` lines.** Inline `[a, b, c]` works for simple string lists;
  inline `{ }` maps are not supported.
- **Two spaces per indent level**, spaces only — tabs are rejected.
- **Links** must be an absolute URL, a site-root path starting with `/`, or an
  `#anchor`.

---

## The Markdown body

### Sections

`##` starts a page section. Everything until the next `##` belongs to it.

```markdown
## Why Does AI Search Visibility Measurement Matter Right Now?

```section
eyebrow: Why It Matters
id: market-drivers
nav_label: Why It Matters
subtitle: One line under the section heading.
```

The body copy of the section goes here.
```

The optional `section` block sets:

| Key | Effect |
|---|---|
| `eyebrow` | The uppercase kicker above the heading |
| `subtitle` | One line under the heading |
| `id` | The anchor. Set it — auto-generated anchors are derived from the heading and are long |
| `nav_label` | A shorter label for the table of contents and side nav |
| `band` | `white` or `tinted`, overriding the alternating band colour (Cluster and banded Spoke only) |

`###` inside a section renders a sub-heading. On a Cluster page each `###` and
the copy beneath it becomes a grouping block.

### Prose

| You write | You get |
|---|---|
| `A paragraph.` | `<p>` in the section's body style |
| `**bold**` | `<strong>` |
| `*emphasis*` or `_emphasis_` | `<em>` |
| `` `code` `` | `<code>` |
| `[text](url)` | A link. External hosts get `target="_blank" rel="noopener"` |
| `[^3]` | A superscript citation link to the third entry in `citations` |
| `- item` | The branded bullet list |
| `1. item` | The branded numbered list |
| `> statement` | The thesis block |
| `---` | A section rule |
| `&middot;` `&rarr;` | Passed through as written; a bare `&` is escaped |
| `\*` | A literal asterisk |

### Tables

A GFM pipe table becomes the approved comparison table. The first column of
each body row is treated as the row label. A paragraph starting `Source:`
directly after the table becomes the table caption.

```markdown
| Dimension | SEO Rank Tracking | AI Visibility Measurement |
|---|---|---|
| What It Measures | Position in a results list | Mentioned or cited in a generated answer |

Source: HG Insights analysis of GEO measurement practice, 2026.
```

### Components

Anything more structured than prose is a fenced block naming a component, with
YAML inside it:

````markdown
```callout
label: Why It Matters
body: Attribution is the hardest integration point.
tone: note
```
````

See [component-library.md](component-library.md) for every component and its
inputs, or run `html-render --components`.

---

## What the renderer rejects

| Problem | What you get |
|---|---|
| Unknown or missing `page_type` | The supported page types |
| A missing required key | `url: is required`, with the line number |
| A key that is not in the contract | The list of allowed keys |
| A list written as a scalar, or entries missing keys | `faq.items[0]: is malformed: each entry needs keys (q, a)` |
| A variant outside its allowed set | `callout.tone: must be one of: note, warn` |
| An unknown component name | The list of components that do exist |
| `[^n]` with no matching citation | Which reference is unresolved |
| Two sections producing the same anchor | Which two collided |
| A `toc` anchor pointing nowhere | The anchors that exist on the page |
| An unusable link target | What forms are accepted |
| Hero stats on an `article` spoke | A pointer to `layout: banded` |
| `breadcrumbs` on a `standalone: true` spoke | Remove the trail or remove the flag — it is never invented |
| `howto` with no ```` ```process-steps ```` flagged `howto: true`, a flagged block with no `howto`, or two flagged blocks | Which side to fix |
| A step `id` that is not a lowercase slug, or collides with a section anchor or another step | The offending id |
| An `item_list` entry whose `#anchor` matches nothing on the page | The anchors that exist |
| A `bar-chart` whose variant lacks its legend, segments, or bars, or a `download_label` without a `download_url` | The missing key |
| Body copy before the first `##` on a Pillar or Cluster | The line it starts on |

Every problem in the file is reported at once, so one pass gets you a clean run.
