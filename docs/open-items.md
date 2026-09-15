# Open items

What is outstanding in this repository, why, and what unblocks it. Reviewed when a release is cut
and whenever the design catalog refreshes.

**This file is hand-kept, and that makes it the exception here.** Everything else this repo reports
about coverage — `--audit` and `--components` — is generated from live state precisely so
it cannot drift. A list like this one can and will drift. Two rules keep it honest:

- **Never restate a number this repo can generate.** Where a section needs the component picture,
  it names the command instead. The snapshot below is dated; the command is the truth.
- **Close items here in the same commit that closes them for real.** An item that lingers after the
  work is done is worse than no list.

```bash
node bin/html-render.js --audit /path/to/claude-design-export   # coverage vs. the export
node bin/html-render.js --components                            # the catalog, as shipped downstream
```

Last reviewed: **2026-09-15**, against Claude Design export `HG New Brand Design System`
(digest `99ef8724…`, namespace `HGInsightsMarketingDesignSystem_3bf70b` — the same namespace as
the 2026-09-01 recompile and the 2026-09-01 original, which is why the namespace is no longer the
identity; see §4), and `html-render` v4.1.0 on `main`.

Do not restate the design build here either. `design-export.lock.json` is the identity, and it is
generated:

```bash
node scripts/export-lock.js --export /path/to/claude-design-export --check   # has it moved?
```

---

## 1. Cross-repo sync

The pipeline is built, merged, and — as of 2026-08-27 — has performed its first real write,
with idempotency proven the same day. Every row below is closed.

| Item | Status | What unblocks it |
|---|---|---|
| Real sync run (`dry_run=false`) | ✅ Ran 2026-08-27, triggered by the `v1.2.0` tag — opened [geo-spoke-builder#23](https://github.com/drewgilbert-lab/geo-spoke-builder/pull/23) (first sync; no previous contract file downstream), merged the same day | — |
| No-op run, proving Step 3.5 | ✅ Passed 2026-08-27, after #23 merged — dispatched at the `v1.2.0` ref (not `main`, which had moved and would stamp a different `commit=`), read back `Previous contract stamped at commit: e73b8e6` and reported `no change, nothing to sync` | — |
| Dry run | ✅ Passed 2026-08-26 (hardcoded targets) and re-proven 2026-08-27 against the variables below | — |

**`SYNC_TARGET_REPO` and `SYNC_TARGET_PATH` were set as Actions variables on 2026-08-27**, to
`drewgilbert-lab/geo-spoke-builder` and `references/html-render-contract.md` — the values recorded
in [component-sync.md](component-sync.md#the-sync-target). A fresh dry run the same day confirmed
the workflow reads them (`Syncing to drewgilbert-lab/geo-spoke-builder ::
references/html-render-contract.md`). The *token* stays a literal secret name —
that is the PAT decision below, deliberately unchanged.

**The sync became the promotion on 2026-09-15 (v4.1.0).** It triggers on `push` to `main` rather
than on a `v*` tag, writes three files instead of one (contract, plugin version, the consumer's
`CLAUDE.md` version string, via that repo's own `scripts/ship-contract.py`), and sets auto-merge.
`geo-spoke-builder/main` is now the single production pointer: its contract names the exact
renderer commit that belongs with it, and `pillar-geo-launch` resolves the pair from there rather
than resolving two upstreams independently. Tagging is no longer a step anywhere.

**The sync token expires 2026-11-24** and nothing owns renewing it. It now needs **Pull requests:
read and write** as well as Contents, because the workflow sets auto-merge. When it lapses the
workflow fails on `Check out geo-spoke-builder`, and unlike before that is visible without
watching Actions: the sync runs on every commit to `main` rather than on a tag somebody remembers
to cut, and because the pointer stops advancing, `pillar-geo-launch` visibly stops picking up new
design work instead of quietly rendering against a stale contract. Rotation steps and the dates
are in [component-sync.md](component-sync.md#the-token).

**Revisit a GitHub App instead of a PAT** when a second consumer repo appears — unchanged, and
deliberately not done as part of the promotion work. Its original argument was silent expiry,
which is no longer true (above); what is left is one shared token, and that trigger is still a
second consumer.

**The breaking-change flag fires on `Changed` as well as `Removed`/`Deprecated`.** Deliberate — a
script cannot judge "incompatible field" from prose, and a missed break costs more than a dismissed
banner. It fired on the first dry run for a CSS *comment* rename. If that proves noisy in practice,
the fix is something that reads the field contracts, not a narrower regex.

## 2. Consumer migration

**Closed 2026-09-14, except the tag.** v2.0.0 removed the page classes — the renderer no longer
decides what a page contains or in what order; a document composes itself in body order. See
`CHANGELOG.md` for the full list. Downstream, geo-spoke-builder#50 ("Move assembly knowledge out
of the skills") and geo-spoke-builder#51 (contract re-stamp) are merged; the plugin is at 0.47.1.

- **15 skills carried a private copy of the composition rules this removal made pointless** — not
  13; the count grew past the v1.5.0 batch below with `create-product-page` and `edit-spoke-page`.
  Each restated the chrome order and a frontmatter-key mapping; 14 still told authors to write
  `pills` (discarded since v1.7.0); 11 still described the "On This Page" jump nav removed in
  v1.6.0; 5 still named `freshness.cadence` (discarded even earlier). None of that can be restated
  any more: geo-spoke-builder#50 deleted it — 1,170 lines out against 987 rewritten — and replaced
  it with one `**Elements:**` line per skill naming what that format carries, against the
  named-element vocabulary [html-render#16](https://github.com/drewgilbert-lab/html-render/pull/16)
  added to `docs/authoring.md` so 15 skills don't need 15 private copies of it.
- Every string the renderer used to inject (FAQ/citations eyebrows, `"Read the guide"`, the
  `"Data last updated: "` prefix, side-nav and jump-nav labels, the in-production badge) is now
  authored per skill, not derived.
- Content requirements that were renderer errors are now `geo-lint.py`'s: it counts citations from
  the body's `citations` block instead of frontmatter, and treats a missing `.faq-answer` or
  `.thesis-block` as an error rather than a warning — the two tells of a page that passes `--check`
  while rendering gutted. `lint-skills.py` gained `FORBIDDEN_WIRE_NAMES`, failing a skill's own
  build if it still names a removed key or component field.
- `.section-header` and the automatic `.grouping-block` around each `###` are gone, so pages of
  the old pillar, cluster, and banded-spoke shapes render visibly differently. Decided
  deliberately (2026-09-14) rather than relocating the behaviour into a region option.
- Adversarial review of the migration found real defects in 9 of the 15 rewritten files — most
  significantly a deleted "Section headers" row that left several formats claiming bands and
  anchors with nothing saying how either exists. Repaired and rechecked before merge.

**Fully closed 2026-09-15.** `v2.0.0` was tagged, and `v3.0.0` followed it the same day with
the Sept 2026 brand kit. The sync workflow carried the v3.0.0 contract into geo-spoke-builder
(its PR #54), which merged with the plugin bump to 0.49.0 in the same change, so the contract
reaches installed sessions. Both sides of `render-page.sh`'s version gate now read `3.0.0`.

### Before v2.0.0

**All 13 page-building skills in `geo-spoke-builder` are on this renderer as of 2026-09-01.**
The first migration landed with `create-glossary-spoke` (geo-spoke-builder#24, plugin 0.24.0), and
its gap report drove the v1.3.0 extensions (`standalone`, `knows_about`, provenance keys, citations
separator). The other twelve migrated on 2026-09-01, one skill per PR
([geo-spoke-builder#31–#42](https://github.com/drewgilbert-lab/geo-spoke-builder/pulls?q=is%3Apr+is%3Amerged+html-render),
plugin 0.28.0–0.39.0; the per-skill manifest translations are that repo's
`docs/HTML-RENDER-MIGRATION.md`). Reconciling their schema stacks against the renderer showed that
`geo-standards.md` §1.1's format-specific types (`HowTo`, `Dataset`, `ItemList`, `Service`,
`DefinedTermSet`, `SoftwareApplication`, `TechArticle`, `CollectionPage`) had no renderer
counterpart at all, and that four export components the batch named were still unimplemented.
Both are closed in v1.5.0 — see `CHANGELOG.md`. Contract delivery history: first sync was
[geo-spoke-builder#23](https://github.com/drewgilbert-lab/geo-spoke-builder/pull/23), merged
2026-08-27; the v1.5.0 contract was generated locally from this repo's PR #9 branch and shipped
downstream with geo-spoke-builder#31, so the tag-triggered sync after `v1.5.0` is cut will
re-stamp only its `commit=` line.

**Every remaining spoke format is `banded`; only the glossary is `article`.** The consumer chose the
variant from each skill's own design specification (stat hero, freshness bar), which is
why the renderer's own docs re-mapped five formats in v1.5.0 (that mapping table is deleted in
v2.0.0 — which content format looks like what is the consumer's knowledge, not this repo's). Where a format's opening
block carries a number only when the topic has one, the skill falls back to `article` at run time
rather than inventing a stat card. Both spoke variants now always emit the sticky side-nav rail
(see `CHANGELOG.md` v1.6.0); skill copy that still describes an "On This Page jump nav"
is a follow-up after the v1.6.0 contract stamp, not a renderer gap.

**Closed — right-rail side nav on all spokes.** Previously recorded as a v1.5.0 translation
decision (the pillar guide, benchmark report, and data dictionary manifests wanted
`StickySideNav`; both spoke layouts gave them the intro jump nav instead). The spoke template
now always composes the rail, and banded spokes no longer emit `.hub-toc`. Done for every spoke,
not only long ones.

**Skill needs the current renderer still does not meet**, each recorded in that repo's migration
file as a translation decision rather than a renderer gap: a code block for the two technical
spokes (the export has no such component, so this is a design-system gap, not a renderer one —
the skills express the structure as a table); `InteractiveTable`, `TechStackLayers`,
`DisplacementFlow`, and `CohortSwitcher` (all JavaScript-driven web-only components the
consumer's §1.3 already treats with suspicion; a pipe table or `bar-chart` carries the data
statically); `SocialProof` (gated by a customer-reference audit the consumer runs, and rarely
cleared); the inline `MetricHighlight` / `NameHighlight` pair (still blocked on the
inline-syntax decision in §3, `**bold**` stands in).

Cross-checking those manifests against this registry (the procedure is
[Step 5 of the sync skill](../.claude/skills/sync-design-components/SKILL.md)) surfaces components
skills already name that this renderer does not implement. The skills still reference the retired
numbered filenames; the export name each maps to is given where known. As of 2026-08-26:

| Component (skill manifests) | Export name | Skills naming it | Note |
|---|---|---|---|
| `53-figure-block` | `Figure` | **10** | ✅ Implemented 2026-08-26 (`figure`) |
| `33-limitations-cards` | `LimitationsCards` | 5 | ✅ Implemented 2026-09-01 (`limitations-cards`, v1.5.0) |
| `32-approach-implication-table` | `ApproachImplicationTable` | 4 | **Blocked** — see the token ambiguity in §3; the migrating skills express it as a two-column pipe table meanwhile |
| `57-share-bar` | `ShareBar` | 3 | ✅ Implemented 2026-08-26 (`share-bar`, composed in `comparison-table` cells) |
| `58-trend-indicator` | `TrendIndicator` | 3 | ✅ Implemented 2026-09-01 (`trend-indicator`, composed in `comparison-table` cells, v1.5.0) |
| `08-key-insights-panel` | `KeyInsights` | 2 | ✅ Implemented 2026-09-01 (`key-insights`, v1.5.0) |
| `07-primary-chart-bar` | `BarChart` | 1 | ✅ Implemented 2026-09-01 (`bar-chart`, v1.5.0) |
| `19-interactive-table` | `InteractiveTable` | 2 | Web-only, JavaScript-driven; the skills use a static pipe table. Not planned |
| `18-badges-tags-labels` | `Badge` | 2 | Named only in composition notes, never as a page element. Not planned |
| `20-displacement-flow`, `21-tech-stack-layers`, `22-cohort-switcher` | `DisplacementFlow`, `TechStackLayers`, `CohortSwitcher` | 1 each | Web-only, JavaScript-driven; the consumer's §1.3 already excludes `22` outright. Not planned |
| `55-social-proof-strip` | `SocialProof` | 1 | Gated by a customer-reference audit; the skill omits it. Not planned |
| `54-inline-highlight` | `NameHighlight` / `MetricHighlight` | 1 | Needs the inline-syntax decision in §3 |

Regenerate that ranking rather than trusting the table:

```bash
grep -rhoE '`[0-9]{2}-[a-z0-9-]+\.md`' <geo-spoke-builder>/plugins/geo-spoke-builder/skills/*/SKILL.md \
  | tr -d '`' | sort | uniq -c | sort -rn
```

`01-header-nav` is named by all 13 skills but is **out of scope by design** — site chrome around the
page body is not the renderer's to own, so it never emits it. The Claude Design export has no
site-header component at all, so there is nothing to reconcile it against; the mismatch is worth
settling explicitly during migration so a skill author does not read it as one.

**`15-faq-accordion` is named by 14 skill manifests and the accordion no longer exists.** The
2026-09-01 export made the FAQ a static Q&A list (v1.4.0), so a skill still describing expand /
collapse behaviour, a `+` toggle, or a first-item-open default is describing markup this renderer
will not emit. The renderer's `faq` frontmatter contract is unchanged, so only the prose describing
the rendered result is wrong. Each skill's wording is corrected as it migrates.

## 3. Component coverage

**Most of the export's components are not implemented** (run `--audit <export-dir>` for the live
count and list). Deferred by decision, not oversight — and the gap widened on 2026-09-15, when the
`HG New Brand Design System` export added 28 components in four new category folders (`product`,
`proof`, `site`, `controls`). None was taken in v3.0.0: no `geo-spoke-builder` skill names any of
them, so nothing downstream can ask for one yet. Implement on demand, ordered by which the page
skills actually reach for.

**The numbered→named `source` migration is complete.** It ran from 2026-08-26 one component at
a time, as designed: the four that pass touched (`Figure`, `ShareBar`, `ComparisonTable`,
`Callout`), then `Faq` on 2026-09-01. The v3.0.0 brand rebuild touched all 30 at once and so
migrated the remaining 21 registry sources and 23 CSS headers with them. `--audit` now reports an
empty Legacy bucket. The known debt in that migration is settled too: `bars` was reconciled
against the export's `MiniBarChart` by a real comparison of markup and CSS, not a `source`
rename — its row geometry and fill colours came from `css/charts.css`.

**The page-composition rules override component `h3` and `p` rules at equal specificity.**
`.page-section p`, `.main-col p`, `.article-body p`, and the matching `h3` rules in the "Page
composition" block are `(0,2,1)` selectors declared after most component blocks, so a component's
own `(0,2,0)` or `(0,2,1)` rule for a `p` or `h3` loses to them: `concept-card-title` takes the
section's `h3` margins, `callout-box-body` and `process-step-body` render at the section's
`--fs-lead` / `--lh-body` rather than their own values. v1.5.0's four new blocks are placed *after* the composition
rules and bump their `p` selectors with an ancestor class to render as designed, which is a
workaround, not the fix. The fix is to scope the composition rules to bare prose (a `.prose`
wrapper on section bodies, or `:not()` exclusions) and then move the four blocks back into
component order. Touch every affected component's CSS in one reviewed pass, since it changes
rendered output for pages already published.

**`ProcessSteps` still emits a `div` where the export uses an `h3`.** v3.0.0 re-ported its CSS
from the export verbatim and moved its `source` to `ProcessSteps`, so the convention debt is
settled and the values now match. The markup difference is not: the export's `.jsx` titles the
step with `h3.process-step-title` and this renderer emits a `div`. Switching walks straight into
the cascade issue above — `.page-section h3` would capture it — so the two are still one job.

**Table attribution has no component, by decision.** The 2026-09-01 export removed the
`source`/`caption` prop from all six of its data-table components, and Drew's call was to follow it
for the one implemented here (`comparison-table`): citation is not a table field right now, and
becomes its own component later. Until that component exists there is a **gap with two named
consumers** — `create-comparison-spoke` and `create-evaluation-guide-spoke` both specify
`.table-caption` as the source line in their component manifests, and neither has migrated yet. The
Markdown path still covers the plain case (a `Source: …` paragraph after a pipe table), so a
migrating skill is only stuck when it needs a caption on a *fenced* `comparison-table`. Worth
settling before either of those two migrates. Note also that the export left `.table-caption`
orphaned in its own `css/tables.css`, so the removal may yet be reversed upstream.

Two components remain blocked on a decision rather than on effort:

**`ApproachImplicationTable` — the token contradiction survives in the export.** The export's
`tokens/colors.css` defines `--hg-bg: #FFFFFF`, yet the component's label column
(`.approach-cell:first-child` in `css/editorial.css`) uses `background: var(--hg-bg)` where a
distinguishing tint is clearly intended — copied verbatim, the tint is invisible, exactly as in the
retired catalog. **Ask before implementing it**, and note its CSS lives in `css/editorial.css`,
not `css/tables.css` — a live example of why CSS is found by searching `globalCssPaths`.

**`NameHighlight` (and inline use of `TrendIndicator`) need an inline-syntax decision.** They are
inline primitives that do not fit the fenced-block registry model. `ShareBar` was unblocked on
2026-08-26 by composing it inside `comparison-table` share cells; `TrendIndicator` can take the
same cell-composition route, but a true inline-in-prose syntax is still undecided and gates
`NameHighlight`.

## 4. Provenance

**Closed 2026-09-15 (v4.1.0).** `design-export.lock.json` is committed alongside each ingest and
carries a SHA-256 per component source file, per token file and per stylesheet, plus one overall
digest over all three. `scripts/export-lock.js --check` names exactly which components and
stylesheets moved between the committed lock and a staged export, and the contract shipped
downstream stamps that digest as `export=`.

The history is worth keeping, because it is the argument for not trusting a label again:
`_ds_manifest.json`'s `namespace` was adopted as the build identity on 2026-08-26 on the premise
that it changes when the export is recompiled. It does not. The 2026-09-01 recompile shipped under
`HGInsightsMarketingDesignSystem_3bf70b` while differing in nine component files,
`css/navigation.css`, `readme.md`, `_adherence.oxlintrc.json` and `_ds_bundle.js`. The 2026-09-15
`HG New Brand Design System` export shipped under the *same* namespace again while adding 28
components, four category folders and a wholly replaced token layer — a full rebrand that `--audit`
reported as no change at all. Only a folder diff caught it, and only because the previous download
happened to still be on the laptop.

v3.0.0's `designCatalog.export` field was a partial fix and had the same weakness: a label is only
as honest as whoever fills it in. Both `build` and `export` are gone from `designCatalog` now. The
digest is computed from the files, so it cannot be filled in wrong; the export folder's name is
recorded beside it as a label and deliberately left out of the digest, since renaming a download
is not a design change.

The v1.0.0 baseline's inferred-commit caveat (`26337fc`, reconstructed rather than recorded) stays
true of that historical entry and affects nothing current.

## 5. Repository process

**No technical enforcement of the branch/PR rules.** Everything in
[github-process.md](github-process.md) is discipline, not a gate — nothing stops a direct push to
`main` that should have gone through a PR. That doc names the lightest backstop if it ever matters
(CODEOWNERS-based required review on `src/components/`, `docs/`, `.github/workflows/`, and
`package.json`'s version field). Not adopted; the trigger is a second contributor.

**`geo-spoke-builder` has no branch/PR convention of its own.** Out of scope for this repo's
process doc by design, but the sync PRs land there, so that repo will want its own standard
eventually.

---

## Recently closed

- **2026-09-14** — v2.0.0: the page classes are gone — `page_type`, `layout`, `standalone`,
  `src/layouts/`, `document-contract.js`, `describe.js`, `--contract`, 134 `required` flags, 27
  content bounds, 19 editorial rules, and 31 injected strings (full list in `CHANGELOG.md`). A
  document composes itself in body order. [html-render#16](https://github.com/drewgilbert-lab/html-render/pull/16)
  followed the same day: `docs/authoring.md` gained the assembly order and named-element
  vocabulary, and the synced file now ships both halves — authoring guide plus catalog — under one
  stamp, so a consumer holding the catalog without the assembly order can't write a page that
  passes `--check` and renders gutted. Downstream, geo-spoke-builder#50 rewrote all 15
  render-touching skills against that vocabulary (1,170 lines removed, 987 rewritten) and #51
  re-stamped the synced contract to match; plugin is at 0.47.1. `html-render` itself is merged to
  `main` at `eb15bf0` but not yet tagged `v2.0.0` — see §2.
- **2026-09-10** — v1.8.0: page-wide layout rules — sticky side-nav offset
  80px, no two dark bands in a row, comparison tables wrap instead of
  scrolling, citations only in the formatted slot. Output changes; not
  breaking for geo-spoke-builder Markdown. No catalog refresh.
- **2026-09-02** — v1.7.0: every page class is quieter chrome — no hero eyebrow
  or meta pills, thesis in the body, freshness bar always under the hero
  (`Data last updated: {label}`), no section-rule hairlines, single primary
  CTA. Breaking for `geo-spoke-builder` consumers that still emit pills, a
  secondary CTA, or expect the freshness bar to be optional. No catalog
  refresh.
- **2026-09-02** — v1.6.0: spoke template always composes the sticky right-rail
  `side-nav` (article and banded); banded jump nav (`.hub-toc`) is gone; the
  rail footer Book a Demo button is assembled from `cta` primary; spoke reading
  column is leftover width inside the 1340px container (~984px), not pillar's
  780px `.main-col`. Markdown (`intro` / `cta`) is unchanged; rendered chrome
  on spokes is breaking for `geo-spoke-builder` skills that still describe an
  On This Page jump nav — that copy is a follow-up after the contract stamp.
  No catalog refresh.
- **2026-09-01** — v1.5.0: the batch-migration release. Seven optional frontmatter keys give
  every page format its own JSON-LD (`article.type`, `howto` with body-derived steps, `item_list`,
  `dataset` + `DataCatalog`, `service`, `term_set`, `software`); a pillar derives an `ItemList`
  from its `link-card` blocks (closing the `create-pillar-page` blocker in the consumer's
  migration checklist); cluster `ItemList` entries carry descriptions; `trend-indicator`,
  `limitations-cards`, `key-insights`, and `bar-chart` implemented from the export, taking the
  audit from 5 to 9 covered. Opened two items rather than closing them: the composition-rule
  cascade (§3) and the `ProcessSteps` reconciliation it blocks (§3).
- **2026-09-01** — v1.4.0: second export recompile synced. `faq` rebuilt as the export's static
  Q&A list (accordion, `+` toggle and FAQ click handler all gone) and migrated to the named
  convention; `comparison-table` lost its `caption` field (breaking for page authors, though the
  published contract is byte-identical apart from stamps). Scope was deliberately two Changed
  components and no New ones. Opened two items rather than closing them: the namespace no longer
  identifies a build (§4) and table attribution now has no component (§3).
- **2026-08-26** — v1.3.0: first consumer-reported release, driven by the
  `create-glossary-spoke` migration's gap report. `standalone: true` on spokes (no breadcrumb
  bar / `BreadcrumbList` / `isPartOf`), `author.knows_about` → `Person.knowsAbout`,
  `page_skill_version` / `component_library_version` provenance keys echoed in the output
  header, citations separator `&mdash;` → `:` (and the script-comment em dash removed) — the
  rendered output now carries no dash of its own.
- **2026-08-26** — First Claude Design export ingested (build
  `HGInsightsMarketingDesignSystem_3bf70b`): `--audit` rewritten to join on manifest component
  names, `figure` and `share-bar` implemented (closing the two largest §2 gaps), `comparison-table`
  gained a fenced block composing `share-bar` in cells, `callout` synced (label now optional), the
  sync skill rewritten for the export format, and `designCatalog` re-pointed at the export build.
- **2026-08-26** — Contract sync built and merged: `designCatalog` provenance in `package.json`,
  `scripts/generate-contract.js`, `.github/workflows/sync-component-contract.yml`,
  [component-sync.md](component-sync.md). Dry run verified. (#2)
- **2026-08-26** — Sync workflow moved to `actions/checkout@v7` / `actions/setup-node@v7` on
  `node24`, clearing the Node 20 deprecation; token expiry recorded. (#3)
- **2026-09-15** — v4.1.0: the design system promotes itself. `design-export.lock.json`
  fingerprints the export (closing §4); the contract stamp carries the full 40-character renderer
  SHA and that digest; the sync runs on `push` to `main`, ships contract + plugin version +
  `CLAUDE.md` in one commit, and sets auto-merge. "Releases and tags" is gone from
  [github-process.md](github-process.md). A design release is now one reviewed pull request here
  and nothing else — no tag, no downstream merge, no pin bump, and no page re-rendered.
