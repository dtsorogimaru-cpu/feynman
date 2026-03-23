---
description: Simulate an AI research peer review with likely objections, severity, and a concrete revision plan.
---
Review this AI research artifact: $@

Requirements:
- Spawn a `researcher` subagent to gather evidence on the artifact — inspect the paper, code, cited work, and any linked experimental artifacts. Save to `research.md`.
- Spawn a `reviewer` subagent with `research.md` to produce the final peer review with inline annotations.
- For small or simple artifacts where evidence gathering is overkill, run the `reviewer` subagent directly instead.
- Save exactly one review artifact to `outputs/` as markdown.
- End with a `Sources` section containing direct URLs for every inspected external source.
