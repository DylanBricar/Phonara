---
name: step-10-verify
description: Launch app and verify feature works through real user surface
prev_step: steps/step-04-validate.md
next_step: steps/step-09-finish.md
---

# Step 10: Verify (Feature Validation)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER skip verification - that defeats the purpose
- 🛑 NEVER claim feature works without actually testing it
- ✅ ALWAYS launch a verifier agent to test through real surface
- ✅ ALWAYS compare results against original user request
- ✅ ALWAYS fix issues before proceeding (unless user skips)
- 📋 YOU ARE A VERIFIER, not an implementer
- 💬 FOCUS on "Does the feature actually work for a real user?"
- 🚫 FORBIDDEN to proceed with FAIL verdict without user confirmation

## EXECUTION PROTOCOLS:

- 🎯 Launch verifier agent with full context
- 💾 Log verification results (if save_mode)
- 📖 Compare each AC against real behavior
- 🚫 FORBIDDEN to fake verification

## CONTEXT BOUNDARIES:

- Implementation is complete, validated, and reviewed
- All typecheck/lint/tests pass
- Now testing the REAL user experience
- **If `{teams_mode}` = true:** Agent team is still alive. Do NOT shutdown teammates - that happens in step-09-finish only.

## YOUR TASK:

Launch the application, test the feature through real user interaction, and verify it matches the original request.

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{task_description}` | Original user request |
| `{task_id}` | Kebab-case identifier |
| `{acceptance_criteria}` | Success criteria from analysis |
| `{auto_mode}` | Skip confirmations |
| `{save_mode}` | Save outputs to files |
| `{economy_mode}` | No subagents |
| `{output_dir}` | Path to output (if save_mode) |
| Files modified | From step-03 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Initialize Save Output (if save_mode)

**If `{save_mode}` = true:**

```bash
bash {skill_dir}/scripts/update-progress.sh "{task_id}" "10" "verify" "in_progress"
```

Append results to `{output_dir}/10-verify.md` as you work.

### 2. Gather Context for Verifier

Collect all information the verifier agent needs:

```
1. Original task description: {task_description}
2. Acceptance criteria: {acceptance_criteria}
3. Modified files (from git):
   git diff --name-only HEAD~1
   git status --porcelain
4. Implementation summary from step-03/04
```

### 3. Launch Verifier Agent

**If `{economy_mode}` = true:**
-> Self-verify: manually test the feature using available tools (dev-browser, curl, shell commands). Follow the verification process below directly instead of launching an agent.

**If `{economy_mode}` = false:**
-> Launch verifier agent using Task tool:

```
Task tool call:
  subagent_type: "verifier"
  prompt: |
    ## Feature Verification

    **Original Request:** {task_description}

    **Acceptance Criteria:**
    {acceptance_criteria - list each one}

    **Files Modified:**
    {list of modified files}

    **Implementation Summary:**
    {brief summary of what was done}

    Verify this feature works correctly by:
    1. Launch the app (check package.json for dev/start command)
    2. Navigate to the relevant pages/endpoints
    3. Test each acceptance criterion through real interaction
    4. Use /dev-browser for web UI, curl for APIs, shell for CLI tools
    5. Report your findings with PASS/FAIL for each AC
    6. List anything missing compared to the original request
```

### 4. Process Verification Results

Parse the verifier agent's report:

**If all ACs PASS:**
-> Display success summary and proceed

**If any ACs FAIL:**
-> Display failure details

### 5. Present Verification Report

```markdown
## Verification Results

**Feature:** {task_description}

| AC | Status | Details |
|----|--------|---------|
| AC1 | ✓ PASS | Working as expected |
| AC2 | ✗ FAIL | {what went wrong} |

**Verdict:** {PASS or FAIL}
```

### 6. Handle Failures

**If verdict = PASS:**
-> Proceed to next step

**If verdict = FAIL:**

**If `{auto_mode}` = true:**
-> Auto-fix: Apply fixes for each failing AC, then re-verify (max 2 retry rounds)

**If `{auto_mode}` = false:**

```yaml
questions:
  - header: "Verify"
    question: "Verification found issues. How would you like to proceed?"
    options:
      - label: "Fix and re-verify (Recommended)"
        description: "Apply fixes for failing ACs and verify again"
      - label: "Fix without re-verify"
        description: "Apply fixes but skip second verification"
      - label: "Skip verification"
        description: "Accept current state, proceed anyway"
      - label: "Discuss issues"
        description: "Let me review the findings first"
    multiSelect: false
```

### 7. Fix Loop (if user chooses to fix)

```
max_verify_rounds = 3
round = 0

WHILE round < max_verify_rounds AND verdict = FAIL:
    round += 1

    1. Read each failing AC
    2. Identify the root cause
    3. Apply the fix
    4. Run typecheck + lint to ensure no regressions
    5. Re-launch verifier agent (or self-verify if economy_mode)
    6. Update verdict
```

**If still failing after 3 rounds:**

```yaml
questions:
  - header: "Stuck"
    question: "Verification still failing after {round} fix rounds. How proceed?"
    options:
      - label: "Keep trying"
        description: "Continue fixing"
      - label: "Accept current state"
        description: "Proceed with known issues"
      - label: "I'll fix manually"
        description: "Let me investigate"
    multiSelect: false
```

### 8. Complete Save Output (if save_mode)

**If `{save_mode}` = true:**

Append to `{output_dir}/10-verify.md`:
```markdown
---
## Step Complete
**Status:** ✓ Complete
**Verdict:** {PASS/FAIL}
**Rounds:** {count}
**Failing ACs:** {list or "none"}
**Timestamp:** {ISO timestamp}
```

```bash
bash {skill_dir}/scripts/update-progress.sh "{task_id}" "10" "verify" "complete"
```

---

## SUCCESS METRICS:

✅ Feature tested through real user surface
✅ Each AC verified with actual interaction
✅ Failures identified with clear descriptions
✅ Fixes applied and re-verified (if needed)
✅ User informed of verification status

## FAILURE MODES:

❌ Claiming verification passed without actually testing
❌ Not launching the app
❌ Testing only happy path, ignoring ACs
❌ Auto-proceeding with FAIL verdict (without user OK)
❌ Not comparing against original user request
❌ **CRITICAL**: Not using AskUserQuestion for failure decisions

## VERIFICATION PROTOCOLS:

- Test through REAL user surface (browser, CLI, API)
- Compare against ORIGINAL request, not just code
- Fix and re-verify, don't just fix and hope
- Be honest about failures

---

## NEXT STEP:

Based on flags:
- **If pr_mode:** Load `./step-09-finish.md` to create pull request
- **Otherwise:** Workflow complete - show summary

<critical>
Remember: The whole point of verify is to catch things that code review and tests miss.
Test the feature like a real user would - don't just check the code!
If teams_mode is active: NEVER shutdown teammates - they stay alive until step-09-finish!
</critical>
