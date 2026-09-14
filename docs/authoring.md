# Authoring a document

`html-render` has no page classes. A document is frontmatter plus a body, and
**the body renders in the order it is written**. Nothing in this renderer
decides what a page should contain or where its parts belong; that belongs to
whatever writes the Markdown.

Run `html-render --components` for the catalog: every component, both regions,
and the frontmatter keys, each with its fields. That output is generated from
the live registry, so it cannot drift. This file explains the shape; the
catalog is the reference.

---

## The split

| | Holds |
| --- | --- |
| **Frontmatter** | Only what has no pixels: `title`, `url`, `description`, `published`, `updated`, the provenance stamps, and the JSON-LD nodes with no visible form — `article`, `term`, `term_set`, `howto`, `item_list`, `dataset`, `service`, `software`. |
| **Body** | Everything visible, as fenced component blocks and `:::` regions, in render order. |

Keys the renderer does not know are ignored, not rejected, so a document may
carry whatever else its pipeline needs.

The graph reads the rest from the body: the author from a `hero` or
`article-hero`, the questions from an `faq`, the trail from a `breadcrumb`, the
index from a `resource-index` or the `link-card` blocks. It cannot claim a
byline, a question, or a trail the page does not show.

---

## Components

Place one with a fenced block naming it. Its fields are YAML.

````markdown
```callout
label: Why It Matters
body: Contextual intent eliminates false positives from shared IP addresses.
```
````

Every component renders what it is given and omits what it is not. None of them
require anything: a `cta` with no buttons renders the band without buttons. If a
page needs a field the component does not have, that is a renderer gap — raise
it rather than inlining HTML, which the body does not accept.

---

## Regions

A region wraps what is inside it. Open with `:::name`, close with `:::`.
Attributes go on the lines directly after the opener and end at the first blank
line. Regions nest.

### `:::section`

A section. With no `band` it paints nothing — the reading-column form. `band:
white` and `band: tinted` are the two full-width page bands. `container: true`
insets the content in the centred column.

````markdown
:::section
id: formula
band: tinted

## How Is Share of Voice Calculated?

Copy, blocks, tables — anything.
:::
````

The region owns the anchor. Two adjacent tinted bands are allowed: the renderer
no longer overrides the author's choice, so alternate them deliberately.

### `:::two-column`

The reading column plus its rail. A `side-nav` inside the region becomes the
rail; everything else becomes the column. `variant` picks the grid — `spoke`
(default, wide), `article` (narrow), or `reading` (wide, prose measure).

````markdown
:::two-column
variant: reading

:::section
id: definition

## What Does It Measure?

Copy.
:::

```side-nav
label: On this page
items:
  - label: What It Measures
    anchor: definition
```
:::
````

---

## Headings and prose

`##` renders an `h2`. A fenced `section` block directly after one annotates it
with an `eyebrow` or `subtitle`. `###` renders an `h3`. A single `#` is refused
— the page name is frontmatter `title`.

Paragraphs, bullet and numbered lists, `---` rules, GFM pipe tables, and `>`
blockquotes (which become the thesis block) all render without a component. A
`Source:` paragraph directly after a table becomes its caption. `[^n]` in copy
renders a superscript reference; a `[^n]:` definition line is dropped, since the
`citations` component is what renders the list.

---

## What the renderer refuses

Only what it cannot draw:

- a component that is not in the registry, named alongside the ones that are
- a region with no wrapper, likewise
- a field whose shape cannot be used — a scalar where it iterates, a URL that is
  not a link target, an enum value outside its set
- an unbalanced `:::` region, unparseable YAML, an unterminated fence

Everything else renders. A page with no FAQ, or two CTAs, or a dangling citation
marker, is the author's business — check it with `geo-lint` or the authoring
skill's own rules, not here.

---

## Worked examples

`examples/` carries five documents, rendered into `output/`:

| | |
| --- | --- |
| `spoke.md` | Light article hero, reading column, rail, citations |
| `spoke-banded.md` | Gradient stat hero, banded sections, methodology, HowTo schema |
| `pillar.md` | Narrow column, link-cards indexed as an `ItemList` |
| `cluster.md` | Banded sections around a `resource-index`, `CollectionPage` root |
| `body-order.md` | The smallest complete document |

```bash
npm run render:examples
```
