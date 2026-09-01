# Changelog

What changed in the renderer's component coverage, and why. Modeled on the "Refresh history"
pattern in the `design-web-components` catalog's own `SKILL.md`.

Entries are appended, never rewritten. Each one records the state of this renderer against a
specific catalog refresh, so the next sync has a concrete point to diff from. The sync procedure
itself is `.claude/skills/sync-design-components/SKILL.md`; run
`html-render --audit <catalog-dir>` to regenerate the current picture at any time.

---

## v1.4.0 — 2026-09-01, against Claude Design export build `HGInsightsMarketingDesignSystem_3bf70b`

First sync against the **2026-09-01 recompile** of the Claude Design export (staged as
`HG Insights Marketing Design System 9-1`). Two components changed; no New components taken —
Drew's scope call, 2026-09-01, with 53 still unimplemented (`--audit` for the live list).

**The manifest `namespace` did not change across the recompile.** Nine component files,
`css/navigation.css`, `readme.md`, `_adherence.oxlintrc.json` and `_ds_bundle.js` all differ from
the build v1.2.0 and v1.3.0 synced against, yet the namespace is still
`HGInsightsMarketingDesignSystem_3bf70b`. The suffix was adopted as the build identity precisely
because it was believed to change on recompile; it does not. `designCatalog.syncedAt` is the only
field that moves this release, so the two exports are indistinguishable by `build` alone. Recorded
in [open-items.md](docs/open-items.md) §4.

- **Changed** `faq` (`Faq`) — the export turned the FAQ from an accordion into a **static
  two-column Q&A list**. Every answer renders expanded, `button.faq-question` +
  `span.faq-icon` become a plain `h3.faq-question`, and `faq-item open` / `aria-expanded` are
  gone. `script.js` lost the FAQ click handler — it had nothing left to toggle — and now carries
  only the side-nav scroll spy. CSS ported verbatim from the export's `css/navigation.css`
  (found by searching `globalCssPaths`, not by the `components/navigation/` folder name):
  `.faq-question` drops `background`/`border`/`cursor` and repads to `28px 0 12px`, `.faq-answer`
  becomes `display: block`, and `.faq-question:hover`, `.faq-question .faq-icon` and the three
  `.faq-item.open` rules are deleted, as the export deleted them. Taken as a deliberate, finished
  redesign: the `.jsx`, `.d.ts`, `.prompt.md`, CSS and the readme's "Web only" list all changed
  coherently, and the readme also dropped the `+`-rotates-into-`×` glyph from its approved set.
  **Rendered output changes**: six FAQ items per pillar page lose a `+` glyph, so the comment
  header's word count drops accordingly (2425 → 2419 on `output/pillar.html`).
- **Changed** `comparison-table` (`ComparisonTable`) — **BREAKING: the `caption` field is
  removed.** A page passing `caption:` to the block now fails validation on an unknown field.
  The export removed `caption` from the component's `.jsx`, `.d.ts` and `.prompt.md`. The
  evidence was mixed and the call was Drew's (2026-09-01): citation should not be a table field
  right now, and becomes its own component later. Mixed because the same recompile left
  `.table-caption` orphaned in `css/tables.css` and deleted the readme's entire "Content
  fundamentals" section — the doctrine that had mandated `figure · segment · period · n` on every
  exhibit. `.table-caption` **stays** in `styles.css`: the Markdown path still emits it, where a
  `Source: …` paragraph directly after a pipe table becomes that table's caption. That affordance
  is this renderer's own, not a design-system prop, and is untouched — so a source line can still
  reach a table, just not through the fenced block.
- **Not synced** the same `source`/`caption` prop removal on `CohortCompare`, `CohortSwitcher`,
  `InteractiveTable`, `TechStackLayers` and `VendorProfile`. None is implemented here, so there
  was nothing to change; noted so the next sync does not read their absence as an oversight.
- **Not synced** `Button.prompt.md`'s changed usage example (`Explore Free →` → `Book a Demo`).
  Documentation-only in the export, and `Button` is not implemented here.
- **Migration** both touched components adopted the named convention: `faq`'s source
  `15-faq-accordion` → `Faq` and its CSS header `FAQ accordion (15)` → `Faq section`.
  `--audit` legacy entries fall 46 → 44 and covered rises 4 → 5.
- **Fixture** `test/fixtures/design-export-sample/`'s `ComparisonTable` triad is verbatim from the
  new export again — the caption removal was its only drift. Its `css/tables.css` deliberately
  keeps the now-orphaned `.table-caption` rule, mirroring the real export.

**Consumer note (breaking: yes for page authors; published contract: unchanged).** The generated
contract file is byte-identical to the copy in `geo-spoke-builder` apart from its `version=` /
`commit=` stamp — verified by regenerating it and diffing. `caption` was never published to
consumers: the contract lists in-flow blocks by summary and design source, not by field, and
`faq`'s frontmatter fields did not change. The break is therefore confined to hand-authored
Markdown, and `docs/component-library.md` — a doc `geo-spoke-builder` skills do read — is where
the field was documented. No page, example, or test in either repo passed `caption:` to the block.
`create-glossary-spoke`, the one migrated consumer skill, sources its table captions from the
Markdown path and is unaffected.

---

## v1.3.0 — 2026-08-26, against Claude Design export build `HGInsightsMarketingDesignSystem_3bf70b`

Contract extensions and one component change, all driven by the gap report from
`geo-spoke-builder`'s first skill migration (`create-glossary-spoke`, its PR #24) — the first
consumer-reported release. No catalog refresh; the export build is unchanged from v1.2.0.

- **New** `standalone: true` (spoke frontmatter) — a page with no parent hub. Renders no
  breadcrumb bar; emits no `BreadcrumbList` and no `Article.isPartOf`. `breadcrumbs` and
  `breadcrumb_label` must then be absent (each is rejected with its own error). Unblocks the
  consumer's standalone and rebuild-existing run modes, which its `geo-standards.md` §1.4
  forbids from carrying an invented trail.
- **New** `author.knows_about` (list) — feeds `Person.knowsAbout` in the schema graph; never
  rendered visibly. Restores parity with the consumer's pre-pipeline hand-built pages.
- **New** `page_skill_version` / `component_library_version` (optional top-level frontmatter) —
  provenance carried into the rendered output's comment header as `Skill version` /
  `Library version` rows, so a page traces back to exactly what produced it.
- **Changed** `citations` — the source–title separator is now `: ` instead of a visible
  `&mdash;`. The consumer's `geo-standards.md` §3.6 bans em/en dashes in rendered output, and
  its pre-pipeline pages used a colon here. The behaviour script's header comment also lost
  its em dash. Rendered output now contains no dash characters or entities of its own.

**Consumer note (breaking: no; changed output: yes).** Every citations entry's visible
separator changes, and previously-rejected keys (`standalone`, `knows_about`,
`page_skill_version`, `component_library_version`) now validate. Pages that passed `--check`
under v1.2.0 still pass unchanged.

---

## v1.2.0 — 2026-08-26, against Claude Design export build `HGInsightsMarketingDesignSystem_3bf70b`

First sync against a **Claude Design export** — the compiled folder that replaces the retired
`design-web-components` catalog. Components are now identified by manifest name, not number.

- **New** `figure` (`Figure`) — image/diagram with optional italic caption, or the dashed
  `[IMAGE NEEDED]` draft placeholder. Closes the largest consumer gap (10 skills named it).
- **New** `share-bar` (`ShareBar`) — inline relative-share bar. This resolves the long-standing
  cell-primitive syntax question for share bars: standalone as a fenced block, and composed inside
  `comparison-table` share cells. Its CSS lives in the export's `css/charts.css`, not a `data.css`.
- **New** `comparison-table` (`ComparisonTable`) — fenced block with per-column alignment and a
  caption; renders structure only, composing `share-bar` in share cells per the export's own
  guidance. Markdown pipe tables keep emitting the same table chrome; the block adds alignment and
  share-cell composition. The existing CSS block gained the export's tbody hover transition and
  `vendor-name` `white-space: nowrap`.
- **Changed** `callout` (`Callout`) — `label` is now optional (the export's contract), rendering an
  unlabelled note when omitted; loosening only, nothing existing breaks. Body line-height moved
  from a literal `1.55` to the export's `var(--lh-body)` (1.4). The multi-paragraph body margins
  remain a deliberate renderer transformation.
- **Tooling** `--audit` now reads an export's `_ds_manifest.json` and joins `components[].name`
  against verbatim registry `source` names and unnumbered named CSS headers. Pre-export entries
  still carry the retired numbered convention and are reported in a "Legacy" bucket — each
  migrates when its component is next touched, never in bulk. `OUT_OF_SCOPE` is keyed by exact
  export names (`DocCover`, `PageHeaderBand`, `PageFooterBand`, `AboutBlock`, `Logo`); the export
  has no site-header component, so the old `01` exclusion has no counterpart.
- **Tooling** `designCatalog` in `package.json` now records the export build by its manifest
  `namespace` (the export has no git commit and no version stamp — decided with Drew, 2026-08-26);
  the generated contract stamps `build` where it previously stamped a catalog commit.
- **Fixture** `test/fixtures/design-export-sample/` — a verbatim excerpt of the real export (the
  four triads plus their CSS attributed to the files it actually lives in), with
  `test/design-export.test.js` proving ingestion end to end, including that CSS is discovered by
  searching `globalCssPaths` rather than assumed from a component's category folder.

Step 3 note: the `--hg-bg` contradiction survives in the export (`tokens/colors.css` says
`#FFFFFF`; `ApproachImplicationTable`'s label column uses it as a tint) — still ask before
implementing that component.

---

## v1.1.0 — 2026-08-25

Workflow tooling. **No components were added, changed, or removed**, and no rendered output moved.

- **Added** `html-render --audit <catalog-dir>` (`src/audit.js`) — classifies every catalogued
  component against the live registry as New / Removed / Out of scope / Covered. It joins on two
  conventions the repo already maintained: each registry entry's `source` field, and the numbered
  CSS block headers in `src/assets/styles.css`. Generated from live state, so it cannot drift the
  way a hand-kept list would.
- **Added** `.claude/skills/sync-design-components/SKILL.md` — the procedure for absorbing a
  catalog refresh: confirm the source, diff, resolve ambiguity before implementing, implement one
  component at a time, cross-check the `geo-spoke-builder` manifests, record, verify.
- **Added** this changelog.
- **Changed** one CSS comment header, `Author byline` → `Author byline (59)`. The component was
  already implemented (`renderAuthorByline` in `src/components/page.js`) but is a sub-component with
  no registry `source` and had no number in its header, so it was invisible to both coverage
  signals and would have been reported as a gap on every future run. Comment only; no CSS rule was
  touched.

`Changed` is deliberately not auto-classified. Deciding it needs a semantic comparison of HTML,
CSS, and field contracts; the audit surfaces candidates from the catalog's own refresh notes and
leaves the judgment to the operator.

---

## v1.0.0 — baseline against the 2026-07-17 catalog refresh

Recorded retroactively, so the first real sync has something to diff from. This renderer's initial
commit was built directly against the catalog as refreshed on 2026-07-17, and was already fully in
agreement with it:

- **0 Changed, 0 Removed.** Design tokens match the catalog value-for-value, including every
  post-refresh change (`--hg-text-dark: #212121`, `--fs-h1: 56px`, `--max-width: 1340px`, the
  `--hg-*-hover` set, `--hg-border-light`, `--space-*`, `--tracking-eyebrow`). All five decisions
  left open in the catalog's refresh history were already resolved correctly here — notably
  `side-nav`'s light-blue active accent (following the shipped code, not the stale melon comment)
  and named hover-color tokens on buttons rather than opacity hovers.
- **28 of 52 catalogued components covered**, via 23 registry entries plus the components fed by
  Markdown itself (`11` comparison-table from pipe tables, `45`/`47`/`48` from rules and lists) and
  the shared sub-components (`05`, `35`, `59`).
- **6 out of scope by design**: `01` and `56` (site chrome — WordPress injects it around the page
  body), `40`–`43` (print/PDF chrome, no web target). Recorded in `OUT_OF_SCOPE` in `src/audit.js`
  so they are not re-reported as gaps.
- **18 New, all deferred.** Not implemented in this pass by decision, not oversight.
  `54-inline-highlight`, `57-share-bar`, and `58-trend-indicator` are deferred specifically because
  they are inline- and cell-level primitives: they do not fit the fenced-block registry model and
  need a Markdown-syntax decision first.

One unresolved catalog ambiguity is on record and must be settled before component `32` is
implemented: `32-approach-implication-table.md` states `--hg-bg` is `#f6f8fa`, "a barely-there
off-white tint," while `00-design-tokens.md` defines `--hg-bg: #FFFFFF`. Copying the CSS verbatim
renders the intended tint invisible.
