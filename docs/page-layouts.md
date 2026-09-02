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

Light article hero, then a reading column plus a sticky right-rail nav. Used by
glossary / definition spokes.

```
breadcrumb                  (omitted when standalone: true)
article-hero                H1 + byline on white (no pills)
freshness-bar               always; `Data last updated: {label}`
spoke-body-section
  spoke-col article-body    thesis? + lead copy? + "##" sections
                            (no section rules)
  side-nav                  sticky right-rail nav with scroll-spy;
                            footer Request a Demo from cta primary
methodology                 (optional)
faq
citations                   (optional)
related
cta                         single primary button
```

This variant has no gradient hero and no stat grid. Supplying `hero.stats` is an
error that points you at `layout: banded`. The rail is always present; authors
may set optional `side_nav.label` / `side_nav.note` and optional `intro.toc` to
control the link list (there is no visible jump nav). `pills` is accepted but
not rendered. The freshness bar always sits under the article hero: `freshness.label`
if supplied, otherwise a quarter derived from `updated` (else `published`).
`cta.buttons` allows one entry; secondary buttons, `cta.links`, and `cta.pills`
are not rendered. `hero.thesis` sits at the top of the reading column.

A spoke in either variant may declare `standalone: true` — a page with no
parent hub. It renders no breadcrumb bar and emits no `BreadcrumbList` and no
`Article.isPartOf`. `breadcrumbs` (and `breadcrumb_label`) must then be absent;
supplying them alongside `standalone: true` is an error. The trail is never
invented.

### `layout: banded`

Gradient stat hero, then alternating section bands in the reading column plus
the same right-rail nav. Used by methodology, benchmark-report, and
reporting-framework spokes (and every remaining GEO format — see the mapping
table).

```
breadcrumb                  (omitted when standalone: true)
hero                        gradient band with the stat grid; no eyebrow,
                            pills, or thesis
freshness-bar               always; `Data last updated: {label}`
intro copy                  (optional) eyebrow, title, body; no jump-nav column
spoke-body-section
  spoke-col                 thesis? then "##" sections as bands, alternating
                            white / tinted, left-aligned section headers, not
                            full-bleed under the rail
  side-nav                  sticky right-rail nav with scroll-spy;
                            footer Request a Demo from cta primary
methodology                 (optional)
faq
citations                   (optional)
related
cta                         single primary button
```

The rail is the only on-page section nav. `intro.toc`, when supplied, feeds the
rail's link list rather than a visible hub-toc. Intro copy stays when `intro` is
present. `pills` and the page `eyebrow` are accepted but not rendered in the
hero. `hero.thesis` sits at the top of the reading column, not inside the hero.
The freshness bar always sits under the hero: `freshness.label` if supplied,
otherwise a quarter derived from `updated` (else `published`); note, cadence,
and methodology link are ignored. `cta.buttons` allows one entry. Tinted bands
inset text from the gray edge with the same horizontal padding as white bands.
There are no section-rule hairlines between body sections.

### Mapping the GEO spoke formats onto the two variants

The eleven GEO spoke formats are content formats, not layouts. The choice turns
on one question: does the format open with a stat hero (a headline metric in a
stat card, a freshness bar) or with a definition that flows straight into copy?
Every format whose design specification opens with the stat hero is `banded`;
only the glossary opens on the light article hero. Both variants include the
sticky side nav.

| Spoke format | Variant | Why |
|---|---|---|
| Glossary / definition | `article` | Leads with a definition block, reads as one article; no stat card |
| Comparison | `banded` | Opens with the headline differentiating metric and a freshness bar; the matrix sits in its own band |
| Decision tree | `banded` | The gate thresholds ride in the hero's stat cards; gates are sequential bands |
| Data dictionary | `banded` | Schema-coverage stat hero, freshness bar, rail links to the field table |
| Listicle | `banded` | Headline metric in the hero, rail with one link per item |
| Solution brief | `banded` | The vertical's headline stat leads; problem / solution bands follow |
| Methodology | `banded` | Stat hero plus distinct framework stages |
| Benchmark report | `banded` | Leads with proprietary numbers |
| Evaluation guide | `banded` | Distinct scoring, red-flag, and ROI zones |
| Integration blueprint | `banded` | Distinct architecture and deployment zones |
| Pillar guide (spoke) | `banded` | Long, with clearly separated sub-topics and a side-nav rail |

Record the format itself in `eyebrow` and in the `tag` of the cards that link to
the page. It is a label, not a layout. (Until v1.5.0 this table mapped five of
the `banded` rows to `article`; the consumer skills' own design specifications
open every one of them with the stat hero, so the table now follows the
specifications rather than the page name.)

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

---

## The JSON-LD graph

Every page carries one `<script type="application/ld+json">` with an `@graph`.
Nothing in it is authored by hand: every node is built from frontmatter, the
`--config` organization, and, for the two derived lists, the body.

| Node | Present when | Built from |
|---|---|---|
| `Organization` | always | `--config` `organization` (name, url, id, logo, sameAs) |
| `Person` | always | `author` (`knows_about` → `knowsAbout`) |
| `Article` | always, unless `article.type` says otherwise | `title`, `description`, dates, `author`; `isPartOf` → the last breadcrumb |
| `TechArticle` | `article.type: TechArticle` | as `Article`, plus `proficiency_level`, `dependencies` |
| `CollectionPage` | `article.type: CollectionPage` | as `Article` (with `name` and `url` in place of `headline` and `mainEntityOfPage`); `mainEntity` → the page's index |
| `BreadcrumbList` | `breadcrumbs` present (never on a standalone spoke) | `breadcrumbs`, `breadcrumb_label` |
| `FAQPage` | always | `faq.items`, verbatim |
| `DefinedTerm` (+ `inDefinedTermSet`) | `term` | `term` |
| `DefinedTermSet` with nested `DefinedTerm`s | `term_set` | `term_set.terms` |
| `HowTo` with `HowToStep`s | `howto` | `howto`, plus the ```` ```process-steps ```` block flagged `howto: true` |
| `ItemList` (`#list`) | `item_list` | `item_list.items` |
| `Dataset` (+ `DataCatalog`) | `dataset` | `dataset`, `dataset.catalog` |
| `Service` (+ `Audience`, `OfferCatalog`) | `service` | `service` |
| `SoftwareApplication` | `software` | one per entry |
| `ItemList` (`#spokes`) | cluster | `resource_index.items`, with each card's description |
| `ItemList` (`#index`) | pillar with ```` ```link-card ```` blocks | the link-cards, in body order; in-production cards carry no URL |

The root node points at what the page is about: `about` for an `Article` or
`TechArticle`, `mainEntity` for a `CollectionPage`. The target is the first of
`term`, `term_set`, `dataset`, `item_list`, `service`, `software[0]` the page
declares; a `CollectionPage` prefers its own index (`#spokes` or `#index`) when
it has one. Every `@id` is a fragment on the page URL, so the graph resolves
across pages without any author-chosen identifiers.
