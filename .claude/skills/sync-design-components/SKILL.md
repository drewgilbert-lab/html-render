---
name: sync-design-components
description: Bring html-render's component registry back into agreement with a Claude Design export of the HG Insights Marketing Design System. Use when a new export has been staged, when asked to sync, audit, or diff html-render against the design system, or when a component is reported missing or out of date. Works one component at a time; never batch-migrates the export.
---

# Sync html-render against a Claude Design export

The design system arrives as a **Claude Design export** — a compiled folder, not a git checkout.
The retired `design-web-components` catalog (numbered `NN-name.md` files, `INDEX.md`) is gone; do
not look for it. This renderer implements a subset of the export's components. When a new export is
staged, this skill brings the two back into agreement.

## The rule that governs the whole run

**A one-component change produces a one-component diff.**

For every file you touch, find the specific named block, function, CSS rule set, or doc section for
the one component you are changing, and edit only that span. Never regenerate, rewrite, or reformat
a file as a whole — not for a small change, not for a single component, not even when the end result
would be identical. Before finishing, read your own diff for each file. If it touches lines
belonging to a component you were not asked to change, undo that part and redo it as a targeted
edit.

Components classified Unchanged are off limits entirely — including for whitespace, comment style,
or formatting.

## What an export looks like

Top level:

| Path | What it is |
|---|---|
| `_ds_manifest.json` | The machine-readable inventory. Start here. |
| `readme.md` | The design system's own documentation — voice, tokens, layout, **deliberate inconsistencies**. Read its "Web vs document context" and "Deliberate inconsistencies" sections before implementing anything. |
| `styles.css` | The CSS entry point — `@import` lines only. |
| `tokens/` | `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`. |
| `css/` | Component CSS, grouped by *concern* (`content.css`, `charts.css`, `tables.css`, …). **These groupings do not match the component category folders** — see the discovery algorithm below. |
| `components/<category>/` | Per component: `Name.jsx` (source of truth for markup), `Name.d.ts` (props contract), `Name.prompt.md` (usage note), plus shared `*.card.html` files. |
| `_ds_bundle.js`, `guidelines/`, `assets/`, `thumbnail.html` | Compiled bundle, specimen pages, logos/illustrations. Reference only. |

The manifest's shape:

```json
{
  "namespace": "HGInsightsMarketingDesignSystem_3bf70b",
  "components": [{ "name": "Figure", "sourcePath": "components/content/Figure.jsx" }],
  "globalCssPaths": ["tokens/fonts.css", "css/charts.css", "..."],
  "tokens": ["..."], "cards": ["..."], "source": "spa"
}
```

Components are identified by `name`, unique per manifest — there are no numbers. The manifest has
**no version stamp** (`version`/`generatedAt` do not exist); the `namespace` suffix is the closest
thing to a build identifier, and it is what `designCatalog` records (Step 6).

**The `.card.html` caveat.** Card files are live browser harnesses: they load React from a CDN plus
the compiled `_ds_bundle.js` and render components out of that bundle at view time. They are demos,
not source — a stale bundle can render a component differently from its `.jsx`, or not at all. Read
the `.jsx` / `.d.ts` / `.prompt.md` triad as the source of truth; never transcribe markup from a
card file.

## Finding a component's CSS — search, never assume

**A component's category folder does not name its CSS file.** This mismatch is real and verified
against the export: `Callout` lives in `components/panels/` but its rules are in
`css/content.css`; `ShareBar` lives in `components/data/` and its rules are in `css/charts.css` —
there is no `data.css` at all. Assuming `panels/` → `panels.css` silently ports nothing.

The algorithm:

1. Read the component's `.jsx` and collect every class name it writes (`className=` literals,
   including conditionally appended ones like `callout-box--melon` and `no-track`).
2. Grep each class name across **every file in the manifest's `globalCssPaths`** — tokens files,
   every `css/*.css`, and `styles.css` itself.
3. The file(s) that define those selectors are the component's CSS. Port those rules and only
   those rules.

`test/design-export.test.js` encodes this against the fixture in
`test/fixtures/design-export-sample/` — if you port CSS from the wrong file, that test is the
tripwire.

## Step 1 — Confirm the export

Ask the user for the path to the staged export unless you already have it. Do not guess, and do not
proceed against a partial copy — `_ds_manifest.json` must exist and parse, and every
`components[].sourcePath` it names must be present. There is no git state to check; the export is a
compiled artifact. Record its `namespace` — that is the identity you will stamp in Step 6.

**The namespace does not identify a build.** Two different exports have shipped under the same one,
differing in component files, CSS, and tokens, so `--audit` alone cannot tell you a Covered
component moved. Diff the export you are syncing against the one this repo last synced — keep that
folder for exactly this reason:

```bash
diff -rq "<previously-synced-export>" "<new-export>"
```

Every shared file that differs is a Changed candidate for Step 2, and a changed `tokens/` or `css/`
file is a candidate for every component whose rules live in it. If you cannot reach the previous
export, say so and treat every Covered component as unverified rather than assuming it held.

## Step 2 — Diff at the component level

```bash
node bin/html-render.js --audit <export-dir>
```

This classifies every exported component against the live registry, joining on two signals the
repo maintains:

- each registry entry's `source` field, which stores the export's component **name verbatim**
  (`source: 'Figure'`);
- the **unnumbered, named** CSS block headers in `src/assets/styles.css`
  (`/* ---- Figure block ---- */` covers `Figure`; a header covers a component when, ignoring case
  and punctuation, it equals or begins with the name).

It reports:

- **New** — exported, not implemented here.
- **Removed** — implemented here under a named source, no longer in the manifest.
- **Legacy numbered convention** — registry sources and CSS headers still written against the
  retired numbered catalog (`46-callout-box`, `(46)`). These cannot join on export names. Each
  migrates to the named convention **when its component is next touched — never in bulk.**
- **Out of scope by design** — exported but deliberately not ours (site chrome, print/PDF document
  chrome). Not gaps. The list and its reasons live in `OUT_OF_SCOPE` in `src/audit.js`, keyed by
  exact export names.
- **Covered** — everything else.

**Changed is not auto-classified**, and should not be. The export carries no refresh history, so
deciding Changed needs a semantic comparison. Step 1's folder diff is where the doubt comes from:
for every Covered component whose files or CSS it flagged, open the `.jsx` / `.d.ts` / `.prompt.md`
and compare markup, CSS (found via the search algorithm above), and field contract against this
repo's implementation. Classify it Changed only if
structure, CSS, fields, or usage rules actually differ.

Report the classification to the user as a table — name, classification, one-line reason —
**before writing any code**. If more than a handful are New or Changed, stop and ask which to take
this pass. This workflow moves deliberately; it does not batch-migrate the export.

**Order the New bucket by consumer demand, not by category.** The point of implementing a component
is that a page-building skill can ask for it, so rank by how many skills already name it (Step 5
says where to read that), then by whatever [docs/open-items.md](../../../docs/open-items.md) §3
records as blocked. Default to one or two per pass.

## Step 3 — Resolve ambiguity, do not guess

For each New or Changed component, read the export's own notes: the component's `.prompt.md`, its
`.d.ts` doc comments, and the `readme.md` — especially "Deliberate inconsistencies", which lists
things that look like mistakes and are not. Read that section in the export you are syncing rather
than trusting a list quoted here — its entries change between builds, and one this skill used to
name has already stopped being true. If anything is unresolved, contradictory, or unclear after
that, **stop and ask the user**. Do not pick an interpretation.

## Step 4 — Implement each change on its own

There is no separate procedure document to follow — this is it. A component is added in four
places and no others:

1. **A registry entry**, in `src/components/blocks.js` or `page.js` and in that file's exported
   list. The two files are one registry (`src/components/index.js` merges them) and every component
   is invokable from the body, so choosing between them is filing, not behaviour: put it with its
   neighbours.
2. **A CSS block** in `src/assets/styles.css`, headed with the component's export name and **no
   number** — `/* ---- Figure block ---- */` — so the audit's header join sees it.
3. **A test** in `test/`, following the existing files.
4. **A row in the "Named elements" table in [docs/authoring.md](../../../docs/authoring.md) — only
   if the component is page chrome** (a trail, an opening block, a closing band). Everything else is
   section content, which that table says needs no entry. This file ships downstream verbatim inside
   the synced contract, so a chrome component with no row is one a consumer cannot ask for.

**A component states no requirements and authors no copy.** No `required: true`, no `min`/`max`, no
injected default strings, no cross-field validators. It renders what it is given and omits what it
is not; what a page must carry is decided by whatever writes the Markdown. There is no layout to
slot it into and no page contract to register it in — both were removed in v2.0.0.

Per classification:

- **New** — add it as a self-contained addition, in the four places above. Set `source` to the
  manifest name **verbatim**; that is what the audit joins on.
- **Changed** — edit only that component's existing `render`, `fields`, CSS rules, test, and
  Named-elements row if it has one, in place. A touched component also adopts the named convention: migrate its `source` and
  CSS header in the same change. Do not touch a neighbouring component while you are in the file.
- **Removed** — **do not delete the implementation.** Pages already using it must keep rendering.
  Add `deprecated: true` to its registry entry and record the status, with a replacement if one
  exists, in the `CHANGELOG.md` entry for this run (Step 6). Actual removal is a separate, later
  decision.

Translate the `.jsx` markup and conditional logic directly into `render()` using the `el`/`lines`/
`indent` helpers; derive `fields` from the `.d.ts` props contract. Copy CSS values verbatim — keep
the `--hg-*` / `--grad-*` / `--fs-*` / `--space-*` / `--fw-*` tokens and class names; never
re-derive a color, spacing, or type value. The export's CSS is unscoped; scope every ported
selector under the `.__page_class__` token (the renderer substitutes the configured page class).

## Step 5 — Cross-check the consumer

The catalog exists so that `geo-spoke-builder`'s page-building skills can ask for a component. Each
one carries a `## Design Components (from the renderer catalog)` section: a table mapping the
elements that page format carries to the components that express them. **That table is the demand
signal.** It replaced the per-skill component manifests, so the retired `NN-name.md` grep this step
used to run now matches nothing at all.

Rank what the skills actually name:

```bash
awk '/^## Design Components/,/^## Build Procedure/' \
  <geo-spoke-builder>/plugins/geo-spoke-builder/skills/*/SKILL.md \
  | grep -oE '```[a-z][a-z0-9-]+' | tr -d '`' | sort | uniq -c | sort -rn
```

Compare that against the audit both ways:

- **A skill names an element no component expresses** — a gap, and the reason Step 2 orders the New
  bucket the way it does.
- **A New component the skills should be reaching for** — report it. Whether a format adopts it is
  the skill author's call, not this repo's.

Name the consumer by role, not by path. That repository is mid-migration — its page skills are
moving to authoring Markdown only, with rendering coordinated by the application that consumes it —
so the file that invokes the renderer, and the paths around it, may move. What stays true is that
the skills read one synced contract and name elements, never fields.

If you cannot read that repository in this session, **say so explicitly in your report**. Do not
skip the check silently.

## Step 6 — Record it

Two records, both required.

**1. The changelog.** Append one entry to `CHANGELOG.md` for this run: the date, the version, and
one line per component touched, tagged New / Changed / Removed / Deprecated with a short reason.
Reference the Step 3 decision if one applied. **Append only — never rewrite a prior entry.**

**2. The provenance field.** Update `designCatalog` in `package.json` to the export you just synced
against — this is the machine-readable half, and it is what stamps the contract file the sync
workflow ships to `geo-spoke-builder` (see [docs/component-sync.md](../../../docs/component-sync.md)).
Overwrite it in place; unlike the changelog, it records current state, not history.

- `catalog` — `HG Insights Marketing Design System (Claude Design export)`.
- `build` — the manifest's `namespace` verbatim (e.g.
  `HGInsightsMarketingDesignSystem_3bf70b`). Recorded because the export carries nothing better,
  **not** because it identifies a build: it does not change when the export is recompiled.
  `syncedAt` and the folder diff from Step 1 are what actually distinguish one build from another.
- `syncedAt` — today's date, ISO. When this renderer last reconciled against that build.

If Step 4 added a Named-elements row to `docs/authoring.md`, that is part of this record too: the
sync ships that file verbatim alongside the catalog, so the row is how a consumer learns the element
exists at all.

Both records plus the release tag are the durable record the next run diffs against.

## Step 7 — Verify before reporting done

```bash
npm test
```

```bash
npm run check
```

Then confirm each of these, and report only what you actually ran:

- Every existing test passes, not just the new ones — including `test/design-export.test.js`, the
  fixture-backed ingestion proof.
- All examples still validate, and `npm run render:examples` leaves `output/` byte-identical —
  unless a Changed component should legitimately alter it, in which case say which example changed
  and why. (Any CSS addition alters every page's inline stylesheet; that counts and must be named.)
- `node bin/html-render.js --components` lists the component and its fields as you meant them, and
  `node scripts/generate-contract.js --out /tmp/contract.md` regenerates the file that ships
  downstream — diff it to see exactly what the consumer will receive.
- Re-run `--audit <export-dir>` and confirm the components you implemented have moved out of New.
- Bump `package.json`: patch for doc/test-only, minor for additive New components. A Changed
  component with incompatible fields, or a Removed one, is **breaking** — the render fails wherever
  it runs, not just here. Call it out explicitly in the report; it needs the Step 4 deprecation
  handling, not just a version bump.
- Tag the commit with that version, e.g. `v1.2.0` — after the PR merges, per
  [docs/github-process.md](../../../docs/github-process.md).

**Two things gate the release reaching a running session, and neither is this repo's to do.** Name
both in the report rather than assuming someone knows:

- **The versions must match.** Whatever invokes the renderer downstream refuses to run unless the
  CLI version equals the version stamped on the synced contract. A tag that lands without the
  contract following it stops the render.
- **The contract only ships with a plugin version bump.** A synced contract sitting on the
  consumer's `main` with no plugin version bump never reaches an installed session — the two are
  indistinguishable by plugin version — and that repo's own freshness check fails the build.

## Reporting back

Organize by component: name, classification, files changed, and confirmation that the diff for
that component is scoped to only that component. State which CSS file each component's rules were
found in (proving the search, not the folder assumption). Flag anything you stopped and asked
about in Step 3, and give the Step 5 result. Do not report success on anything you did not verify.
