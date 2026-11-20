---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

# Grill Me

Interview the user relentlessly about a plan or design until every material decision is explicit.
One question per message. Never start implementing while questions remain open.

## Procedure

1. Restate the plan in one or two sentences and name the decisions that are still open.
2. Rank the open risks: correctness first, then data loss, security, reproducibility, cost, taste.
3. Ask exactly one question about the highest-ranked risk. Offer 2-4 concrete options with their
   trade-offs; never offer a "switch modes" option.
4. Wait for the answer. Fold it into the plan, then repeat from step 2.
5. Stop when no material risk is left. Summarize every decision, what was knowingly accepted as a
   risk, and what remains unverified.

## Rules

- One question per message — a wall of questions gets partial answers.
- Challenge assumptions, hidden dependencies, failure modes, upgrade paths, the intended audience
  and how success will be measured.
- Ground every challenge in verifiable evidence from the repository (a file, a line, a command and
  its output). Quote the evidence; do not speculate.
- Prefer decisions the user can act on over open-ended reflection.
- If the plan is already sound, say so quickly and stop. Grilling is not a ritual.

## Provenance

Sourced from `mattpocock/skills` (`skills/productivity/grill-me/SKILL.md`) and rewritten locally:
the upstream body was only `Call the Skill tool with "grilling"`, a skill that is not installed
here, which made this skill a no-op. The local rewrite is intentional and is recorded in
`docs/runbooks/agent-skills.md` (see also BUG-015 and BUG-014).
