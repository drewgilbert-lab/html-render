# Git workflow standards

**Scope:** this document governs `html-render` only. It does not set
conventions for `geo-spoke-builder` or any other repository — each repo that
wants a similar standard should adopt its own, since ownership, risk profile,
and audience differ per repo.

**Audience:** Drew, working solo, and any Claude Code session operating on
this repository. Read this before opening a branch, committing, or merging to
`main` — merging is what promotes a design change downstream.

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
   - Any change to the rendering pipeline itself (parse, check, body walk, or
     render stages), or to the region vocabulary in `src/body.js`.
   - Any change to what `geo-spoke-builder`'s skills read: `docs/authoring.md`
     and anything that changes `--components` output, since that is what the
     catalog sync ships downstream. These are downstream dependencies now, not
     just local documentation.
   - Any change to `.github/workflows/` or anything touching the deploy key /
     PAT used for the cross-repo sync.
   - A version bump. `package.json`'s version is stamped into the contract
     that ships downstream, so bumping it is a cross-repo action regardless of
     how small the diff looks (see [Promotion](#promotion), below).

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
- For anything that changes `--components` output or `docs/authoring.md`: a
  one-line note on whether this is a breaking change for `geo-spoke-builder`
  consumers.

## Merge strategy

Squash merge into `main`. `CHANGELOG.md` is the durable per-component record,
not the commit graph — squashing keeps `main`'s history readable without
losing anything, since the changelog entry (see Phase 1, Step 6) carries the
detail a reviewer would otherwise look for in individual commits.

## Promotion

Merging to `main` is the release. There is no tag step, and nothing is keyed to
a tag any more.

When a commit lands on `main`, the sync workflow regenerates the contract and
compares it byte for byte with what `geo-spoke-builder` already holds. A commit
that did not move the contract (a README fix, a test-only change) opens nothing
and costs one short run. A commit that did move it opens a pull request there
carrying three files — the contract, the plugin version, and the version string
in that repo's `CLAUDE.md`. That repo merges its own pull request once its own
checks pass, and those checks decide whether it lands: they check out the exact renderer commit the
contract names, confirm the contract regenerates from it byte-identically, and
confirm every component the skills name exists in it.

So the review that matters is the one on the pull request here. Sequence:

1. Merge the change into `main` via PR, per the rules above.
2. Bump `package.json`'s version in that same PR whenever the change alters
   what `--components` prints or what `docs/authoring.md` says — i.e. anything
   a downstream consumer reads. The version is human-readable metadata on the
   contract; the full commit SHA beside it is what consumers actually resolve.
3. Nothing else. Merging fires the sync, `geo-spoke-builder` merges it once its
   checks pass, and the next newly admitted `pillar-geo-launch` job uses the new
   pair. No page is re-rendered, and no existing page changes.

Tags are still fine to cut as bookkeeping. Nothing reads them.

**A design change must never require a coordinated skill rewrite downstream.**
If a change would break authoring vocabulary a `geo-spoke-builder` skill already
uses, the compatibility belongs in this repo, in the same PR, before promotion —
not in a follow-up pull request against the consumer.

## Secrets

The deploy key or fine-grained PAT used to open PRs into `geo-spoke-builder`
lives only as an `html-render` Actions secret — never in a commit, an issue,
or this documentation. Fine-grained PATs expire (GitHub caps them at one
year); note the expiry date wherever the secret is created. The current one
expires **2026-11-24**.

An expired token now fails visibly rather than silently: the sync runs on every
push to `main`, so it fails on the next commit rather than on the next tag
somebody remembers to cut, and because `geo-spoke-builder/main` is the
production pointer, a sync that never lands means `pillar-geo-launch` visibly
stops picking up the new design instead of quietly rendering against a stale
one.

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
