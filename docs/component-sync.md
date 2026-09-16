# Shipping the contract to `geo-spoke-builder`

`geo-spoke-builder`'s page-building skills need to know what this renderer accepts: the
frontmatter each page class requires, the order its components render in, and every component a
section can invoke. That used to live as a hand-written component manifest inside each skill, which
drifted the moment the registry changed.

This replaces those manifests with one generated file, promoted downstream on every commit to
`main` that moves it:

```text
push to main → generate contract from the live CLI → diff against geo-spoke-builder
             → nothing moved? stop
             → moved? open a PR carrying contract + plugin.json + CLAUDE.md
             → geo-spoke-builder's own checks prove the pair, and the sync merges it
```

Nobody merges that downstream pull request. The review happened on the `html-render` pull request
that produced the contract; a second human review of a generated file adds a waiting step and no
judgement. What replaces it is a set of checks that can actually be wrong — see
[What the consumer checks](#what-the-consumer-checks).

The destination is a single file:
**`geo-spoke-builder/plugins/geo-spoke-builder/references/html-render-contract.md`** — inside the
plugin's shared references, so installed sessions reach it via `${CLAUDE_PLUGIN_ROOT}`.
(Until 2026-08-26 it was the repo-root `references/html-render-contract.md`; re-pointed when the
first migrated skill needed the contract to ship with the plugin.)

---

## The sync target

The destination repository and path are repository variables on `html-render`, not literals in the
workflow file, so retargeting the sync at a different consumer takes no commit:

| Variable | Value today |
|---|---|
| `SYNC_TARGET_REPO` | `drewgilbert-lab/geo-spoke-builder` |
| `SYNC_TARGET_PATH` | `plugins/geo-spoke-builder/references/html-render-contract.md` |

```bash
gh variable set SYNC_TARGET_REPO --repo drewgilbert-lab/html-render --body drewgilbert-lab/geo-spoke-builder
gh variable set SYNC_TARGET_PATH --repo drewgilbert-lab/html-render --body plugins/geo-spoke-builder/references/html-render-contract.md
```

**Both must be set for the workflow to run at all.** An unset variable expands to an empty string,
and `actions/checkout` with an empty `repository` quietly checks out `html-render` itself — so the
first step asserts both are present and fails the run with the variable's name if either is not.

The *token* is still named literally in the workflow (`GEO_SPOKE_BUILDER_SYNC_TOKEN`), because
replacing the PAT mechanism is deliberately deferred until a second consumer repo exists — see
[open-items.md](open-items.md#1-cross-repo-sync). Retargeting today therefore means setting these
two variables *and* putting the new consumer's token in that secret.

---

## What triggers it

| Trigger | `dry_run` | What happens |
|---|---|---|
| `git push` to `main` | forced off | Generates, diffs, and (if the contract moved) opens a real PR, waits for its checks, and merges it |
| `workflow_dispatch` | defaults to **true** | Generates and diffs, prints what it *would* do, pushes nothing |

**Merging to `main` is the release.** There is no tag step and nothing is keyed to a tag any more;
tagging existed only as this trigger. The promotion sequence is in
[github-process.md](github-process.md#promotion).

The reason it is safe to run on every commit is the no-op path below: a commit that does not move
the contract costs one short run and opens nothing.

## What it does not do

- **It does not touch skill content.** It writes three files — the contract, the plugin version,
  and the version string in the consumer's `CLAUDE.md`. Not one line of a skill.
- **It does not open a PR when nothing changed.** If the generated file is byte-identical to what
  is already committed downstream, the run logs `no change, nothing to sync` and exits successfully.
  This is what makes the automation cheap to leave on: a commit that only touched tests produces no
  downstream work at all.
- **It does not render or re-render a single page.** Promotion moves what *future* work is built
  with. Every page that already exists keeps its HTML, its Markdown, its render record and its
  config snapshot, and keeps whatever provenance it was actually built with.
- **It does not summarise the diff in its own words.** The PR body pastes the relevant
  `CHANGELOG.md` entries verbatim.

## Why it writes three files

A contract landing alone would never reach a running session. Two checks in `geo-spoke-builder`
enforce that, and between them they force all three into one commit:

| File | Why it has to move |
|---|---|
| `references/html-render-contract.md` | The contract itself: the catalog and the authoring guide, and the stamp naming the exact renderer commit that belongs with it |
| `.claude-plugin/plugin.json` | A contract that lands without a version bump never syncs to an installed plugin, so every skill keeps reading the previous one. `check-contract-freshness.py` fails the build |
| `CLAUDE.md` | Its "Current state" line names the plugin version; `lint-skills.py` fails the build when the two disagree |

`geo-spoke-builder` owns all three edits, in its own `scripts/ship-contract.py`. This workflow
calls that script rather than editing three files from here, because the plugin's version rule and
the line of its `CLAUDE.md` that carries the version are its business, not this repo's.

Either check failing leaves the pull request red and unmerged. So all three move together or the
promotion does not happen at all — which is the failure mode you want: the pointer simply does not
advance, and every existing page stays exactly as it was.

**Why the sync waits and merges rather than setting GitHub's auto-merge.** Auto-merge is not
available on `geo-spoke-builder`: it is a private repository on a free plan, where branch
protection is a paid feature, and auto-merge requires it — `allow_auto_merge` silently stays
false. So the workflow does what auto-merge would have done, with `gh pr checks --watch`
followed by `gh pr merge`. The checks are the gate either way. If that repository ever moves to
a plan with branch protection, `gh pr merge --auto` becomes the simpler option.

## What the consumer checks

Before that pull request can merge, `geo-spoke-builder` CI:

- checks out the **exact renderer commit** named in the contract stamp (which is why that stamp
  carries the full 40-character SHA — `actions/checkout` cannot resolve an abbreviated one);
- confirms that renderer's `package.json` version equals the contract's version;
- confirms the contract **regenerates byte-identically** from that commit;
- confirms every component named as a fenced block in a skill's `## Design Components` section
  exists in the new contract;
- runs `lint-skills.py` and `check-contract-freshness.py`.

If any of that fails the pull request stays open and unmerged, `geo-spoke-builder/main` keeps
pointing at the previous pair, and `pillar-geo-launch` keeps resolving it. Nothing rolls back
because nothing was promoted.

## How the file is built

[`scripts/generate-contract.js`](../scripts/generate-contract.js) assembles two halves under a
provenance header: [`docs/authoring.md`](authoring.md) verbatim, minus its H1, then the capture of
`--components`. Nothing is transcribed by hand, so neither half can drift from the source it comes
from the way the old per-skill manifests and assembly instructions did.

Both halves ship in one file on purpose. How a document is assembled and what it can be assembled
from change together, and a consumer that has one without the other writes pages that pass
`--check` and come out gutted.

Run it locally any time:

```bash
node scripts/generate-contract.js --out /tmp/contract.md
```

**The output must stay a pure function of the committed state.** No timestamps, no run IDs, nothing
that varies between two runs at the same commit — the no-op path above is a byte-comparison, so
anything time-varying turns every release into a PR full of noise. If you add a field to the
header, derive it from a file in the repo.

The header carries a machine-readable stamp:

```html
<!-- html-render:contract version=1.1.0 commit=2b2d9e5 catalog=26337fc… -->
```

The workflow parses `commit=` out of the *previous* copy of the file, before overwriting it, and
uses it to decide which changelog entries are new — `CHANGELOG.md` is append-only, so "new" is
exactly "headings that did not exist at that commit". `catalog=` comes from `designCatalog` in
`package.json`, which the [sync skill](../.claude/skills/sync-design-components/SKILL.md) updates
in Step 6 on every design-catalog reconciliation.

### The breaking-change flag

If any of those changelog entries is tagged `**Removed**`, `**Deprecated**`, or `**Changed**`, the
PR body is prefixed with a **Potentially breaking** banner naming the tag that tripped it.

This is deliberately over-eager. Whether a `Changed` entry carries an incompatible field is a
judgement about prose that a script cannot make, and a missed breaking change costs a downstream
maintainer far more than a banner that takes five seconds to dismiss. Do not "fix" it by narrowing
the match without replacing it with something that actually reads the field contracts.

## The token

The workflow authenticates to `geo-spoke-builder` with a fine-grained personal access token, stored
as the `GEO_SPOKE_BUILDER_SYNC_TOKEN` Actions secret on **`html-render`**.

| | |
|---|---|
| Scope | The `geo-spoke-builder` repository only |
| Permissions | `Contents: Read and write`, `Pull requests: Read and write` |
| Created | 2026-08-26 |
| **Expires** | **2026-11-24** (90 days) |

Why a PAT and not the alternatives: a deploy key cannot call the pull request API, and a GitHub App
is not justified while `geo-spoke-builder` is the only consumer. Revisit the App when a second
consumer repo appears.

**Nothing owns renewing this token, and it expires on 2026-11-24.** When it expires the sync fails
on the `Check out geo-spoke-builder` step — loudly in Actions, but silently in the sense that nobody
is watching Actions. If a commit lands on `main` and no sync PR appears
downstream, check the token first.

Rotating it is two steps: create a replacement with the same scope and permissions, then
`gh secret set GEO_SPOKE_BUILDER_SYNC_TOKEN --repo drewgilbert-lab/html-render`. Update the dates in
the table above at the same time — that table is the only record of when it lapses.

## Testing it safely

`workflow_dispatch` defaults `dry_run` to true, so the safe test is the default:

```bash
gh workflow run sync-component-contract.yml -f dry_run=true
```

It generates the contract, diffs it against `geo-spoke-builder`, and writes the PR body and the
full diff to the run summary without pushing a branch or opening anything. Read the summary, then:

```bash
gh run watch && gh run view --log
```

To exercise the real path without merging to `main`, dispatch it with `-f dry_run=false`. That
opens a genuine PR downstream — it is still only a PR, never a merge, but it is a real write to
another repository, so do it deliberately.

Note that `workflow_dispatch` only works once the workflow file is on `main`; you cannot dispatch it
from a branch.
