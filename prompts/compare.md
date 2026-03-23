---
description: Compare multiple sources on a topic and produce a source-grounded matrix of agreements, disagreements, and confidence.
---
Compare sources for: $@

Requirements:
- Use the `researcher` subagent to gather source material when the comparison set is broad, and the `citation` subagent to verify sources and add inline citations to the final matrix.
- Build a comparison matrix covering: source, key claim, evidence type, caveats, confidence.
- Distinguish agreement, disagreement, and uncertainty clearly.
- Save exactly one comparison to `outputs/` as markdown.
- End with a `Sources` section containing direct URLs for every source used.
