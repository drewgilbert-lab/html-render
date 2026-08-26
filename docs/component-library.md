# Component library

Every component is one canonical implementation of a component from the HG
Insights Claude Design library. The `design source` column names the design
system file it implements. A component appears once in the codebase and is
composed by the layouts, so changing an implementation changes every page that
uses it.

Run `html-render --components` for the same list from the live registry.

---

## In-flow components

These are the ones you invoke, inside a page section, with a fenced block.

### `callout` — 46-callout-box

A labelled note box: "Why It Matters", "Watch Out", "Coverage Note".

````markdown
```callout
label: Why It Matters
body: Attribution is the hardest integration point.
tone: note
```
````

| Key | | Notes |
|---|---|---|
| `label` | required | The uppercase kicker |
| `body` | required | Multi-paragraph allowed |
| `tone` | `note` \| `warn` | `warn` is the melon variant |

### `concept-cards` — 51-concept-card-grid

A grid of parallel concept cards.

````markdown
```concept-cards
items:
  - title: Defined Prompt Set
    body: A fixed list of real buyer questions.
  - title: Multi Engine Coverage
    body: Parallel tracking across four engines at minimum.
```
````

| Key | | Notes |
|---|---|---|
| `items` | required, 2-6 | Each needs `title` and `body` |

### `quote` — 12-expert-quote-card

An attributed analyst pull quote.

````markdown
```quote
text: Every marketing team can tell me their organic rank. Almost none can tell me their Citation Rate.
name: Jordan Lee
title: Principal Analyst, HG Insights
link_text: See the measurement framework
link_url: "#core-metrics-cluster"
```
````

| Key | | Notes |
|---|---|---|
| `text` | required | |
| `name`, `title` | required | |
| `initials` | | Derived from `name` when omitted |
| `link_text`, `link_url` | | Both or neither |

### `process-steps` — 49-process-steps

A numbered step sequence.

````markdown
```process-steps
items:
  - title: Fix the prompt set
    body: A prompt list that changes between cycles makes every trend line meaningless.
  - title: Name the competitor set
    body: Share of Voice is undefined without a fixed list of competitor brands.
```
````

| Key | | Notes |
|---|---|---|
| `items` | required, 2+ | Each needs `title` and `body`; badges are numbered in order |

### `before-after` — 50-before-after

Two-column old-vs-new contrast.

````markdown
```before-after
before:
  label: "Before: Metric-First Reporting"
  body: A deck that opens with definitions and no competitor names.
after:
  label: "After: GEO Reporting Framework"
  body: A deck that opens with a pipeline proof point and a benchmarked trend line.
```
````

### `formula` — 31-thesis-block (formula variant)

A highlighted formula or calculation statement.

````markdown
```formula
text: AI Share of Voice = (brand mentions ÷ total mentions across the brand and every named competitor) × 100
```
````

Multiple lines in `text` render as separate lines inside one block.

### `bars` — 10-supporting-charts (mini bar)

A compact horizontal bar chart for indexed or ranked values.

````markdown
```bars
title: AI crawler visits, indexed to non-customer baseline
items:
  - label: Non-customer baseline
    value: 1x
  - label: TrustRadius customer
    value: 21x
  - label: TrustRadius Top Rated
    value: 31x
note: Indexed to non-customer baseline = 1x
```
````

Bar widths come from the leading number in each `value`, indexed to the largest
in the set. Set `share` on an item (0-100) to override.

### `benchmark-figure` — 24-benchmark-figure

The "lead with the number" benchmark. Every part except the headline figure and
its label is optional, and only the parts you supply are rendered.

````markdown
```benchmark-figure
eyebrow: GEO Reporting Benchmark
figure: 5.1x
label: Higher conversion rate for AI-referred visitors versus Google organic
compare:
  left_label: AI-referred visitor conversion rate
  left_value: 14.2%
  right_label: Google organic visitor conversion rate
  right_value: 2.8%
  delta: 5.1x higher
  direction: up
  delta_note: Averi Multi-Source Analysis, March 2026
bars:
  title: AI crawler visits, indexed to non-customer baseline
  items:
    - label: Non-customer baseline
      value: 1x
    - label: TrustRadius customer
      value: 21x
definition:
  title: What these figures measure
  body: Confirmed visits from named AI crawler user agents.
footer: Source: TrustRadius internal crawl-log data.
```
````

### `link-card` — 13-data-cut-filters

One card linking down to a cluster or spoke. Set `status: in-production` for a
page that is planned but not published; the card renders as a non-link with a
badge, and no URL is invented.

````markdown
```link-card
tag: Cluster Hub
title: Core AI Visibility Metrics and Vocabulary
description: Definitions, calculation methodology, and metric selection.
url: https://hginsights.com/geo/.../core-metrics-vocabulary/
```
````

### `related-cards` — 14-spoke-page-cards

A grid of cross-link cards, for use inside a section. The page-level `related`
band uses the same card implementation.

````markdown
```related-cards
items:
  - tag: Methodology
    title: How to Calculate Share of Voice for AI Search
    url: https://hginsights.com/geo/.../how-to-calculate-share-of-voice/
    description: The full formula plus a worked example.
    link_text: See the formula
```
````

### `figure` — Figure

An image, diagram, or screenshot with an optional italic caption. Omit `src`
to get the dashed draft placeholder — the placeholder is a functional flag
that an asset is outstanding, so never ship one silently.

````markdown
```figure
src: /assets/chart-crm-share.png
alt: CRM install share by vendor, Q2 2026
caption: Figure 1. CRM install share among companies with 500+ employees, Q2 2026.
```
````

| Key | | Notes |
|---|---|---|
| `src` | | Omit for the `[IMAGE NEEDED]` draft placeholder |
| `alt` | | Empty `alt=""` is emitted when omitted |
| `caption` | | Rendered italic below the image |
| `placeholder` | | Placeholder label; defaults to `[IMAGE NEEDED]` |

---

## Page-level components

These are composed by the layouts from frontmatter. You supply their content but
not their position — see [page-layouts.md](page-layouts.md).

| Component | Design source | Fed by |
|---|---|---|
| `breadcrumb` | 02-breadcrumb | `breadcrumbs`, `breadcrumb_label`, `title` |
| `hero` | 03-hero-stat-block | `eyebrow`, `title`, `description`, `pills`, `author`, `hero.*` |
| `article-hero` | 34-editorial-hero (light) | `title`, `author`, `pills` |
| `freshness-bar` | 04-data-freshness-bar | `freshness` |
| `thesis-band` | 31-thesis-block | `hero.thesis` (Cluster only) |
| `intro-toc` | 06-hub-intro-toc | `intro`, plus body sections for the nav |
| `side-nav` | 30-sticky-side-nav | `side_nav`, plus body sections for the links |
| `resource-index` | 13-data-cut-filters | `resource_index` |
| `related` | 14-spoke-page-cards | `related` |
| `methodology` | 16-methodology-section | `methodology` |
| `faq` | 15-faq-accordion | `faq` |
| `citations` | 60-citations-list | `citations` |
| `cta` | 17-sticky-cta-footer | `cta` |

Sub-components reused across the above — the section header (05), meta pills
(35), stat cards (03), and the author byline — also have a single implementation,
in `src/components/page.js`.

---

## Adding a component

1. Add it to `src/components/blocks.js` (in-flow) or `src/components/page.js`
   (page-level) with `name`, `summary`, `source`, `fields`, and `render`.
2. Register it in the exported list at the bottom of that file.
3. Add its CSS to `src/assets/styles.css`, in a block naming the design-system
   component it implements.
4. If it is page-level, give it a slot in the relevant layout and a key in
   `src/validate/document-contract.js`.

Name the CSS block for the design-system component it implements and include its
number — `/* ---- Figure block (53) ---- */`. That number is how
`html-render --audit <catalog-dir>` recognises the component as implemented.

When the change comes from a design-system refresh rather than a one-off need,
start from `--audit` and follow
`.claude/skills/sync-design-components/SKILL.md`, which classifies the whole
catalog against this registry before anything is written.

`fields` is the input contract. Validation, normalization, escaping, defaults,
and the `--contract` and `--components` output all come from it, so a component
never parses or escapes its own input. The field types are documented at the top
of `src/validate/fields.js`.
