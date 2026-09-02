# Component library

Every component is one canonical implementation of a component from the HG
Insights Claude Design library. The `design source` names the component it
implements — the export's component name verbatim (`Figure`) for entries
synced against a Claude Design export, or a retired numbered filename
(`02-breadcrumb`) for entries that predate it and migrate when next touched.
A component appears once in the codebase and is composed by the layouts, so
changing an implementation changes every page that uses it.

Run `html-render --components` for the same list from the live registry.

---

## In-flow components

These are the ones you invoke, inside a page section, with a fenced block.

### `callout` — Callout

A note box: "Why It Matters", "Watch Out", "Coverage Note" — or an unlabelled
aside when `label` is omitted.

````markdown
```callout
label: Why It Matters
body: Attribution is the hardest integration point.
tone: note
```
````

| Key | | Notes |
|---|---|---|
| `label` | | The uppercase kicker; omit for an unlabelled note |
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
| `howto` | `true` | Marks this block as the source of the page's `HowTo` steps; needs `howto:` in frontmatter (see [markdown-contract.md](markdown-contract.md#format-specific-schema-nodes)) |
| `items` | required, 2+ | Each needs `title` and `body`; badges are numbered in order |
| `items[].id` | | A lowercase anchor for the step (`level-1`); rendered as the step's `id` and used as the `HowToStep` url |

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

### `share-bar` — ShareBar

An inline relative-share bar: a small fill bar plus an optional bold figure.
Its main home is inside a `comparison-table` share cell, where it is composed
by that component; standalone it renders one inline bar.

````markdown
```share-bar
width: 38.2
value: 38.2%
```
````

| Key | | Notes |
|---|---|---|
| `width` | required | Percent of the 70px track — or the bar's own pixel length with `no_track` |
| `value` | | The bold figure beside the bar; omit for a bar-only cell |
| `emphasis` | `default` \| `primary` \| `accent` \| `dim` | Gradient for leaders, blue ramp for mid-tier, gray for trailing |
| `no_track` | `true` \| `false` | Drop the track so the bar's pixel length itself encodes magnitude |

### `comparison-table` — ComparisonTable

A vendor comparison table with a gradient header row and per-column alignment.
It renders structure only: a share cell composes the `share-bar` component
rather than inlining its markup. A plain Markdown pipe table renders the same
table chrome; reach for this block when a cell needs a share bar or a column
needs explicit alignment.

````markdown
```comparison-table
columns:
  - label: Vendor
  - label: Install Share
  - label: YoY Change
    align: center
rows:
  - cells:
      - Salesforce
      - share:
          width: 38.2
          value: 38.2%
      - +3.1pp
```
````

| Key | | Notes |
|---|---|---|
| `columns` | required, 1+ | Each needs `label`; `align` is `left`/`center`/`right` |
| `rows` | required, 1+ | Each row's `cells` line up with the columns in order |
| `cells` | required, 1+ | A bare string is a text cell; `share:` composes a share-bar; `trend:` composes a trend-indicator |

The first cell of each row is styled as the row identity (bold, dark blue).

**The block carries no caption.** The design system removed `caption` from
`ComparisonTable` in the 2026-09-01 export — attribution is to become its own
component rather than a table field. Until it exists, a source line still
reaches a table through the Markdown path: a `Source: …` paragraph directly
after a pipe table becomes that table's caption (see
[markdown-contract.md](markdown-contract.md)). A fenced `comparison-table`
block has no equivalent.

### `trend-indicator` — TrendIndicator

A directional value: the arrow plus the figure. Up is blue, down is melon, flat
is grey; the brand bans green. Its main home is a `comparison-table` cell,
where the table composes it from a `trend:` cell; standalone it renders one
inline span.

````markdown
```trend-indicator
direction: up
value: +3.1pp
```
````

| Key | | Notes |
|---|---|---|
| `direction` | `up` \| `down` \| `flat` | Default `flat` |
| `value` | required | The figure; the arrow glyph is supplied |

### `limitations-cards` — LimitationsCards

A stacked set of named caveats, each with a melon left-border accent. Usually
sits right after a methodology section. The design intends three or more; for a
single caveat use `callout` with `tone: warn`, or `methodology.caveat`.

````markdown
```limitations-cards
items:
  - title: Install share is not revenue share
    body: A technology with broad adoption among smaller companies may show high install share while representing a small fraction of revenue.
  - title: Geographic signal density varies
    body: Coverage is strongest in North America, Western Europe, and Australia.
```
````

| Key | | Notes |
|---|---|---|
| `items` | required, 2+ | Each needs `title` and `body` |

### `key-insights` — KeyInsights

A panel of analyst takeaways: check-icon bullets, each with a bold lead clause,
supporting detail, and an attribution pointing at the exhibit that backs it.
Sits beside a chart or table.

````markdown
```key-insights
title: What the data tells us about the CRM market right now
items:
  - lead: Salesforce is consolidating enterprise dominance.
    text: Install share grew from 35.1% to 38.2% year over year.
    attribution: See primary chart
```
````

| Key | | Notes |
|---|---|---|
| `label` | | The uppercase kicker; defaults to `Analyst Insights` |
| `title` | | Optional heading |
| `items` | required, 1+ | Each needs `text`; `lead` and `attribution` are optional |

### `bar-chart` — BarChart

The card-framed horizontal bar chart that ranks items by one metric, with
`stacked` and `grouped` variants. Pick one variant per page. Pairs naturally
with `key-insights`.

````markdown
```bar-chart
title: CRM Install Share, Enterprise Segment
subtitle: 500+ employees &middot; 47,218 installs
date_badge: Q2 2026
rows:
  - label: Salesforce
    value: 38.2%
  - label: HubSpot
    value: 11.8%
    emphasis: accent
  - label: Other
    value: 7.9%
    emphasis: dim
source: Source: HG Insights &middot; Q2 2026 &middot; 47,218 verified installs
```
````

| Key | | Notes |
|---|---|---|
| `variant` | `single` \| `stacked` \| `grouped` | Default `single` |
| `title` | required | |
| `subtitle` | | The small grey line under the title |
| `date_badge` | | The pill at the top right, e.g. `Q2 2026` |
| `rows` | required, 1+ | Each needs `label`; `value` is the printed figure |
| `rows[].width` | | Single variant: bar width as a percent. Derived from the leading number in `value`, indexed to the largest, when omitted |
| `rows[].emphasis` | `default` \| `accent` \| `dim` | Single variant |
| `rows[].segments` | | Stacked variant: `{ width, series, title? }` per part |
| `rows[].bars` | | Grouped variant: `{ width, series }` per series |
| `legend` | | `{ label, series }`; required for `stacked` and `grouped` |
| `source` | | The footer source line |
| `download_label`, `download_url` | | Both or neither: the data-download link in the footer |

Series are `s1` (gradient), `s2` (blue), `s3` (light blue), and `dim` (gray);
keep them consistent between the bars and the legend.

---

## Page-level components

These are composed by the layouts from frontmatter. You supply their content but
not their position — see [page-layouts.md](page-layouts.md).

| Component | Design source | Fed by |
|---|---|---|
| `breadcrumb` | 02-breadcrumb | `breadcrumbs`, `breadcrumb_label`, `title` |
| `hero` | 03-hero-stat-block | `eyebrow`, `title`, `description`, `pills`, `author`, `hero.*`. Spoke (banded) omits `eyebrow`, `pills`, and `thesis` |
| `article-hero` | 34-editorial-hero (light) | `title`, `author`. Spoke does not render `pills` |
| `freshness-bar` | 04-data-freshness-bar | `freshness`. Spoke always renders it (`Data last updated: {label}`); note, cadence, and link are ignored. Label falls back to a quarter derived from `updated` / `published` |
| `thesis-band` | 31-thesis-block | `hero.thesis` (Cluster only). Spoke (both variants) places `hero.thesis` in the reading column |
| `intro-toc` | 06-hub-intro-toc | `intro`, plus body sections for the nav |
| `side-nav` | 30-sticky-side-nav | `side_nav`, plus body sections for the links; on spoke, also the first `cta.buttons` primary button. The spoke template always composes this rail |
| `resource-index` | 13-data-cut-filters | `resource_index` |
| `related` | 14-spoke-page-cards | `related` |
| `methodology` | 16-methodology-section | `methodology` |
| `faq` | Faq | `faq` |
| `citations` | 60-citations-list | `citations` |
| `cta` | 17-sticky-cta-footer | `cta`. Spoke renders one primary button and omits `links` and `pills` |

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

Set `source` to the export's component name verbatim, and name the CSS block
for the component with **no** number — `/* ---- Figure block ---- */`. Those
two signals are how `html-render --audit <export-dir>` recognises the
component as implemented.

When the change comes from a design-system refresh rather than a one-off need,
start from `--audit` and follow
`.claude/skills/sync-design-components/SKILL.md`, which classifies the whole
export against this registry before anything is written.

`fields` is the input contract. Validation, normalization, escaping, defaults,
and the `--contract` and `--components` output all come from it, so a component
never parses or escapes its own input. The field types are documented at the top
of `src/validate/fields.js`.
