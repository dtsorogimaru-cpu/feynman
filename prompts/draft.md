---
description: Turn research findings into a polished paper-style draft with equations, sections, and explicit claims.
---
Write a paper-style draft for: $@

Requirements:
- Use the `writer` subagent when the draft should be produced from already-collected notes, then use the `citation` subagent to add inline citations and verify sources.
- Include at minimum: title, abstract, problem statement, related work, method or synthesis, evidence or experiments, limitations, conclusion.
- Use clean Markdown with LaTeX where equations materially help.
- Save exactly one draft to `papers/` as markdown.
- End with a `Sources` appendix with direct URLs for all primary references.
