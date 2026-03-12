---
agent: ask
name: reflect
description: Create a concise retrospective on how a coding or debugging session went, focusing on process, evidence, and improvements.
model: GPT-5.4
---

Create a short, practical reflection about the current or described session.

Focus on **how** the work was done, not just what changed.

Cover:
- what worked well
- what slowed things down or caused confusion
- whether verification was strong enough
- what should be repeated next time
- what should change next time

Repository-specific guidance:
- Prefer evidence-backed reflection over vague impressions
- Do not create a new file unless the user explicitly asks to save the reflection
- Do not create extra status or planning documents by default
- If verification was weak or incomplete, say so plainly

Output format:

## Session reflection

### What worked
- Bullet list

### What didn’t
- Bullet list

### Evidence quality
- Short assessment of how strong the verification was

### Next-time improvements
- Bullet list

Keep it concise and practical.
