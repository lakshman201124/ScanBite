# QR Dine — Unified Agent Pipeline

> **This document defines the end-to-end execution pipeline and the orchestration of all AI agents working on QR Dine.**

---

## 1. Pipeline Overview

The QR Dine build process is a strict, sequential pipeline. Work flows through specific agents, each with a defined role, ensuring high-quality, production-ready code that matches the brand's design system. 

```text
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
│       │                     [Next Task]    [Back to UI Dev]  │
│       │                                    [with fix notes]  │
│       └──────────────────────────────────────────────────────┘
```

---

## 2. Agent Roles & Responsibilities

### 🧠 PLANNER Agent
**Role:** Breaks down the current development phase into atomic, ordered tasks.
- **Inputs:** `PHASE_N.md`, `ARCHITECTURE.md`, `BUILD_PLAN.md`, `CLAUDE.md`
- **Actions:** 
  - Identifies human blockers (API keys, decisions) and requests human intervention first.
  - Sequences tasks (Schema → API → Frontend).
  - Assigns tasks to the downstream agents.
- **Outputs:** A structured task breakdown and dependency graph.
- **Constraint:** Never writes code or makes design decisions.

### 🎨 BRAND SCOUT Agent
**Role:** The design system architect. Ensures visual decisions are finalized before coding begins.
- **Inputs:** `BRAND_ASSETS.md` (template), `CLAUDE.md`
- **Actions:**
  - Interviews the human in 6 rounds (Personality, Colors, Typography, Components, Motion, Review).
  - Searches the web for design references and palette generators.
  - Fills in every `[PENDING]` field in the `BRAND_ASSETS.md`.
- **Outputs:** A complete, human-approved `BRAND_ASSETS.md`.
- **Constraint:** Acts as a **HARD GATE**. The UI Developer cannot start if any field is `[PENDING]`.

### 🖥️ UI DEVELOPER Agent
**Role:** The core builder. Writes production-grade frontend and backend code.
- **Inputs:** Planner's task, `BRAND_ASSETS.md`, `CLAUDE.md`, `ARCHITECTURE.md`
- **Actions:**
  - Builds ONE page/component or API route at a time.
  - Strictly adheres to the design specs from `BRAND_ASSETS.md`.
  - Implements mobile-first layouts, loading/empty/error states, and animations.
  - Ensures tenant-scoped database queries and input validation.
- **Outputs:** Working code (Next.js App Router, Tailwind, framer-motion, Prisma).
- **Constraint:** Must not proceed without a completed design system. Must self-audit before passing work.

### 🔍 AUDITOR Agent
**Role:** The quality assurance inspector. Evaluates the UI Developer's output.
- **Inputs:** UI Developer's code, `BRAND_ASSETS.md`, `CLAUDE.md`
- **Actions:**
  - Audits the component against a strict checklist (Design Fidelity, Functionality, Responsiveness, Code Quality, Multi-Tenancy, Performance).
  - If a browser is available, visually verifies layouts across breakpoints.
- **Outputs:** A structured Audit Report with PASS/FAIL status per check and specific line references for issues.
- **Constraint:** Never fixes code. Only reports issues.

### 🚪 GATE KEEPER Agent
**Role:** The final decision-maker for each task loop.
- **Inputs:** Auditor's Report
- **Actions:**
  - Makes a binary decision based on the audit: PASS, PASS WITH NOTES, FAIL, or ESCALATE.
  - **FAIL:** Routes back to the UI Developer with specific fix notes (max 3 loops).
  - **PASS:** Signals the Planner to move to the next task.
  - **ESCALATE:** Stops the loop after 3 failures and asks the human for intervention.
- **Outputs:** A final verdict and routing instruction.
- **Constraint:** Cannot override the Auditor on critical failures. Does not write code.

---

## 3. The End-to-End Execution Flow

This is how the agents collaborate to complete a phase, as defined in `BUILD.md`:

**Step 1: Initialization**
- The **PLANNER** reads the phase document and produces a task breakdown.
- The human resolves any immediate blockers (e.g., providing API keys).

**Step 2: The Design Gate**
- Is `BRAND_ASSETS.md` complete?
  - **NO:** The **BRAND SCOUT** interviews the human, generates the design system, and gets approval.
  - **YES:** Proceed to development.

**Step 3: Development Loop (Per Task)**
- **Code:** The **UI DEVELOPER** builds the task (schema, then API, then UI).
- **Audit:** The **AUDITOR** reviews the output against strict guidelines and the brand assets.
- **Gate:** The **GATE KEEPER** reviews the audit.
  - If **FAIL**, the UI Developer fixes the code based on the feedback.
  - If **PASS**, the pipeline moves to the next task.

**Step 4: Phase Completion**
- Once all tasks are complete, the **HUMAN** performs a manual verification (checking for errors, testing navigation, ensuring tenant isolation).
- If successful, the human approves the phase, and the pipeline proceeds to the next phase. If there are breaking changes, a rollback protocol (`git reset --hard`) is triggered.

---
> *Follow the pipeline. No shortcuts. The pipeline IS the product quality.*
