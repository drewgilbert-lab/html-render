# Open items

What is outstanding in this repository, why, and what unblocks it. Reviewed when a release is cut
and whenever the design catalog refreshes.

**This file is hand-kept, and that makes it the exception here.** Everything else this repo reports
about coverage — `--audit`, `--components`, `--contract` — is generated from live state precisely so
it cannot drift. A list like this one can and will drift. Two rules keep it honest:

- **Never restate a number this repo can generate.** Where a section needs the component picture,
  it names the command instead. The snapshot below is dated; the command is the truth.
- **Close items here in the same commit that closes them for real.** An item that lingers after the
  work is done is worse than no list.

```bash
node bin/html-render.js --audit /path/to/claude-design-export   # coverage vs. the export
node bin/html-render.js --components                            # what is implemented now
```

Last reviewed: **2026-08-26**, against Claude Design export build
`HGInsightsMarketingDesignSystem_3bf70b` and `html-render` v1.2.0.

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

**The sync token expires 2026-11-24** and nothing owns renewing it. When it lapses the workflow
fails on `Check out geo-spoke-builder` — loudly in Actions, but nobody watches Actions on a repo
that only builds on tags. Rotation steps and the dates are in
[component-sync.md](component-sync.md#the-token).

**Revisit a GitHub App instead of a PAT** when a second consumer repo appears. A fine-grained PAT is
the right call for one consumer; it stops being so once the token is shared, and an App would end
the expiry problem above.

**The breaking-change flag fires on `Changed` as well as `Removed`/`Deprecated`.** Deliberate — a
script cannot judge "incompatible field" from prose, and a missed break costs more than a dismissed
banner. It fired on the first dry run for a CSS *comment* rename. If that proves noisy in practice,
the fix is something that reads the field contracts, not a narrower regex.

## 2. Consumer migration

**All 13 page-building skills in `geo-spoke-builder` still carry hand-written component manifests.**
None of them read `references/html-render-contract.md` — and until 2026-08-27 that file did not
exist downstream at all. This section previously called it "delivered but unconsumed"; the first
half was wrong. The 2026-08-27 sync run read the target path directly before writing ("No previous
contract file at `references/html-render-contract.md` — first sync") — delivery was
[geo-spoke-builder#23](https://github.com/drewgilbert-lab/geo-spoke-builder/pull/23), reviewed and
merged 2026-08-27. Rewriting each skill's "Design Components" section happens skill-by-skill
as it migrates to the `html-render` pipeline, not in one pass.

Cross-checking those manifests against this registry (the procedure is
[Step 5 of the sync skill](../.claude/skills/sync-design-components/SKILL.md)) surfaces components
skills already name that this renderer does not implement. The skills still reference the retired
numbered filenames; the export name each maps to is given where known. As of 2026-08-26:

| Component (skill manifests) | Export name | Skills naming it | Note |
|---|---|---|---|
| `53-figure-block` | `Figure` | **10** | ✅ Implemented 2026-08-26 (`figure`) |
| `33-limitations-cards` | `LimitationsCards` | 5 | |
| `32-approach-implication-table` | `ApproachImplicationTable` | 4 | **Blocked** — see the token ambiguity in §3 |
| `57-share-bar` | `ShareBar` | 3 | ✅ Implemented 2026-08-26 (`share-bar`, composed in `comparison-table` cells) |
| `58-trend-indicator` | `TrendIndicator` | 3 | Cell-level primitive; can follow `share-bar`'s composition pattern |
| `08`, `18`, `19` | not yet mapped | 2 each | Reconcile against the export manifest by name |
| `07`, `20`, `21`, `22`, `55` | not yet mapped | 1 each | Same |
| `54-inline-highlight` | `NameHighlight` | 1 | Needs the inline-syntax decision in §3 |

Regenerate that ranking rather than trusting the table:

```bash
grep -rhoE '`[0-9]{2}-[a-z0-9-]+\.md`' <geo-spoke-builder>/plugins/geo-spoke-builder/skills/*/SKILL.md \
  | tr -d '`' | sort | uniq -c | sort -rn
```

`01-header-nav` is named by all 13 skills but is **out of scope by design** — site chrome around the
page body is not the renderer's to own, so it never emits it. The Claude Design export has no
site-header component at all, so there is nothing to reconcile it against; the mismatch is worth
settling explicitly during migration so a skill author does not read it as one.

## 3. Component coverage

**Most of the 63 exported components are not implemented** (run `--audit <export-dir>` for the
live list — it also shows which existing implementations still carry the retired numbered `source`
convention and cannot yet join on export names). Deferred by decision, not oversight.

**The numbered→named `source` migration is transitional and deliberate.** The 2026-08-26 pass
moved the audit join to export component names, but only the four components it touched (`Figure`,
`ShareBar`, `ComparisonTable`, `Callout`) adopted the new convention. Every other registry entry
and CSS header still carries the retired numbered form and is reported by `--audit` in its
"Legacy" bucket. Each migrates when its component is next touched — never in bulk. One carries a
known debt into that migration: `bars` (`10-supporting-charts (mini bar)`) was built against a
pre-refresh design the retired catalog never fully caught up with, so its reconciliation against
the export's `MiniBarChart` needs a real comparison, not just a `source` rename.

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

**Resolved for the export era, recorded here for the paper trail.** `designCatalog` in
`package.json` now records the Claude Design export build by its manifest `namespace`
(`HGInsightsMarketingDesignSystem_3bf70b`) — the export has no git commit and no version stamp, so
the namespace suffix, which changes when the export is recompiled, is the build identity (decided
with Drew, 2026-08-26). The retired catalog's inferred-commit caveat for the v1.0.0 baseline
(`26337fc`, reconstructed rather than recorded) stays true of that historical entry but no longer
affects anything current.

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
