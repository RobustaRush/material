# Issue tracker: GitHub (private, cross-repo)

Issues and specs for this repo (`viewflow/material`, public) live as GitHub issues on
**`kmmbvnr/viewflow-pro`** — a separate, private repo — not on `viewflow/material` itself.

This is intentional: `material`'s own issue tracker is public, but planning/decision work
(wayfinder maps, specs, triage) for it should stay private until it's ready to ship. Always
pass `--repo kmmbvnr/viewflow-pro` explicitly — `gh`'s auto-detection from `git remote -v`
would otherwise resolve to `viewflow/material` and silently target the wrong repo.

## Conventions

- **Create an issue**: `gh issue create --repo kmmbvnr/viewflow-pro --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --repo kmmbvnr/viewflow-pro --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --repo kmmbvnr/viewflow-pro --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --repo kmmbvnr/viewflow-pro --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --repo kmmbvnr/viewflow-pro --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --repo kmmbvnr/viewflow-pro --comment "..."`

Since `material`'s working tree does not point at `kmmbvnr/viewflow-pro`, every `gh issue`/`gh api`
call in this repo's skills MUST carry `--repo kmmbvnr/viewflow-pro` (or the equivalent
`repos/kmmbvnr/viewflow-pro/...` path for `gh api`). Never rely on remote auto-detection here.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue on `kmmbvnr/viewflow-pro`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo kmmbvnr/viewflow-pro --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets, all on `kmmbvnr/viewflow-pro`.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --repo kmmbvnr/viewflow-pro --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api repos/kmmbvnr/viewflow-pro/... ` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/kmmbvnr/viewflow-pro/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/kmmbvnr/viewflow-pro/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --repo kmmbvnr/viewflow-pro --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --repo kmmbvnr/viewflow-pro --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --repo kmmbvnr/viewflow-pro --body "<answer>"`, then `gh issue close <n> --repo kmmbvnr/viewflow-pro`, then append a context pointer (gist + link) to the map's Decisions-so-far.
