# Git workflow standards

**Scope:** this document governs `html-render` only. It does not set
conventions for `geo-spoke-builder` or any other repository — each repo that
wants a similar standard should adopt its own, since ownership, risk profile,
and audience differ per repo.

**Audience:** Drew, working solo, and any Claude Code session operating on
this repository. Read this before opening a branch, committing, or tagging a
release.

---

## Default: commit directly to `main`

This is a solo-owned repository. Routine, low-risk work — doc wording,
test-only additions, README fixes, non-breaking internal refactors reviewed
live in the session — commits straight to `main`. Do not create a branch and
PR for these; the overhead isn't earning its keep at this repo's current
scale.

## When a branch + PR is required instead

Two triggers. If either applies, the change goes through a branch and a pull
request before it reaches `main` — no exceptions for "it's a small change."

1. **The change is higher-risk.** For this repo, that means any of:

   - A component addition, change, removal, or deprecation — i.e., anything
     Phase 1 of the component-sync process touches (`src/components/blocks.js`,
     `src/components/page.js`, `src/assets/styles.css`, and their paired docs
     and tests).
   - Any change to the rendering pipeline itself (parse, validate, layout, or
     render stages), or to `src/validate/document-contract.js`.
   - Any change to the three contract docs that `geo-spoke-builder`'s skills
     read (`docs/markdown-contract.md`, `docs/page-layouts.md`,
     `docs/component-library.md`) — these are downstream dependencies now,
     not just local documentation.
   - Any change to `.github/workflows/` or anything touching the deploy key /
     PAT used for the cross-repo sync.
   - A version bump and tag (see [Releases and tags](#releases-and-tags),
     below — tagging is always cross-repo regardless of how small the diff
     looks).

2. **Claude Code is running unsupervised** — a scheduled run, a long
   autonomous session, or any run where Drew isn't reviewing the diff live
   before it lands. Unsupervised work always goes through a PR, regardless of
   risk category, so there's a review point before anything merges.

Routine solo work that touches none of the above and is being reviewed live
stays direct-to-`main`.

## Branch naming

Keep it short and reuse the vocabulary this repo already uses in
`CHANGELOG.md` (New / Changed / Removed / Deprecated) and in the Phase 1
process, rather than inventing a second taxonomy:

- `component/<name>` — a New or Changed component (e.g. `component/figure-block`)
- `deprecate/<name>` — a Removed/Deprecated component
- `fix/<short-desc>` — a bug fix outside the component set
- `pipeline/<short-desc>` — parse/validate/layout/render or contract changes
- `ci/<short-desc>` — workflow or secrets changes

## Commit messages

Prefix with the same category the change belongs to, so `git log` reads
consistently with `CHANGELOG.md`:

```
component(new): figure block (53-figure-block)
component(changed): comparison-table share-bar width model
component(deprecated): <name> — replaced by <name>
pipeline: <what changed>
docs: <what changed>
ci: <what changed>
chore(release): v1.1.0
```

One logical change per commit. Don't bundle an unrelated component's edits
into the same commit as another — this mirrors Phase 1's "one-component
change, one-component diff" rule at the commit level, not just the file
level.

## What a PR must contain

- Which component(s) or area changed, and its classification (New / Changed /
  Removed / Deprecated) if applicable.
- Confirmation the diff is scoped — no unrelated component's code, CSS, or
  docs touched. This is a direct carry-over of Phase 1's hard rule; a PR that
  fails this gets split, not merged as-is.
- Test results: `npm test` output, and
  `node bin/html-render.js examples/*.md --check` confirming existing
  examples still render as expected (or an explicit note of which example's
  output changed and why, if a Changed component legitimately alters it).
- For anything touching the contract docs: a one-line note on whether this is
  a breaking change for `geo-spoke-builder` consumers.

## Merge strategy

Squash merge into `main`. `CHANGELOG.md` is the durable per-component record,
not the commit graph — squashing keeps `main`'s history readable without
losing anything, since the changelog entry (see Phase 1, Step 6) carries the
detail a reviewer would otherwise look for in individual commits.

## Releases and tags

Tagging is the trigger for Phase 2's GitHub Actions workflow, which opens a
PR into `geo-spoke-builder`. Because of that, a tag is a cross-repo action by
definition — always goes through the PR path first, never tagged directly off
an uncommitted or unreviewed state on `main`, even under the lightweight
rules above. Sequence:

1. Merge the release-worthy change(s) into `main` via PR, per the rules above.
2. Bump `package.json`'s version on `main` (patch / minor per Phase 1, Step
   7's rule) — this itself is a small PR if it lands separately from the
   component change, or part of the same PR if bundled.
3. Tag `main` at that commit (`vX.Y.Z`). This is the manual "this version is
   ready" gate — Drew's call, not automated.
4. The tag triggers the sync workflow into `geo-spoke-builder`. That
   destination PR is reviewed and merged manually (no auto-merge) until
   there's a reason to trust it otherwise.

## Secrets

The deploy key or fine-grained PAT used to open PRs into `geo-spoke-builder`
lives only as an `html-render` Actions secret — never in a commit, an issue,
or this documentation. Fine-grained PATs expire (GitHub caps them at one
year); note the expiry date wherever the secret is created and put a
reminder somewhere durable, since an expired token fails the sync silently
rather than loudly.

## What this document doesn't cover

- `geo-spoke-builder`'s own branch/PR conventions for the destination side of
  the sync, or for its own unrelated skill work — that repo sets its own
  standard if and when it needs one.
- Enforced GitHub branch protection. Everything above is process discipline,
  not a technical gate — nothing stops a direct push to `main` that should
  have gone through a PR. If that gap ever matters (e.g., once this repo has
  more than one contributor), a CODEOWNERS-based required review on
  `src/components/`, `docs/`, `.github/workflows/`, and `package.json`'s
  version field is the lightest technical backstop that matches the risk
  categories above — not adopted now, just noted as the next lever if
  needed.
