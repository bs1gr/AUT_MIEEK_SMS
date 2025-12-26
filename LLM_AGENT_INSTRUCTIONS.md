# LLM Agent & Plugin Edit Policy (MANDATORY)

**All LLMs, code assistants, and plugin helpers working in this workspace MUST strictly follow these rules:**

1. **Full-File Awareness:**
   - Before making any edit, read the entire file and validate it is parseable and not corrupted (no duplicate blocks, no syntax errors, no unclosed strings).
   - Never apply a patch or edit based on partial context or a stale view of the file.

2. **No Overlapping Edits:**
   - Only one agent or tool may edit a file at a time. If another agent or tool has recently edited the file, review and validate the file before proceeding.
   - Do not run multiple automated edits or refactors on the same file in parallel.

3. **Corruption Checks:**
   - Abort and warn if the file is not in a valid, parseable state before editing.
   - After editing, re-validate the file for corruption, duplication, or syntax errors.

4. **Human/Agent Review:**
   - After any automated or LLM edit, a human or agent must review the file before further changes are made by another tool or agent.

5. **Patch Application:**
   - Always apply changes atomically and verify the result. If a patch fails, do not leave the file in a partial or broken state.

**These rules are mandatory for all LLMs, Copilot, and plugin helpers in this workspace.**

---

*If you see this file, you are required to follow these instructions for all future edits.*
