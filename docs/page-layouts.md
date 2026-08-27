# Page layouts

Three page classes, three layouts. A layout decides **which approved components
appear and in what order**. It never re-implements a component, and Markdown
cannot change a layout's composition — only fill it.

Slots marked *(optional)* render only when the matching frontmatter key is
present. Everything else is required by that page class's contract.

---

## Pillar

The parent hub of a Hub / Cluster / Spoke conversation space. Routes readers and
retrieval systems down to every cluster and key spoke.

```
breadcrumb
hero                        gradient band: eyebrow, H1, lead, pills, thesis,
                            byline, freshness badge, coverage, stat grid
freshness-bar               (optional)
intro-toc                   intro copy + sticky jump nav
article-body-section
  main-col                  every "##" section, separated by section rules,
                            in the narrow 780px article column with
                            left-aligned section headers
  side-nav                  sticky right-rail nav with scroll-spy
methodology                 (optional)
faq
citations                   (optional)
related                     (optional)
cta
```

Notes:

- The hero renders `hero.thesis` inside itself.
- The jump nav and the side nav are both derived from the body sections, so they
  cannot drift from the page. Supply `intro.toc` to override.
- All body copy must sit inside `##` sections; copy before the first heading is
  rejected.

---

## Cluster

The sub-hub and domain router between a Pillar and its spokes. Defines one
domain and indexes every spoke beneath it.

```
breadcrumb
hero                        gradient band, without the thesis
thesis-band                 (optional) full-width band carrying hero.thesis
intro-toc
section rule
first "##" section          full-width band, centred section header
section rule
resource-index              the card grid indexing every spoke
section rule
remaining "##" sections     full-width bands, alternating white / tinted
methodology                 (optional)
faq
citations                   (optional)
related                     (optional)
cta
```

Notes:

- **The resource index sits immediately after the first body section.** That is
  where the approved design puts it: the page states its scope, then indexes the
  spokes. The position is fixed, not authored.
- `hero.thesis` renders as its own band rather than inside the hero, matching the
  approved cluster design.
- `###` headings become grouping blocks — a heavy sub-heading with its copy and
  any card grid beneath it.
- Section bands alternate automatically; `band:` in a `section` block overrides.

---

## Spoke

One conversation inside a cluster. The approved designs contain two legitimate
variants, chosen with `layout:` in frontmatter.

### `layout: article` (default)

Light article hero, then one flowing narrow column. Used by definition,
glossary, comparison, and decision-tree spokes.

```
breadcrumb                  (omitted when standalone: true)
article-hero                H1 + byline + pills on white
article-body
  thesis block              (optional) from hero.thesis
  lead copy                 (optional) any body copy before the first "##"
  "##" sections             separated by section rules
methodology                 (optional)
faq
citations                   (optional)
related
cta
```

This variant has no gradient hero, no stat grid, and no side nav. Supplying
`hero.stats` is an error that points you at `layout: banded`.

A spoke in either variant may declare `standalone: true` — a page with no
parent hub. It renders no breadcrumb bar and emits no `BreadcrumbList` and no
`Article.isPartOf`. `breadcrumbs` (and `breadcrumb_label`) must then be absent;
supplying them alongside `standalone: true` is an error. The trail is never
invented.

### `layout: banded`

Gradient stat hero, then full-width alternating section bands. Used by
methodology, benchmark-report, and reporting-framework spokes.

```
breadcrumb                  (omitted when standalone: true)
hero                        gradient band with the stat grid
freshness-bar               (optional)
intro-toc                   (optional)
"##" sections               full-width bands, alternating white / tinted,
                            left-aligned section headers
methodology                 (optional)
faq
citations                   (optional)
related
cta
```

### Mapping the GEO spoke formats onto the two variants

The eleven GEO spoke formats are content formats, not layouts. They map onto the
two approved variants like this:

| Spoke format | Variant | Why |
|---|---|---|
| Glossary / definition | `article` | Leads with a definition block, reads as one article |
| Comparison | `article` | Built around a comparison matrix inside flowing copy |
| Decision tree | `article` | Sequential prose gates |
| Data dictionary | `article` | A long field table inside flowing copy |
| Listicle | `article` | Parallel numbered items |
| Solution brief | `article` | Problem / solution passages |
| Methodology | `banded` | Stat hero plus distinct framework stages |
| Benchmark report | `banded` | Leads with proprietary numbers |
| Evaluation guide | `banded` | Distinct scoring, red-flag, and ROI zones |
| Integration blueprint | `banded` | Distinct architecture and deployment zones |
| Pillar guide (spoke) | `banded` | Long, with clearly separated sub-topics |

Record the format itself in `eyebrow` and in the `tag` of the cards that link to
the page. It is a label, not a layout.

---

## Shared rules

- **Body only.** No `<html>`, `<head>`, site navigation, host theme markup,
  or site footer. The output is one `<div>` — with the configured `pageClass`,
  `render-page` by default — plus the scoped
  stylesheet, JSON-LD, and behaviour script it contains.
- **Anchors.** `hero`, `overview`, `resource-index`, `methodology`, `faq`,
  `citations`, `related`, and `cta` are reserved for the page slots. Body
  sections take the `id` from their `section` block, or an anchor derived from
  the heading.
- **Determinism.** Band alternation, anchors, bar widths, stat-card emphasis,
  citation numbering, and the JSON-LD graph are all pure functions of the input.
