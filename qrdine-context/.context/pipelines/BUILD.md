# QR Dine — BUILD Pipeline

> **The step-by-step execution flow for building each phase.**

---

## Pipeline Flow

```
START PHASE
     │
     ▼
[Step 1] PLANNER reads PHASE_N.md
     │   → Produces task breakdown
     │   → Surfaces human blockers
     │
     ▼
[Step 2] HUMAN resolves blockers
     │   (API keys, env vars, brand decisions)
     │   → Human replies "done"
     │
     ▼
[Step 3] Is BRAND_ASSETS.md complete?
     │
     ├─NO─► BRAND SCOUT interviews human
     │       → Fills BRAND_ASSETS.md
     │       → Human approves
     │       → Loop back to Step 3
     │
     └─YES─► Continue
     │
     ▼
[Step 4] FOR EACH TASK in breakdown:
     │
     ├─► [4a] UI DEVELOPER builds task
     │         (schema → API → frontend, in dependency order)
     │
     ├─► [4b] AUDITOR audits output
     │         (checklist from AUDITOR.md)
     │
     ├─► [4c] GATE KEEPER decides
     │         │
     │         ├─ PASS → next task (go to 4a)
     │         ├─ FAIL → back to 4a with fix notes (max 3 loops)
     │         └─ ESCALATE → human intervention
     │
     └─► All tasks complete
     │
     ▼
[Step 5] PHASE COMPLETE
     │   → Human verification checklist
     │   → Human tests manually
     │   → Human replies "verified"
     │
     ▼
[Step 6] Proceed to PHASE [N+1]
```

---

## Phase Completion Checklist (Human Verifies)

After every phase, the human must manually verify:

```
□ Application starts without errors (npm run dev)
□ No TypeScript errors (npm run type-check)
□ No console errors in browser
□ All new pages are navigable
□ Database migrations applied successfully
□ New API endpoints return expected data
□ Mobile view looks correct on actual phone
□ Multi-tenant isolation works (test with 2 restaurants)
```

---

## Rollback Protocol

If a phase introduces breaking changes:

1. Git commit BEFORE every phase starts (tag: `pre-phase-N`)
2. If phase breaks things: `git reset --hard pre-phase-N`
3. Analyze what went wrong
4. Re-plan the phase with the Planner
5. Retry

---

*Follow the pipeline. No shortcuts. The pipeline IS the product quality.*
