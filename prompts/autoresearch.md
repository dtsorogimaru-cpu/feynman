---
description: Autonomous experiment loop — try ideas, measure results, keep what works, discard what doesn't, repeat.
---
Start an autoresearch optimization loop for: $@

This command uses pi-autoresearch. Enter autoresearch mode and begin the autonomous experiment loop.

## Behavior

- If `autoresearch.md` and `autoresearch.jsonl` already exist in the project, resume the existing session with the user's input as additional context.
- Otherwise, gather the optimization target from the user:
  - What to optimize (test speed, bundle size, training loss, build time, etc.)
  - The benchmark command to run
  - The metric name, unit, and direction (lower/higher is better)
  - Files in scope for changes
- Then initialize the session: create `autoresearch.md`, `autoresearch.sh`, run the baseline, and start looping.

## Loop

Each iteration: edit → commit → `run_experiment` → `log_experiment` → keep or revert → repeat. Do not stop unless interrupted or `maxIterations` is reached.

## Key tools

- `init_experiment` — one-time session config (name, metric, unit, direction)
- `run_experiment` — run the benchmark command, capture output and wall-clock time
- `log_experiment` — record result, auto-commit, update dashboard

## Subcommands

- `/autoresearch <text>` — start or resume the loop
- `/autoresearch off` — stop the loop, keep data
- `/autoresearch clear` — delete all state and start fresh
