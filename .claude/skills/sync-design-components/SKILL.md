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
against the 63-component export: `Callout` lives in `components/panels/` but its rules are in
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
deciding Changed needs a semantic comparison: for each Covered component you have reason to doubt,
open its `.jsx` / `.d.ts` / `.prompt.md` and compare markup, CSS (found via the search algorithm
above), and field contract against this repo's implementation. Classify it Changed only if
structure, CSS, fields, or usage rules actually differ.

Report the classification to the user as a table — name, classification, one-line reason —
**before writing any code**. If more than a handful are New or Changed, stop and ask which to take
this pass. This workflow moves deliberately; it does not batch-migrate the export.

## Step 3 — Resolve ambiguity, do not guess

For each New or Changed component, read the export's own notes: the component's `.prompt.md`, its
`.d.ts` doc comments, and the `readme.md` — especially "Deliberate inconsistencies", which lists
things that look like mistakes and are not (the misnamed `--hg-border-light` is the *heavier*
border; badge eyebrow tracking differs from section eyebrows on purpose; `NameHighlight` is
bold-only by default). If anything is unresolved, contradictory, or unclear after that,
**stop and ask the user**. Do not pick an interpretation.

## Step 4 — Implement each change on its own

Follow the existing process in [docs/component-library.md](../../../docs/component-library.md)
under "Adding a component" — do not invent a different mechanism. In short: registry entry, export
list, CSS block, docs entry, and for page-level components a layout slot plus a key in
`src/validate/document-contract.js`.

Per classification:

- **New** — add it as a self-contained addition. Choose `blocks.js` or `page.js` by usage pattern:
  in-flow components an author invokes with a fenced block go in `blocks.js`; components a layout
  composes from frontmatter go in `page.js`. Set `source` to the manifest name **verbatim**. Add a
  test in `test/` following the existing files. Name the CSS block for the component with **no
  number** — `/* ---- Figure block ---- */` — so the audit's header join sees it.
- **Changed** — edit only that component's existing `render`, `fields`, CSS rules, doc entry, and
  test, in place. A touched component also adopts the named convention: migrate its `source` and
  CSS header in the same change. Do not touch a neighbouring component while you are in the file.
- **Removed** — **do not delete the implementation.** Pages already using it must keep rendering.
  Mark it deprecated in `docs/component-library.md` with a status and a replacement if one exists,
  and add `deprecated: true` to its registry entry. Actual removal is a separate, later decision.

Translate the `.jsx` markup and conditional logic directly into `render()` using the `el`/`lines`/
`indent` helpers; derive `fields` from the `.d.ts` props contract. Copy CSS values verbatim — keep
the `--hg-*` / `--grad-*` / `--fs-*` / `--space-*` / `--fw-*` tokens and class names; never
re-derive a color, spacing, or type value. The export's CSS is unscoped; scope every ported
selector under the `.__page_class__` token (the renderer substitutes the configured page class).

## Step 5 — Cross-check the consumers

`geo-spoke-builder`'s page-building skills each carry a fixed component manifest. A component named
in a manifest but missing here is a gap that will surface as a broken build. Those manifests still
reference the retired numbered filenames, so the ranking is still generated with:

```bash
grep -rhoE '`[0-9]{2}-[a-z0-9-]+\.md`' <geo-spoke-builder>/plugins/geo-spoke-builder/skills/*/SKILL.md \
  | tr -d '`' | sort | uniq -c | sort -rn
```

Map the numbered names to export names by hand as skills migrate (the known mappings are tracked in
[docs/open-items.md](../../../docs/open-items.md) §2). Compare that list against the audit's New
rows. If you cannot read that repository in this session, **say so explicitly in your report**. Do
not skip the check silently.

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
  `HGInsightsMarketingDesignSystem_3bf70b`). The suffix changes when the export is recompiled;
  there is no other version stamp.
- `syncedAt` — today's date, ISO. When this renderer last reconciled against that build.

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
- `node bin/html-render.js --components` and `--contract pillar|cluster|spoke` match what you wrote
  in the docs.
- Re-run `--audit <export-dir>` and confirm the components you implemented have moved out of New.
- Bump `package.json`: patch for doc/test-only, minor for additive New components. A Changed
  component with incompatible fields, or a Removed one, is **breaking** — call it out explicitly in
  the report; it needs the Step 4 deprecation handling, not just a version bump.
- Tag the commit with that version, e.g. `v1.2.0` — after the PR merges, per
  [docs/github-process.md](../../../docs/github-process.md).

## Reporting back

Organize by component: name, classification, files changed, and confirmation that the diff for
that component is scoped to only that component. State which CSS file each component's rules were
found in (proving the search, not the folder assumption). Flag anything you stopped and asked
about in Step 3, and give the Step 5 result. Do not report success on anything you did not verify.
