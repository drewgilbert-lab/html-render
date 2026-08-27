# Shipping the contract to `geo-spoke-builder`

`geo-spoke-builder`'s page-building skills need to know what this renderer accepts: the
frontmatter each page class requires, the order its components render in, and every component a
section can invoke. That used to live as a hand-written component manifest inside each skill, which
drifted the moment the registry changed.

This replaces those manifests with one generated file, pushed downstream as a pull request when a
release is tagged:

```text
tag v1.2.0 → generate contract from the live CLI → diff against geo-spoke-builder
           → open a PR if it moved → Drew reviews and merges
```

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
| `git push` of a `v*` tag | forced off | Generates, diffs, and opens a real PR if the contract moved |
| `workflow_dispatch` | defaults to **true** | Generates and diffs, prints what it *would* do, pushes nothing |

Tagging is the only automatic trigger. Ordinary commits to `main` do not sync — a contract change
reaches `geo-spoke-builder` when Drew decides a version is ready, not when it lands on `main`. The
tag/release sequence is in [github-process.md](github-process.md#releases-and-tags).

## What it does not do

- **It does not touch skill content.** It writes exactly one file. Rewriting each page-skill's
  "Design Components" section to read from that file is a separate, per-skill migration.
- **It does not auto-merge.** Every PR it opens is reviewed and merged by hand. There is no
  `gh pr merge --auto` in the workflow, deliberately.
- **It does not open a PR when nothing changed.** If the generated file is byte-identical to what
  is already committed downstream, the run logs `no change, nothing to sync` and exits successfully.
  This is what makes the automation cheap to leave on: a release that only touched tests produces
  no downstream review work.
- **It does not summarise the diff in its own words.** The PR body pastes the relevant
  `CHANGELOG.md` entries verbatim.

## How the file is built

[`scripts/generate-contract.js`](../scripts/generate-contract.js) shells out to the CLI —
`--contract pillar`, `--contract cluster`, `--contract spoke`, `--components` — and concatenates
the four captures under a provenance header. Nothing is transcribed by hand, so the file cannot
drift from the registry the way the old manifests did.

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
is watching Actions on a repo that only builds on tags. If a release goes out and no sync PR appears
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

To exercise the real path without tagging a release, dispatch it again with `-f dry_run=false`. That
opens a genuine PR downstream — it is still only a PR, never a merge, but it is a real write to
another repository, so do it deliberately.

Note that `workflow_dispatch` only works once the workflow file is on `main`; you cannot dispatch it
from a branch.
