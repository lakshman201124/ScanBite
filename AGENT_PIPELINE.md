# ScanBite — Three-Level UI Quality Agent Pipeline

> This document defines the architecture, contracts, execution order, and output format for the three autonomous agents that continuously improve ScanBite's UI quality.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER: /run-ui-pipeline                     │
└───────────────────────────────┬─────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   AGENT 1: SCREENSHOTTER │
                    │   Takes visual snapshots  │
                    │   of every screen & state │
                    └────────────┬─────────────┘
                                 │  outputs: screenshots/ + manifest.json
                    ┌────────────▼────────────┐
                    │   AGENT 2: AUDITOR       │
                    │   Compares vs DESIGN_SPEC │
                    │   Produces per-screen     │
                    │   change requests         │
                    └────────────┬─────────────┘
                                 │  outputs: audit-report.json
                    ┌────────────▼────────────┐
                    │   AGENT 3: ENHANCER      │
                    │   Reads audit report,    │
                    │   edits component files, │
                    │   re-screenshots to verify│
                    └─────────────────────────┘
                                 │  outputs: diffs + final-report.md
```

Each agent runs as a separate Node.js script. They communicate via the shared `agents/` output directory. The pipeline can be run fully automated (`node agents/run-pipeline.js`) or level by level.

---

## Level 1: SCREENSHOTTER Agent

**File**: `agents/01_screenshotter.js`

**Purpose**: Navigate every page and interaction state of the running ScanBite app and capture high-resolution screenshots for comparison.

**Tech**: Puppeteer (headless Chrome)

### Pages to Screenshot

| Screen ID | URL | Viewport | Auth Required |
|---|---|---|---|
| `customer-menu` | `/m/test-restaurant` | 390×844 (iPhone 14) | QR session cookie |
| `customer-item-detail` | `/m/test-restaurant` (open any item) | 390×844 | QR session cookie |
| `customer-cart` | `/m/test-restaurant` (open cart) | 390×844 | QR session cookie |
| `customer-checkout` | `/m/test-restaurant/checkout` | 390×844 | QR session cookie |
| `customer-tracking` | `/m/test-restaurant/order/{id}` | 390×844 | QR session cookie |
| `admin-login` | `/login` | 1440×900 | None |
| `admin-dashboard` | `/dashboard` | 1440×900 | Admin JWT |
| `admin-orders` | `/dashboard/orders` | 1440×900 | Admin JWT |
| `admin-menu` | `/dashboard/menu` | 1440×900 | Admin JWT |
| `admin-tables` | `/dashboard/tables` | 1440×900 | Admin JWT |
| `admin-billing` | `/dashboard/billing` | 1440×900 | Admin JWT |
| `admin-analytics` | `/dashboard/analytics` | 1440×900 | Admin JWT |
| `admin-inventory` | `/dashboard/inventory` | 1440×900 | Admin JWT |
| `admin-settings` | `/dashboard/settings` | 1440×900 | Admin JWT |
| `kds-main` | `/kds` | 1920×1080 | Chef JWT |
| `chef-login` | `/chef-login` | 1440×900 | None |
| `onboarding` | `/onboarding` | 1440×900 | Admin JWT |

### Interaction States to Capture
For each screen, capture at minimum:
1. **Default state** — page as it loads
2. **Hover states** — hover over primary buttons and nav items
3. **Active/filled state** — forms with data, orders visible, items in cart
4. **Error state** — form validation errors if applicable
5. **Empty state** — no orders, empty menu, no tables

### Output Format
```
agents/output/screenshots/
  ├── customer-menu--default.png
  ├── customer-menu--hover.png
  ├── customer-item-detail--default.png
  ├── customer-cart--filled.png
  ├── ...
  └── manifest.json     ← List of all screenshots with metadata
```

**manifest.json schema**:
```json
{
  "timestamp": "2026-05-21T10:00:00Z",
  "appUrl": "http://localhost:3000",
  "screenshots": [
    {
      "id": "customer-menu--default",
      "path": "output/screenshots/customer-menu--default.png",
      "url": "/m/test-restaurant",
      "viewport": { "width": 390, "height": 844 },
      "state": "default",
      "screen": "customer-menu"
    }
  ]
}
```

---

## Level 2: AUDITOR Agent

**File**: `agents/02_auditor.js`

**Purpose**: Read every screenshot from the manifest, compare it against the design contracts in `DESIGN_SPEC.md`, and produce a structured audit report with specific change requests.

**Input**: `agents/output/screenshots/manifest.json` + all screenshot PNGs

**Reference**: `DESIGN_SPEC.md` (the brand token system, component contracts, anti-pattern blacklist)

### What the Auditor Checks

For each screenshot, the auditor evaluates:

#### Visual Token Compliance
- Are colors matching the brand token system? (warm cream background, coral brand, ink text)
- Is the shadow system correct? (layered, tinted — not generic flat)
- Are radius values within the token scale?
- Is the font correctly loaded and rendering?

#### Typography Compliance
- Is `Instrument Serif` used for hero/display headings?
- Is `Plus Jakarta Sans` used for all UI text?
- Is `JetBrains Mono` used ONLY for KDS timers?
- Are font weights correct (no random 400s where 700/800 is required)?

#### Anti-Pattern Detection (CRITICAL FAILURES)
- [ ] Any emoji in buttons, nav, table cells, KPI cards → **CRITICAL**
- [ ] Any use of blue/indigo/purple as primary color → **CRITICAL**
- [ ] Flat box-shadow (single layer, opaque black) → **HIGH**
- [ ] Colored row backgrounds in tables → **MEDIUM**
- [ ] Left-border accent on active nav items → **MEDIUM**
- [ ] Colored header bands on dashboard cards → **MEDIUM**
- [ ] Loading spinners instead of skeletons → **LOW**
- [ ] `transition-all` (must check in source code) → **HIGH**

#### UX Quality Checks
- Does every clickable element have a visible hover state?
- Do status badges use the correct semantic color pairing?
- Is spacing consistent within cards?
- Are form fields aligned and padded correctly?
- Is the mobile tab bar floating (not flush with screen edge)?
- Does the KDS timer change color as time increases?

### Severity Levels
| Level | Meaning | Required Fix? |
|---|---|---|
| CRITICAL | Violates brand identity or core design rules | Yes — blocks deploy |
| HIGH | Visible degradation, wrong pattern | Yes — fix in this cycle |
| MEDIUM | Inconsistency, sub-optimal implementation | Yes — fix in this cycle |
| LOW | Minor polish, optional enhancement | Track for next cycle |

### Output Format
```
agents/output/audit-report.json
```

**audit-report.json schema**:
```json
{
  "timestamp": "2026-05-21T10:05:00Z",
  "summary": {
    "total_screens": 17,
    "screens_with_issues": 8,
    "critical_count": 3,
    "high_count": 5,
    "medium_count": 12,
    "low_count": 8
  },
  "screens": [
    {
      "id": "admin-dashboard",
      "screenshot": "output/screenshots/admin-dashboard--default.png",
      "issues": [
        {
          "severity": "CRITICAL",
          "rule": "NO_EMOJI",
          "location": "KPI card — Revenue metric",
          "observed": "💰 emoji used in KPI label",
          "expected": "Lucide icon (DollarSign) with 24×24px icon box",
          "file": "components/admin/KpiCard.tsx",
          "fix_hint": "Replace emoji with <DollarSign size={14} /> inside .kpi__label .ico wrapper"
        },
        {
          "severity": "HIGH",
          "rule": "FLAT_SHADOW",
          "location": "Quick action buttons",
          "observed": "box-shadow: 0 4px 6px rgba(0,0,0,0.1) — single layer",
          "expected": "var(--sh-1) = 0 1px 2px rgba(20,19,26,.04), 0 1px 0 rgba(20,19,26,.02)",
          "file": "components/admin/QuickActions.tsx",
          "fix_hint": "Replace with var(--sh-1) CSS variable"
        }
      ]
    }
  ]
}
```

Additionally, the Auditor writes a human-readable summary:
```
agents/output/AUDIT_SUMMARY.md
```

Format:
```markdown
## Audit Summary — 2026-05-21

### Critical Issues (3)
1. **admin-dashboard**: Emoji in KPI cards (💰, 📦, etc.) — replace with Lucide icons
2. **customer-menu**: Blue color used for active category chip instead of --ink
3. **kds-main**: Flat shadow on KDS cards, not layered

### High Issues (5)
...

### Per-Screen Pass/Fail
| Screen | Status | Issues |
|--------|--------|--------|
| customer-menu | ⚠️ NEEDS WORK | 2 HIGH, 3 MEDIUM |
| admin-dashboard | ❌ CRITICAL | 1 CRITICAL, 2 HIGH |
| kds-main | ⚠️ NEEDS WORK | 1 CRITICAL |
...
```

---

## Level 3: ENHANCER Agent

**File**: `agents/03_enhancer.js`

**Purpose**: Read the audit report, open the flagged component files, apply precise surgical fixes, and re-screenshot to verify each fix.

**Input**: 
- `agents/output/audit-report.json`
- The actual component source files (`components/`, `app/`, `lib/`)

**Process**:

### Step 1: Prioritize
Sort all issues: CRITICAL first → HIGH → MEDIUM → LOW.
Never fix a LOW while a CRITICAL is unresolved.

### Step 2: Fix Loop
For each issue (CRITICAL/HIGH/MEDIUM):
1. Open the file identified in `issue.file`
2. Locate the specific element using `issue.location` and `issue.fix_hint`
3. Apply the minimum change to fix the issue without side effects
4. Mark the fix in the working log

### Step 3: Fix Patterns

**Emoji → Lucide Icon**:
```tsx
// BEFORE (flagged)
<span>💰 Revenue</span>

// AFTER (fixed)
import { DollarSign } from 'lucide-react'
<span className="kpi__label">
  <span className="ico"><DollarSign size={14} /></span>
  Revenue
</span>
```

**Flat shadow → Token shadow**:
```tsx
// BEFORE
style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}

// AFTER
className="..." // Add to existing class, remove inline style
// In CSS: box-shadow: var(--sh-2)
```

**Wrong color → Token**:
```tsx
// BEFORE
className="bg-indigo-500 text-white"  // or hardcoded #6366f1

// AFTER
style={{ background: 'var(--brand)', color: '#fff' }}
// or in globals.css: .adm-nav.is-active { background: var(--ink); }
```

**Active nav with left border → Fill background**:
```css
/* BEFORE */
.adm-nav.is-active {
  border-left: 3px solid var(--brand);
}

/* AFTER */
.adm-nav.is-active {
  background: var(--ink);
  color: #fff;
}
.adm-nav.is-active::after {
  content: ''; position: absolute; right: 12px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--brand);
}
```

**Colored card header band → Plain card**:
```tsx
// BEFORE
<div className="bg-blue-600 text-white p-4 rounded-t-xl">
  <h3>Revenue</h3>
</div>

// AFTER
<div className="card__h">
  <h3>Revenue</h3>
</div>
```

### Step 4: Verification Screenshots
After fixing all CRITICAL + HIGH issues, re-run Level 1 (screenshots only) and then compare:
```
node agents/01_screenshotter.js --mode=verify
node agents/02_auditor.js --mode=diff
```

This produces `agents/output/DIFF_REPORT.md` showing before/after.

### Step 5: Final Report
```
agents/output/FINAL_REPORT.md
```

```markdown
## Enhancement Cycle — 2026-05-21

### Fixes Applied (N)
| Screen | Issue | Fix | Result |
|--------|-------|-----|--------|
| admin-dashboard | Emoji in KPI | Replaced 5 emojis with Lucide icons | ✅ PASSED |
| customer-menu | Wrong active chip color | Changed to var(--ink) | ✅ PASSED |
...

### Remaining Issues
| Screen | Severity | Reason Not Fixed |
|--------|----------|------------------|
| admin-tables | LOW | Non-blocking, tracked for next cycle |
...

### Pass/Fail After Enhancement
All CRITICAL: 0 remaining ✅
All HIGH: 0 remaining ✅
MEDIUM remaining: 2 (tracked)
```

---

## Running the Pipeline

### Prerequisites
```bash
# From the qrdine/ directory
pnpm install
pnpm dev  # App must be running at localhost:3000

# From the ScanBite root
cd agents
npm install
```

### Full Pipeline
```bash
# Run all three levels
node run-pipeline.js

# Run with options
node run-pipeline.js --level=1           # Screenshot only
node run-pipeline.js --level=2           # Audit only (uses existing screenshots)
node run-pipeline.js --level=3           # Enhance only (uses existing audit)
node run-pipeline.js --verify            # Re-screenshot + diff after enhancement
node run-pipeline.js --screen=admin-dashboard  # Target single screen
```

### CI Integration
The pipeline can be added to the GitHub Actions workflow in `.github/workflows/qa-pipeline.yml` to run on every pull request touching `components/` or `app/` files.

```yaml
- name: Run UI Quality Pipeline
  run: |
    cd agents && npm install
    node run-pipeline.js --level=1 --level=2
    node check-critical-failures.js   # Exits 1 if any CRITICAL issues found
```

---

## File Structure

```
ScanBite/
├── agents/
│   ├── 01_screenshotter.js    ← Level 1: Puppeteer screenshot engine
│   ├── 02_auditor.js          ← Level 2: Design compliance checker
│   ├── 03_enhancer.js         ← Level 3: Automated fix applier
│   ├── run-pipeline.js        ← Orchestrator for all three levels
│   ├── check-critical-failures.js  ← CI gate (exit 1 on CRITICAL)
│   ├── lib/
│   │   ├── design-rules.js    ← Machine-readable rules from DESIGN_SPEC.md
│   │   ├── screenshot-utils.js ← Puppeteer helpers
│   │   └── diff-utils.js      ← Before/after comparison
│   ├── output/
│   │   ├── screenshots/       ← PNG captures
│   │   ├── audit-report.json  ← Structured issues
│   │   ├── AUDIT_SUMMARY.md   ← Human-readable audit
│   │   ├── DIFF_REPORT.md     ← Before/after after enhancement
│   │   └── FINAL_REPORT.md    ← End-of-cycle summary
│   └── package.json
├── PRODUCT_SPEC.md            ← Function outcomes bible
├── DESIGN_SPEC.md             ← Design token & component contracts
└── AGENT_PIPELINE.md          ← This file
```

---

## Design Rules Machine-Readable Format

`agents/lib/design-rules.js` encodes the DESIGN_SPEC as inspectable rules:

```javascript
module.exports = {
  criticalRules: [
    {
      id: 'NO_EMOJI_UI',
      description: 'No emoji in buttons, nav items, KPI labels, table cells',
      detect: 'visual', // requires screenshot analysis
      patterns: [/[\u{1F300}-\u{1FFFF}]/u], // emoji unicode range
      severity: 'CRITICAL'
    },
    {
      id: 'BRAND_COLOR_ONLY',
      description: 'No blue/indigo/purple as primary color',
      detect: 'css',
      patterns: ['#6366f1', '#4f46e5', '#7c3aed', 'indigo-', 'purple-', 'violet-'],
      severity: 'CRITICAL'
    }
  ],
  highRules: [
    {
      id: 'NO_TRANSITION_ALL',
      description: 'transition-all banned — only transition transform/opacity',
      detect: 'source',
      patterns: ['transition-all', 'transition: all'],
      severity: 'HIGH'
    },
    {
      id: 'LAYERED_SHADOWS',
      description: 'Shadows must use CSS token variables, not hardcoded',
      detect: 'css',
      patterns: ['box-shadow: 0 4px', 'box-shadow: 0 2px', 'rgba(0,0,0,0'],
      severity: 'HIGH'
    }
  ],
  colorTokens: {
    '--brand': '#FF4D3D',
    '--ink': '#14131A',
    '--bg': '#FFF8F3',
    '--surface': '#FFFFFF',
    '--green': '#1E9E5E',
    '--amber': '#F2A500',
    '--red': '#E03A30'
  }
}
```

---

*This pipeline runs on every design iteration. CRITICAL issues block deployment. The cycle repeats until all CRITICAL and HIGH issues reach 0.*
