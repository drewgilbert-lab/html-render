# html-render

Deterministic Markdown-to-HTML page-body renderer.

Structured Markdown in → an approved design-system HTML page body out, ready to
drop into an existing page container on whatever site publishes it. No `<html>`,
no `<head>`, no site chrome: the fragment only.

```text
renderer-ready .md file
        ↓  parse Markdown
        ↓  identify Pillar / Cluster / Spoke
        ↓  validate against that page class's contract
        ↓  map structured content to approved components
        ↓  assemble the approved page layout
        ↓  render deterministic HTML
finished .html body file
```

No language model runs at render time. Given the same Markdown and the same
renderer version, the output bytes are identical.

---

## Quick start

No install step and no dependencies — Node 18 or newer is all it needs.

```bash
node bin/html-render.js examples/pillar.md --config examples/html-render.config.json --out-dir output
```

The `--config` file supplies the organization the page is published by. There is
no built-in one — see [Configuring for your project](#configuring-for-your-project).

Render all three examples and write browser-reviewable previews alongside them:

```bash
npm run render:examples
```

Validate without writing anything:

```bash
npm run check
```

Run the tests:

```bash
npm test
```

---

## CLI

```text
html-render <input.md> [more.md ...] [options]

      --config <file>    organization and renderer settings (default: ./html-render.config.json)
  -o, --out <file>       write a single input to this file
      --out-dir <dir>    write each input to <dir>/<name>.html
      --check            validate only; write nothing
      --stdout           print the HTML instead of writing a file
      --preview          also write <name>.preview.html for browser review
      --no-styles        omit the <style> block (load the CSS site-wide instead)
      --no-script        omit the FAQ / side-nav behaviour script
      --no-schema        omit the JSON-LD block
      --no-font          omit the configured webfont @import
      --contract <type>  print the Markdown contract for pillar|cluster|spoke
      --components       list every available component
      --audit <dir>      classify a design-web-components catalog against the registry
  -h, --help
```

As a library:

```js
const { render, renderFile, parseDocument } = require('./src/index');

const { html, meta, pageType, layout } = renderFile('examples/spoke.md', {
  config: 'examples/html-render.config.json',   // or the config object itself
});
```

---

## What the output looks like

One comment header carrying the values the publishing site needs in its own
fields, followed by a single `<div>`:

```html
<!-- ==========================================================================
     Example Corp page body - html-render v1.1.0

     Page type        spoke (article layout)
     Title            What Is Share of Voice in AI Search? ...
     Meta description AI Share of Voice is the percentage of ...
     Canonical URL    https://example.com/.../share-of-voice/
     Published        2026-08-11    Updated  2026-08-11
     Body             3 sections, ~1323 words

     Paste this whole block into the target page container. It contains no
     <html>, <head>, site navigation, or footer - page body only.
     ========================================================================== -->
<div class="render-page" data-page-type="spoke">
  <style> /* the scoped design system stylesheet */ </style>
  <nav class="breadcrumb-bar"> ... </nav>
  ...
  <script type="application/ld+json"> /* Article, FAQPage, BreadcrumbList, HowTo, Dataset, ... */ </script>
  <script> /* FAQ disclosure + side-nav scroll spy */ </script>
</div>
```

The organization named in that header, and in the JSON-LD, is the one from your
config — the renderer has no default.

Deliberately **not** included: `<html>`, `<head>`, global site navigation, host
theme markup, CMS wrappers, or a site footer.

Notes for whoever places the page:

- The stylesheet is scoped to the wrapper class (`.render-page` unless `pageClass`
  says otherwise), so it cannot touch the host site's styles. If the design
  system CSS is already loaded site-wide, render with `--no-styles`.
- The configured `fontHref` webfont comes in as an `@import` at the top of that
  stylesheet. Use `--no-font` if the site already loads it; configure no
  `fontHref` and nothing is linked at all.
- The script is progressive enhancement only. Without it the FAQ shows its first
  answer open and the side nav still navigates.
- Every link supplied in the Markdown is preserved exactly as written.

---

## Configuring for your project

Nothing about a consumer — who publishes the page, what the wrapper class is
called, which webfont to link — lives in the renderer's source. It comes from a
JSON config file:

```json
{
  "organization": {
    "name": "Example Corp",
    "url": "https://example.com/",
    "logo": "https://example.com/logo.png",
    "sameAs": ["https://www.linkedin.com/company/example/"]
  },
  "pageClass": "example-page",
  "language": "en-US",
  "fontHref": "https://fonts.googleapis.com/css2?family=Inter&display=swap"
}
```

```bash
node bin/html-render.js page.md --config example.config.json --out-dir output
```

Precedence, highest first:

1. `render(source, { config })` — a config object, or a path to one (library use).
2. `--config <file>` on the CLI.
3. `./html-render.config.json` in the working directory, if there is one.
4. The defaults below — for everything except `organization`.

| Key | Required | Default |
|---|---|---|
| `organization.name`, `organization.url` | **yes** | none — the render fails |
| `organization.id` | no | `<url>/#organization` |
| `organization.logo`, `organization.sameAs` | no | absent from the graph |
| `pageClass` | no | `render-page` |
| `language` | no | `en-US` |
| `fontHref` | no | none linked |

**`organization` has no default on purpose.** It becomes the `Organization` node
and the Article's `publisher` in every page's JSON-LD, so a built-in one would
mean shipping somebody else's identity inside your own structured data — wrong in
a way nothing on the page shows. Render without it and you get an error naming
what is missing, not a placeholder. `--no-schema` emits no structured data and
needs no organization at all.

`logo` and `sameAs` are optional and simply absent from the graph when unset;
`id` is derived from `url` by JSON-LD convention. Unknown keys are an error
rather than a silent typo, and `pageClass` must be a valid CSS class name, since
it is interpolated into the stylesheet, the script, and an attribute.

**`pageClass` is the one place the wrapper class name lives.** `src/assets/styles.css`
and `src/assets/script.js` are scoped to it but never spell it out: both carry the
placeholder `__page_class__`, and the renderer substitutes the configured class
into them on the way out. A string swap, not a build step — this repo has no
toolchain and no dependencies, and configuration is not a reason to acquire
either. Anything copied out of `src/assets/` by hand (loading the CSS site-wide,
say) needs that substitution done to it too.

This repo's own examples are configured by
[`examples/html-render.config.json`](examples/html-render.config.json), which
`npm run render:examples` and `npm run check` pass with `--config`. It is the
only file here that carries a specific organization's data.

---

## Documentation

| Document | What it covers |
|---|---|
| [docs/markdown-contract.md](docs/markdown-contract.md) | The full input contract: frontmatter keys, body syntax, and every validation error |
| [docs/page-layouts.md](docs/page-layouts.md) | What each of the three layouts composes, in order, and the two Spoke variants |
| [docs/component-library.md](docs/component-library.md) | Every component, its inputs, and the design-system component it implements |
| [docs/github-process.md](docs/github-process.md) | Branch/PR rules, commit conventions, and the tag/release sequence for this repo |
| [docs/component-sync.md](docs/component-sync.md) | How a tagged release ships the contract to `geo-spoke-builder`, and how to test it |
| [docs/open-items.md](docs/open-items.md) | What is outstanding, why, and what unblocks it |
| [CHANGELOG.md](CHANGELOG.md) | What changed in component coverage, and why, per catalog refresh |

`examples/pillar.md`, `examples/cluster.md`, `examples/spoke.md`, and
`examples/spoke-banded.md` are the working reference for valid input, rendered against
`examples/html-render.config.json`. `output/` holds their rendered HTML plus a
`.preview.html` wrapper for each, for visual review against the design. A test
asserts the committed output still matches a fresh render, so it cannot go stale.

---

## Keeping up with the design system

Every component here implements one component from the `design-web-components`
catalog, and names it in a `source` field. When that catalog is refreshed, ask
what this renderer is now missing:

```bash
node bin/html-render.js --audit /path/to/design-web-components
```

That classifies all 52 catalogued components against the live registry:

- **New** — catalogued, not implemented here.
- **Removed** — implemented here, gone from the catalog.
- **Out of scope by design** — site chrome and print/PDF chrome, which this
  renderer does not emit. Not gaps; the reasons live in `OUT_OF_SCOPE` in
  `src/audit.js`.
- **Covered, but the catalog says something moved** — the review queue.
- **Covered** — everything else.

Coverage is read from live state, not a hand-kept list: it joins each registry
entry's `source` against the numbered CSS block headers in `styles.css`. That is
why a new CSS block must carry its component number —
`/* ---- Figure block (53) ---- */`.

**Changed is deliberately not classified automatically.** Deciding it needs a
semantic comparison of HTML, CSS, and field contracts, so the audit surfaces
candidates from the catalog's own refresh notes and leaves the judgment to you.

The full procedure — confirm the source, diff, resolve ambiguity *before*
implementing, one component at a time, cross-check the consumer manifests,
record, verify — is
[.claude/skills/sync-design-components](.claude/skills/sync-design-components/SKILL.md),
runnable as `/sync-design-components`. Each run appends to
[CHANGELOG.md](CHANGELOG.md), which is what the next run diffs against.

---

## Supported page classes

| Page class | Role | Layout |
|---|---|---|
| **Pillar** | Parent hub of a conversation space; routes down to every cluster | Gradient hero → intro + TOC → narrow article column with sticky side nav |
| **Cluster** | Domain router; defines one domain and indexes its spokes | Gradient hero → intro + TOC → scope section → resource index → alternating section bands |
| **Spoke** | One conversation inside a cluster | `article` (light hero, flowing column) or `banded` (stat hero, alternating bands) |

The two Spoke variants are the two legitimate variants present in the supplied
designs; the eleven GEO spoke *formats* map onto them as content formats, not
layouts. See [docs/page-layouts.md](docs/page-layouts.md).

---

## How it is put together

```text
bin/html-render.js         CLI
src/
  index.js                 the pipeline: parse -> validate -> layout -> HTML
  config.js                configuration: loading, defaults, and validation
  html.js                  escaping and element primitives
  schema.js                the JSON-LD graph (Article/TechArticle/CollectionPage root, HowTo,
                           ItemList, Dataset, Service, DefinedTermSet, SoftwareApplication)
  describe.js              --contract output, generated from the live contracts
  audit.js                 --audit output: catalog coverage, from the live registry
  parse/
    yaml.js                the frontmatter YAML subset, with line tracking
    markdown.js            the renderer's Markdown dialect
  validate/
    fields.js              the declarative input-contract engine
    document-contract.js   the frontmatter contract, per page class
    validate.js            validation and cross-checks
  components/
    blocks.js              in-flow components (author-invokable)
    page.js                page-level components (layout-composed)
    index.js               the registry
  layouts/
    pillar.js cluster.js spoke.js
    section-body.js        shared body-block rendering
    assemble.js            frontmatter -> component inputs
  assets/
    styles.css             the design system stylesheet, scoped to pageClass
    script.js              FAQ disclosure + scroll spy
examples/                  pillar.md, cluster.md, spoke.md, spoke-banded.md + this repo's config
output/                    rendered examples + preview wrappers
test/                      137 tests
docs/                      the contracts
CHANGELOG.md               component coverage, per catalog refresh
.claude/skills/            the design-system sync procedure
```

Two rules hold the architecture together:

1. **A component is implemented once.** Layouts choose which components appear
   and in what order; they never re-implement one. Changing
   `src/components/blocks.js` or `page.js` changes every page that uses that
   component.
2. **A component's `fields` map is its contract.** Validation, normalization,
   escaping, defaults, and the `--contract` / `--components` output are all
   generated from it, so a component never parses or escapes its own input and a
   contract cannot drift from the implementation.

---

## Scope

V1 is only the rendering layer.

**In scope:** parse renderer-ready Markdown, validate it, and render the
approved Pillar / Cluster / Spoke page bodies.

**Out of scope:** content generation, converting other tools' output into
renderer Markdown, workflow orchestration, research, AI-generated content or
HTML, CMS publishing, and deployment. The long-term shape is:

```text
content-generation upstream → renderer-ready Markdown → html-render → HTML page body → CMS
```

`html-render` is the third box only. It renders; it does not generate, orchestrate,
or publish.

Its one outbound dependency is the contract sync: a tagged release opens a pull
request into `geo-spoke-builder` updating a single generated reference file. It
writes nothing else there, and never merges — see
[docs/component-sync.md](docs/component-sync.md).

The design comes from the `design-web-components` catalog — the `--hg-*` token
set and the catalogued components it defines. Each CSS block in
`src/assets/styles.css` and each component's `source` field names the design
system component it implements.
