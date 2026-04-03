---
name: team
description: N coordinated agents on shared task list using the OMC tmux team runtime
argument-hint: "[N:agent-type[:role]] [--new-window] <task description>"
aliases: []
level: 4
---

# Team Skill

`/team` is the canonical OMC team launcher. It must use the **`omc team ...` tmux runtime**, not Claude Code's native `Agent(team_name, name)` spawn path.

Why: the native `Agent(team_name)` path bypasses OMC's pane-ready inbox delivery pipeline (`spawnWorkerInPane()` -> `waitForPaneReady()` -> startup dispatch). That is the root cause behind issue #2120's idle-worker failures.

## Required behavior

When the user invokes `/team`, the agent must:

1. Launch through `omc team ...`
2. Verify tmux/pane startup evidence before claiming success
3. Monitor the team through `omc team status ...` / `omc team api ...`
4. Keep the team alive until work is terminal or the user explicitly aborts
5. Shut down with `omc team shutdown ...` only after terminal completion or explicit cancellation

The native `Agent(team_name, name)` / `Task(team_name=...)` route is **not** an acceptable primary launch path for this skill.

## Usage

```bash
/oh-my-claudecode:team 3:executor "fix all TypeScript errors"
/oh-my-claudecode:team 2:debugger "reproduce and fix flaky build failures"
/oh-my-claudecode:team 4:designer "improve responsive layout regressions"
/oh-my-claudecode:team "refactor the auth module with verification"
```

## Parameters

- **N** — worker count (1-20)
- **agent-type** — default worker lane or role for the execution phase
- **role** — optional explicit worker role suffix for CLI routing contracts
- **task** — the task to decompose and execute
- **--new-window** — request a dedicated tmux window when useful

## Important routing rule

`N:agent-type` controls the **execution lane / worker role contract** for `omc team` startup. It does **not** mean "spawn native Claude Code team agents via `team_name`".

Examples:

- `/team 3:executor "..."` -> `omc team 3:executor "..."`
- `/team 2:debugger "..."` -> `omc team 2:debugger "..."`
- `/team 2:codex "..."` -> `omc team 2:codex "..."`

## Launch contract

Always translate the slash command into the runtime CLI:

```bash
omc team [N:agent-type[:role]] [--new-window] "<task description>"
```

Do **not** launch with patterns like:

```text
Task(team_name="...", name="worker-1", ...)
Agent(team_name="...", name="worker-1", ...)
```

Those native calls do not guarantee OMC pane-ready startup delivery.

## Preflight

Before launch, verify:

1. `tmux` exists: `command -v tmux >/dev/null 2>&1`
2. The working tree / worktree is the intended lane
3. The task is concrete enough to decompose safely
4. If source changed, runtime artifacts will be rebuilt before claiming completion

## Startup verification

After `omc team ...`, verify concrete runtime evidence:

- tmux session / pane creation succeeded
- pane-ready polling completed for workers
- startup inbox dispatch evidence exists
- worker mailbox / task state shows progress or startup assignment

Useful checks:

```bash
omc team status <team-name>
omc team api list-tasks --input '{"team_name":"<team-name>"}' --json
tmux list-panes -a -F '#{session_name} #{pane_id} #{pane_current_command}'
```

If startup is healthy, report the team name and current phase. If not, treat the launch as failed and debug the pane-ready / dispatch path.

## Runtime expectations

The OMC runtime is expected to:

1. create panes
2. launch worker CLIs
3. wait for pane-ready state
4. write worker inbox / startup instructions
5. dispatch startup triggers
6. monitor worker/task progress

Sequential pane startup is valid but slower. If runtime code can safely launch panes first and then resolve pane-ready polling in parallel, prefer that implementation because it preserves reliability while removing avoidable startup serialization.

## Monitoring loop

Use runtime/state evidence first:

```bash
omc team status <team-name>
omc team api list-tasks --input '{"team_name":"<team-name>"}' --json
omc team api mailbox-list --input '{"team_name":"<team-name>","worker":"leader-fixed"}' --json
```

Do not rely on ad-hoc tmux typing as the primary control plane.

## Shutdown

Only shut down when one of these is true:

- all tasks are terminal and verification is complete
- the user explicitly requested cancel/abort
- the team is stale/broken and forced cleanup is necessary

Commands:

```bash
omc team shutdown <team-name>
omc team shutdown <team-name> --force
```

## Failure handling

If workers appear idle after launch:

1. confirm the launch path was `omc team ...`, not native `Agent(team_name)`
2. inspect pane-ready evidence and worker pane captures
3. inspect dispatch requests / mailbox / task state
4. retry only after identifying whether the failure is pane readiness, dispatch, or worker startup evidence

## Completion report

When finishing a `/team` task, include:

- launch path used (`omc team ...`)
- team name
- verification evidence
- shutdown status
- remaining risks or follow-up actions
