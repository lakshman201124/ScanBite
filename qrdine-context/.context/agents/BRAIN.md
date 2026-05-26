# QR Dine — BRAIN.md (Multi-Agent Orchestration)

> **This file defines the agent pipeline. Each agent has a specific role, reads specific files, and passes work to the next agent. No agent freelances.**

---

## Agent Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    QR DINE BUILD PIPELINE                         │
│                                                                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ PLANNER  │───►│  BRAND   │───►│    UI    │───►│ AUDITOR  │   │
│  │  Agent   │    │  SCOUT   │    │DEVELOPER │    │  Agent   │   │
│  └──────────┘    └──────────┘    └──────────┘    └─────┬────┘   │
│       │                                                 │         │
│       │          Plan phases,                    ┌──────▼─────┐  │
│       │          assign tasks,              │ GATE KEEPER │  │
│       │          sequence work              │   Agent     │  │
│       │                                     └──────┬─────┘  │
│       │                                            │         │
│       │                              ┌─────────────┤         │
│       │                              │             │         │
│       │                         PASS ▼        FAIL ▼         │
│       │                     [Next Page]    [Back to UI Dev]  │
│       │                                    [with fix notes]  │
│       └──────────────────────────────────────────────────────┘
```

---

## Agent Definitions

### 1. 🧠 PLANNER Agent
**File:** `.context/agents/PLANNER.md`  
**Reads:** CLAUDE.md, ARCHITECTURE.md, BUILD_PLAN.md, current phase file  
**Produces:** Task breakdown for the current phase, ordered by dependency  
**Does NOT:** Write any code. Does NOT make design decisions.

**Role:**
- Reads the current phase file (e.g., PHASE_1.md)
- Breaks it into atomic, sequentially-ordered tasks
- Each task has: description, files to create/modify, dependencies, acceptance criteria
- Assigns each task to the right downstream agent
- Identifies where HUMAN input is needed and surfaces those blockers FIRST

**Output format:**
```
PHASE [N] — TASK BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━

Task 1: [Name]
  Agent: [which agent]
  Depends on: [task number or "none"]
  Files: [list of files to create/modify]
  Acceptance: [what "done" looks like]

Task 2: ...
```

---

### 2. 🎨 BRAND SCOUT Agent
**File:** `.context/agents/BRAND_SCOUT.md`  
**Reads:** CLAUDE.md, BRAND_ASSETS.md (template)  
**Produces:** Completed BRAND_ASSETS.md  
**Does NOT:** Write any code. Does NOT skip questions.

**Role:**
- BEFORE any UI code exists, interviews the human about every `[PENDING]` field in BRAND_ASSETS.md
- Questions are asked in a structured interview format, grouped by topic
- For each answer, the agent may search the web for:
  - Reference designs the human mentions
  - Font pairings that match the vibe
  - Color palette generators (Coolors, Realtime Colors, etc.)
  - Animation libraries and examples
- Downloads/notes any brand assets the human provides (logo, color codes, etc.)
- Fills in EVERY field in BRAND_ASSETS.md — no `[PENDING]` can remain

**Interview Flow:**
```
Round 1: Brand Personality & References
  "Show me 2-3 apps or restaurants whose visual style you love."
  "What single word describes how QR Dine should feel? (e.g., premium, fun, minimal)"

Round 2: Colors
  "What's your primary brand color? (hex code or describe it)"
  "Dark mode or light mode for the customer menu?"
  "Do you want the admin dashboard to feel dark/professional or light/airy?"

Round 3: Typography
  "Should the menu feel editorial/magazine, casual/friendly, or clean/modern?"
  [Agent then proposes 2-3 font pairings with web search examples]

Round 4: Components
  "Do you want buttons pill-shaped, slightly rounded, or sharp-cornered?"
  "The menu item card — image on the left (Swiggy style) or image on top (Instagram style)?"
  "The Add to Cart button — what should happen when you tap it?"

Round 5: Motion
  "Fast and snappy animations or smooth and luxurious?"
  "How important are micro-interactions to you? (1-5 scale)"

Round 6: Review
  [Agent summarizes all choices and asks for final approval before saving]
```

---

### 3. 🖥️ UI DEVELOPER Agent
**File:** `.context/agents/UI_DEVELOPER.md`  
**Reads:** CLAUDE.md, ARCHITECTURE.md, BRAND_ASSETS.md (completed), current phase file, task from Planner  
**Produces:** Production-quality frontend code, one page at a time  
**Does NOT:** Skip the brand assets check. Does NOT build backend.

**Role:**
- THE most critical agent in the pipeline
- Reads BRAND_ASSETS.md before writing ANY component
- Builds ONE page/component at a time (never batch)
- Uses: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Framer Motion
- Every component must match the design specs in BRAND_ASSETS.md
- Mobile-first always — test at 375px width mentally before desktop
- No AI slop: no generic gradients, no Inter font, no cookie-cutter layouts

**Quality Bar:**
- Would this look good in a Dribbble shot? If not, redo it.
- Does it match the BRAND_ASSETS.md spec exactly? If not, redo it.
- Does it handle loading, empty, and error states? If not, add them.
- Is it accessible (keyboard nav, screen reader, contrast)? If not, fix it.
- Does the animation add delight without being annoying? Test it.

**Code Standards:**
```typescript
// EVERY component follows this structure:
'use client' // only if client-side interactivity needed

import { motion } from 'framer-motion' // if animated
import { cn } from '@/lib/utils' // for conditional classes

interface Props {
  // fully typed, no `any`
}

export function ComponentName({ ...props }: Props) {
  // Zustand for client state
  // TanStack Query for server data
  // React Hook Form + Zod for forms
  // Framer Motion for animations
  
  return (
    <motion.div
      initial={...}
      animate={...}
      // Tailwind classes, customized shadcn/ui
    >
      {/* Mobile-first responsive design */}
    </motion.div>
  )
}
```

---

### 4. 🔍 AUDITOR Agent
**File:** `.context/agents/AUDITOR.md`  
**Reads:** CLAUDE.md, BRAND_ASSETS.md, current phase file, the code produced by UI Developer  
**Produces:** Audit report with PASS/FAIL per check, fix notes for failures  
**Does NOT:** Fix the code itself. Only reports issues.

**Role:**
- Runs after EVERY page/component the UI Developer produces
- Checks against a comprehensive checklist (see AUDITOR.md)
- Ideally opens the page in a browser to visually verify
- Reports findings in a structured format

**Audit Checklist (per page):**
```
DESIGN FIDELITY
  [ ] Colors match BRAND_ASSETS.md palette
  [ ] Typography matches spec (font family, weight, size)
  [ ] Spacing matches spec (padding, gaps, margins)
  [ ] Component style matches spec (buttons, cards, etc.)
  [ ] Animations match spec (type, duration, easing)

FUNCTIONALITY
  [ ] All interactive elements work (buttons, inputs, toggles)
  [ ] Form validation works (shows errors, prevents invalid submit)
  [ ] Loading states shown while data fetches
  [ ] Empty states shown when no data
  [ ] Error states shown when API fails
  [ ] Navigation works (links, back button, breadcrumbs)

RESPONSIVENESS
  [ ] Looks correct at 375px (iPhone SE)
  [ ] Looks correct at 390px (iPhone 14)
  [ ] Looks correct at 768px (tablet)
  [ ] Looks correct at 1440px (desktop)
  [ ] No horizontal scroll at any width
  [ ] Touch targets ≥ 44px on mobile

ACCESSIBILITY
  [ ] Color contrast ≥ 4.5:1 (text) / 3:1 (large text)
  [ ] All images have alt text
  [ ] Keyboard navigable (tab order logical)
  [ ] Focus indicators visible
  [ ] Screen reader announces state changes

PERFORMANCE
  [ ] No unnecessary re-renders (check React DevTools)
  [ ] Images use next/image with proper sizing
  [ ] Code-split where possible (dynamic imports)
  [ ] No blocking scripts in critical path

MULTI-TENANCY
  [ ] Component uses restaurant's brand_color where applicable
  [ ] Component uses restaurant's logo where applicable
  [ ] No hardcoded restaurant-specific data
```

---

### 5. 🚪 GATE KEEPER Agent
**File:** `.context/agents/GATE_KEEPER.md`  
**Reads:** Auditor's report  
**Produces:** PASS (proceed to next page) or FAIL (loop back to UI Developer with fix notes)  
**Does NOT:** Write code. Does NOT override the Auditor.

**Role:**
- Binary decision: PASS or FAIL
- If ANY critical check fails (design fidelity, functionality, responsiveness), it's FAIL
- If only minor issues (accessibility nice-to-haves, performance optimizations), it's PASS with notes
- On FAIL: sends the Auditor's report back to UI Developer with specific line references
- On PASS: signals Planner to move to the next task

**Loop Limit:** Maximum 3 attempts per page. If still failing after 3 loops, escalate to human with a detailed report of what's wrong.

---

## Pipeline Execution (Per Phase)

```
START PHASE [N]
       │
       ▼
[PLANNER] reads PHASE_N.md → produces task breakdown
       │
       ▼
Is Brand Assets complete? ──NO──► [BRAND SCOUT] interviews human
       │                                    │
      YES                                   ▼
       │                          BRAND_ASSETS.md filled
       │                                    │
       ▼◄───────────────────────────────────┘
For each task in breakdown:
       │
       ├─► Is it a backend task?
       │   └─► [UI DEVELOPER builds backend code too — same agent, different mode]
       │
       └─► Is it a frontend task?
           │
           ▼
     [UI DEVELOPER] builds page/component
           │
           ▼
     [AUDITOR] audits against checklist
           │
           ▼
     [GATE KEEPER] reviews audit
           │
           ├─► PASS → next task
           └─► FAIL → back to UI DEVELOPER (max 3 loops)
                         │
                         └─► After 3 fails → HUMAN ESCALATION

All tasks done?
       │
       ▼
PHASE [N] COMPLETE
  → Human verification checklist
  → Human says "verified"
  → Proceed to PHASE [N+1]
```

---

## Agent Communication Format

Agents pass work via structured messages:

```
FROM: [Agent Name]
TO: [Agent Name]
PHASE: [N]
TASK: [Task number and name]
STATUS: [ready | in_progress | needs_review | pass | fail | blocked]
━━━━━━━━━━━━━━━━━━━━━━━━━━
[Payload: task breakdown / code / audit report / gate decision]
━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCKERS: [none | list of blockers]
HUMAN_ACTION_NEEDED: [yes/no + details]
```

---

## Critical Rule: The Brand Scout Gate

```
IF BRAND_ASSETS.md has ANY [PENDING] field
  THEN UI DEVELOPER CANNOT START
  THEN BRAND SCOUT must run first
  THIS IS A HARD GATE — NO EXCEPTIONS
```

The entire frontend quality depends on having a complete design system BEFORE code is written. Skipping this is the #1 cause of AI slop.

---

*This is the brain. The pipeline is law. Every agent follows it.*
