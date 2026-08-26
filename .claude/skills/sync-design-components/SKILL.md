---
name: sync-design-components
description: Bring html-render's component registry back into agreement with the design-web-components catalog after a Claude Design refresh. Use when the catalog has been updated, when asked to sync, audit, or diff html-render against the design system, or when a component is reported missing or out of date. Works one component at a time; never batch-migrates the catalog.
---

# Sync html-render against design-web-components

`design-web-components` is the canonical execution-time source for the HG Insights design system:
a static HTML/CSS catalog of numbered component files plus an `INDEX.md`. This renderer implements
a subset of it. When the catalog refreshes, this skill brings the two back into agreement.

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

## Step 1 — Confirm the catalog

Ask the user for the path to the current `design-web-components` checkout unless you already have
it. Do not guess, and do not proceed against a stale or partial copy.

Last known location:
`~/Documents/marketing-skills/plugins/mktg-skills/skills/design-web-components`

Before trusting it, confirm the checkout is clean and current:

```bash
git -C <catalog-repo> status --short && git -C <catalog-repo> log -1 --date=iso --format='%h %ad %s'
```

A dirty tree or a branch behind `origin` means you are about to sync against something that is not
the real catalog. Say so and stop.

## Step 2 — Diff at the component level

```bash
node bin/html-render.js --audit <catalog-dir>
```

This classifies every catalogued component against the live registry, joining on two signals the
repo already maintains: each registry entry's `source` field, and the numbered CSS block headers in
`src/assets/styles.css`. It reports:

- **New** — catalogued, not implemented here.
- **Removed** — implemented here, no longer in the catalog.
- **Out of scope by design** — catalogued but deliberately not ours (site chrome, print/PDF chrome).
  These are not gaps. The list and its reasons live in `OUT_OF_SCOPE` in `src/audit.js`.
- **Covered, but the catalog says something moved** — the audit's review queue.
- **Covered** — everything else.

**Changed is not auto-classified**, and should not be. Deciding it needs a semantic comparison of
HTML, CSS, and field contracts. The audit surfaces candidates; you make the call. For each entry in
the review queue, open the component file and compare its `## HTML` and `## CSS` against this
repo's implementation and CSS block. Classify it Changed only if the structure, CSS, fields, or
usage rules actually differ.

Report the classification to the user as a table — number, name, classification, one-line reason —
**before writing any code**. If more than a handful are New or Changed, stop and ask which to take
this pass. This workflow moves deliberately; it does not batch-migrate the catalog.

## Step 3 — Resolve ambiguity, do not guess

For each New or Changed component, read the catalog's own notes: the component file's
`## Usage notes`, and the `## Refresh history` in the catalog `SKILL.md`. If anything is
unresolved, contradictory, or unclear, **stop and ask the user**. Do not pick an interpretation.

The shapes this takes, all of which have occurred in this catalog:

- **A spec disagreeing with shipped code.** `30-sticky-side-nav.md` notes that the JSX source's own
  comment claims a melon active-link accent while the shipped code uses light-blue.
- **A token whose value moved without every caller updating.**
  `32-approach-implication-table.md` states `--hg-bg` is `#f6f8fa`, "a barely-there off-white tint
  to distinguish the label column." `00-design-tokens.md` defines `--hg-bg: #FFFFFF`. Copying that
  CSS verbatim renders the intended tint invisible. **Unresolved as of the 2026-07-17 catalog — ask
  before implementing component 32.**
- **A calculation model that changed.** `11-comparison-table.md`'s share-bar width moved from
  calibrated pixel widths to percent-of-track, shifting existing bar proportions.
- **A default that flipped.** `54-inline-highlight.md`'s melon name styling became opt-in, so
  content relying on the old default renders as plain text.

## Step 4 — Implement each change on its own

Follow the existing process in [docs/component-library.md](../../../docs/component-library.md)
under "Adding a component" — do not invent a different mechanism. In short: registry entry, export
list, CSS block, docs entry, and for page-level components a layout slot plus a key in
`src/validate/document-contract.js`.

Per classification:

- **New** — add it as a self-contained addition. Choose `blocks.js` or `page.js` by usage pattern:
  in-flow components an author invokes with a fenced block go in `blocks.js`; components a layout
  composes from frontmatter go in `page.js`. Add a test in `test/` following the existing files.
  Name the CSS block for the design-system component it implements, and **include its number** —
  `/* ---- Figure block (53) ---- */`. The audit joins on that number; an unnumbered header makes
  the component invisible to future runs.
- **Changed** — edit only that component's existing `render`, `fields`, CSS rules, doc entry, and
  test, in place. Do not touch a neighbouring component while you are in the file.
- **Removed** — **do not delete the implementation.** Pages already using it must keep rendering.
  Mark it deprecated in `docs/component-library.md` with a status and a replacement if one exists,
  and add `deprecated: true` to its registry entry. Actual removal is a separate, later decision.

Copy HTML and CSS from the catalog verbatim. Keep the `--hg-*` / `--grad-*` / `--fs-*` / `--space-*`
/ `--fw-*` tokens and class names; never re-derive a color, spacing, or type value. Scope all CSS
under `.hg-geo-page`.

## Step 5 — Cross-check the consumers

`geo-spoke-builder`'s page-building skills each carry a fixed component manifest. A component named
in a manifest but missing here is a gap that will surface as a broken build.

```bash
grep -rhoE '`[0-9]{2}-[a-z0-9-]+\.md`' <geo-spoke-builder>/plugins/geo-spoke-builder/skills/*/SKILL.md \
  | tr -d '`' | sort | uniq -c | sort -rn
```

The count ranks demand — how many skills reference each component. Compare that list against the
audit's New rows.

If you cannot read that repository in this session, **say so explicitly in your report**. Do not
skip the check silently.

## Step 6 — Record it

Append one entry to `CHANGELOG.md` for this run: the date, the version, and one line per component
touched, tagged New / Changed / Removed / Deprecated with a short reason. Reference the Step 3
decision if one applied. **Append only — never rewrite a prior entry.**

That file plus the release tag is the durable record the next run diffs against.

## Step 7 — Verify before reporting done

```bash
npm test
```

```bash
npm run check
```

Then confirm each of these, and report only what you actually ran:

- Every existing test passes, not just the new ones.
- All examples still validate, and `npm run render:examples` leaves `output/` byte-identical —
  unless a Changed component should legitimately alter it, in which case say which example changed
  and why.
- `node bin/html-render.js --components` and `--contract pillar|cluster|spoke` match what you wrote
  in the docs.
- Re-run `--audit` and confirm the components you implemented have moved out of New.
- Bump `package.json`: patch for doc/test-only, minor for additive New components. A Changed
  component with incompatible fields, or a Removed one, is **breaking** — call it out explicitly in
  the report; it needs the Step 4 deprecation handling, not just a version bump.
- Tag the commit with that version, e.g. `v1.1.0`.

## Reporting back

Organize by component: number, name, classification, files changed, and confirmation that the diff
for that component is scoped to only that component. Flag anything you stopped and asked about in
Step 3, and give the Step 5 result. Do not report success on anything you did not verify.
