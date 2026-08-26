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
node bin/html-render.js --audit /path/to/design-web-components   # coverage vs. the catalog
node bin/html-render.js --components                             # what is implemented now
```

Last reviewed: **2026-08-26**, against catalog commit `26337fc` and `html-render` v1.1.0.

---

## 1. Cross-repo sync

The pipeline is built and merged; it has never performed a real write.

| Item | Status | What unblocks it |
|---|---|---|
| Real sync run (`dry_run=false`) | **Awaiting go-ahead** | Drew's explicit approval — it opens a real PR in `geo-spoke-builder` |
| No-op run, proving Step 3.5 | **Blocked** | The real run's PR being merged downstream. Until `references/html-render-contract.md` exists on `geo-spoke-builder`'s `main`, every run legitimately sees a new file |
| Dry run | ✅ Passed 2026-08-26 | — |

**`SYNC_TARGET_REPO` and `SYNC_TARGET_PATH` must be set as Actions variables** on `html-render`
before the next tag. The workflow reads its destination from them instead of hardcoded literals now,
and stops at its first step if either is missing rather than checking out the wrong repository. The
values and the two `gh variable set` commands are in
[component-sync.md](component-sync.md#the-sync-target). The *token* stays a literal secret name —
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
None of them read `references/html-render-contract.md` yet — that file is delivered but unconsumed.
Rewriting each skill's "Design Components" section happens skill-by-skill as it migrates to the
`html-render` pipeline, not in one pass.

Cross-checking those manifests against this registry (the procedure is
[Step 5 of the sync skill](../.claude/skills/sync-design-components/SKILL.md)) surfaces components
skills already name that this renderer does not implement. As of 2026-08-26:

| Component | Skills naming it | Note |
|---|---|---|
| `53-figure-block` | **10** | The largest single gap. No blocking ambiguity — it is deferred, not stuck |
| `33-limitations-cards` | 5 | |
| `32-approach-implication-table` | 4 | **Blocked** — see the token ambiguity in §3 |
| `57-share-bar` | 3 | Needs the inline-primitive syntax decision in §3 |
| `58-trend-indicator` | 3 | Same |
| `08`, `18`, `19` | 2 each | |
| `07`, `20`, `21`, `22`, `54`, `55` | 1 each | |

Regenerate that ranking rather than trusting the table:

```bash
grep -rhoE '`[0-9]{2}-[a-z0-9-]+\.md`' <geo-spoke-builder>/plugins/geo-spoke-builder/skills/*/SKILL.md \
  | tr -d '`' | sort | uniq -c | sort -rn
```

`01-header-nav` is named by all 13 skills but is **out of scope by design** — site chrome around the
page body is not the renderer's to own, so it never emits it. Not a gap, but the mismatch is worth
settling explicitly during migration so a skill author does not read it as one.

## 3. Component coverage

**18 catalogued components are not implemented.** Deferred by decision at the v1.0.0 baseline, not
oversight. Run `--audit` for the live list.

Two of them are blocked on a decision rather than on effort:

**Component 32 — an unresolved catalog contradiction.** `32-approach-implication-table.md` states
`--hg-bg` is `#f6f8fa`, "a barely-there off-white tint to distinguish the label column."
`00-design-tokens.md` defines `--hg-bg: #FFFFFF`. Copying the CSS verbatim renders the intended tint
invisible. **Ask before implementing 32** — this is on record in `CHANGELOG.md` and in Step 3 of the
sync skill, and four skills already reference the component.

**Components 54, 57, 58 need a Markdown-syntax decision first.** `inline-highlight`, `share-bar`,
and `trend-indicator` are inline- and cell-level primitives. They do not fit the fenced-block
registry model every other component uses, so there is no way for an author to invoke them until
someone decides what the Markdown looks like. That decision gates all three.

**`10-supporting-charts` is still on the pre-refresh design.** The catalog's own refresh history
records that it was not part of the 2026-07-17 pass — no source component existed for it yet — and
it received only a token-alignment pass. It will need real work whenever the catalog gains one.

## 4. Provenance

**`designCatalog.commit` in `package.json` is inferred, not recorded.** `CHANGELOG.md` documents the
baseline only as the date `2026-07-17`, and no catalog commit exists on that date. The value on
record, `26337fc`, is the catalog HEAD the local checkout is clean and current at, and is consistent
with the v1.0.0 audit — it covers `59-author-byline` and `60-citations-list`, which that commit
introduced. Worth confirming if anyone can reconstruct which checkout v1.0.0 was actually built
against; every future entry is exact, since
[Step 6 of the sync skill](../.claude/skills/sync-design-components/SKILL.md) now reads the hash
from git.

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

- **2026-08-26** — Contract sync built and merged: `designCatalog` provenance in `package.json`,
  `scripts/generate-contract.js`, `.github/workflows/sync-component-contract.yml`,
  [component-sync.md](component-sync.md). Dry run verified. (#2)
- **2026-08-26** — Sync workflow moved to `actions/checkout@v7` / `actions/setup-node@v7` on
  `node24`, clearing the Node 20 deprecation; token expiry recorded. (#3)
