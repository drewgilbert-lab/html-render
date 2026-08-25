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
faq:
  title: Common questions about ...
  items:
    - q: A question phrased the way a buyer would ask it
      a: The answer.
cta:
  title: The closing call to action
  body: One sentence of supporting copy.
  buttons:
    - label: Book a Demo
      url: https://hginsights.com/demo
```

`eyebrow` is also required on Pillar and Cluster pages. Pillar and Cluster
additionally require `hero.stats` and `intro`; Cluster requires
`resource_index`; Spoke requires `related`.

### Optional on every page

```yaml
updated: 2026-08-11            # defaults to `published`
eyebrow: GEO Measurement Guide # uppercase kicker above the H1
breadcrumb_label: A shorter label for the current page in the trail
pills:                         # small status pills under the lead
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
freshness:                     # the dark band under the hero
  label: Q3 2026
  note: What the figures reflect
  cadence: How often they refresh
  link_text: See how these figures are tracked
  link_url: "#faq"
intro:                         # the two-column intro + jump nav
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

### Page-class-specific keys

| Key | Page class | Required | What it does |
|---|---|---|---|
| `hero.stats` | pillar, cluster, banded spoke | yes | The stat-card grid in the gradient hero |
| `intro` | pillar, cluster | yes | Intro copy plus the sticky jump nav |
| `side_nav` | pillar | no | `label` and `note` for the right-rail nav; its links are derived |
| `resource_index` | cluster | yes | The card grid indexing every spoke in the cluster |
| `related` | spoke | yes | The closing cross-link band |
| `layout` | spoke | no | `article` (default) or `banded` — see [page-layouts.md](page-layouts.md) |

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
| Body copy before the first `##` on a Pillar or Cluster | The line it starts on |

Every problem in the file is reported at once, so one pass gets you a clean run.
