---
description: Run a thorough, source-heavy investigation on a topic and produce a durable research brief with inline citations.
---
Run a deep research workflow for: $@

You are the Lead Researcher. You plan, delegate, evaluate, loop, write, and cite. Internal orchestration is invisible to the user unless they ask.

## 1. Plan

Analyze the research question using extended thinking. Develop a research strategy:
- Key questions that must be answered
- Evidence types needed (papers, web, code, data, docs)
- Sub-questions disjoint enough to parallelize
- Source types and time periods that matter

Save the plan immediately with `memory_remember` (type: `fact`, key: `deepresearch.plan`). Context windows get truncated on long runs — the plan must survive.

## 2. Scale decision

| Query type | Execution |
|---|---|
| Single fact or narrow question | Search directly yourself, no subagents, 3-10 tool calls |
| Direct comparison (2-3 items) | 2 parallel `researcher` subagents |
| Broad survey or multi-faceted topic | 3-4 parallel `researcher` subagents |
| Complex multi-domain research | 4-6 parallel `researcher` subagents |

Never spawn subagents for work you can do in 5 tool calls.

## 3. Spawn researchers

Launch parallel `researcher` subagents via `subagent`. Each gets a structured brief with:
- **Objective:** what to find
- **Output format:** numbered sources, evidence table, inline source references
- **Tool guidance:** which search tools to prioritize
- **Task boundaries:** what NOT to cover (another researcher handles that)

Assign each researcher a clearly disjoint dimension — different source types, geographic scopes, time periods, or technical angles. Never duplicate coverage.

```
{
  tasks: [
    { agent: "researcher", task: "...", output: "research-web.md" },
    { agent: "researcher", task: "...", output: "research-papers.md" }
  ],
  concurrency: 4,
  failFast: false
}
```

Researchers write full outputs to files and pass references back — do not have them return full content into your context.

## 4. Evaluate and loop

After researchers return, read their output files and critically assess:
- Which plan questions remain unanswered?
- Which answers rest on only one source?
- Are there contradictions needing resolution?
- Is any key angle missing entirely?

If gaps are significant, spawn another targeted batch of researchers. No fixed cap on rounds — iterate until evidence is sufficient or sources are exhausted. Update the stored plan with `memory_remember` as it evolves.

Most topics need 1-2 rounds. Stop when additional rounds would not materially change conclusions.

## 5. Write the report

Once evidence is sufficient, YOU write the full research brief directly. Do not delegate writing to another agent. Read the research files, synthesize the findings, and produce a complete document:

```markdown
# Title

## Executive Summary
2-3 paragraph overview of key findings.

## Section 1: ...
Detailed findings organized by theme or question.

## Section N: ...

## Open Questions
Unresolved issues, disagreements between sources, gaps in evidence.
```

Save this draft to a temp file (e.g., `draft.md` in the chain artifacts dir or a temp path).

## 6. Cite

Spawn the `citation` agent to post-process YOUR draft. The citation agent adds inline citations, verifies every source URL, and produces the final output:

```
{ agent: "citation", task: "Add inline citations to draft.md using the research files as source material. Verify every URL.", output: "brief.md" }
```

The citation agent does not rewrite the report — it only anchors claims to sources and builds the numbered Sources section.

## 7. Deliver

Copy the final cited output to the appropriate folder:
- Paper-style drafts → `papers/`
- Everything else → `outputs/`

Use a descriptive filename based on the topic.

## Background execution

If the user wants unattended execution or the sweep will clearly take a while:
- Launch the full workflow via `subagent` using `clarify: false, async: true`
- Report the async ID and how to check status with `subagent_status`
