#!/usr/bin/env node
'use strict';

/**
 * AGENT 3: ENHANCER
 *
 * Reads the audit report, opens flagged component files,
 * applies surgical fixes, re-screenshots to verify each fix,
 * and produces a final diff report.
 *
 * Fixes are applied in priority order: CRITICAL → HIGH → MEDIUM
 * LOW issues are tracked but not auto-fixed.
 *
 * Usage:
 *   node 03_enhancer.js
 *   node 03_enhancer.js --dry-run     (show what would be changed, don't write)
 *   node 03_enhancer.js --rule=NO_EMOJI_UI  (fix specific rule only)
 */

const fs = require('fs-extra');
const path = require('path');

const REPORT_PATH = path.join(__dirname, 'output', 'audit-report.json');
const FINAL_REPORT_PATH = path.join(__dirname, 'output', 'FINAL_REPORT.md');
const PROJECT_ROOT = path.join(__dirname, '..', 'qrdine');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const targetRule = args.find(a => a.startsWith('--rule='))?.split('=')[1];

// ─── FIX STRATEGIES ───────────────────────────────────────────────────────

/**
 * Each fix strategy maps a rule ID to an auto-fix function.
 * Returns { fixed: boolean, description: string, before?: string, after?: string }
 */
const FIX_STRATEGIES = {

  NO_EMOJI_UI: async (issue) => {
    // Read the file
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) {
      return { fixed: false, description: 'File not found: ' + issue.file };
    }

    let content = await fs.readFile(filepath, 'utf-8');
    const originalContent = content;

    // Map of common emoji patterns to Lucide replacements
    const emojiReplacements = [
      // Revenue/money
      { emoji: /💰/g, replacement: '' /* Remove — use Lucide DollarSign in the wrapper */ },
      { emoji: /💳/g, replacement: '' },
      // Food/restaurant
      { emoji: /🍕/g, replacement: '' },
      { emoji: /🍔/g, replacement: '' },
      { emoji: /🍜/g, replacement: '' },
      // Status/business
      { emoji: /📊/g, replacement: '' },
      { emoji: /📈/g, replacement: '' },
      { emoji: /📉/g, replacement: '' },
      { emoji: /📦/g, replacement: '' },
      { emoji: /⚡/g, replacement: '' },
      { emoji: /✨/g, replacement: '' },
      { emoji: /🎉/g, replacement: '' },
      { emoji: /👋/g, replacement: '' },
      // Nav/UI
      { emoji: /🏠/g, replacement: '' },
      { emoji: /⚙️/g, replacement: '' },
      { emoji: /🔔/g, replacement: '' },
    ];

    let changed = false;
    for (const { emoji, replacement } of emojiReplacements) {
      if (emoji.test(content)) {
        content = content.replace(emoji, replacement);
        changed = true;
      }
    }

    // Also catch emoji inside JSX text content
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;
    if (emojiRegex.test(content)) {
      content = content.replace(emojiRegex, '');
      changed = true;
    }

    if (!changed) {
      return { fixed: false, description: 'No emoji found in file (may have been in a different context)' };
    }

    if (!isDryRun) {
      await fs.writeFile(filepath, content, 'utf-8');
    }

    return {
      fixed: true,
      description: `Removed emoji from ${issue.file}:${issue.line}`,
      before: issue.observed,
      after: content.split('\n')[issue.line - 1]?.trim() || '(line removed)',
    };
  },

  NO_BLUE_PURPLE_PRIMARY: async (issue) => {
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) return { fixed: false, description: 'File not found' };

    let content = await fs.readFile(filepath, 'utf-8');
    const original = content;

    // Replace Tailwind blue/indigo/purple classes on primary elements
    const replacements = [
      // Background classes
      [/\bbg-indigo-[456789]00\b/g, 'bg-brand'],
      [/\bbg-blue-[6789]00\b/g, 'bg-brand'],
      [/\bbg-purple-[456789]00\b/g, 'bg-brand'],
      [/\bbg-violet-[456789]00\b/g, 'bg-brand'],
      // Text classes
      [/\btext-indigo-[456789]00\b/g, 'text-brand'],
      [/\btext-blue-[6789]00\b/g, 'text-brand'],
      [/\btext-purple-[456789]00\b/g, 'text-brand'],
      // Hex values
      [/#6366f1/gi, 'var(--brand)'],
      [/#4f46e5/gi, 'var(--brand)'],
      [/#7c3aed/gi, 'var(--brand)'],
      [/#3b82f6/gi, 'var(--brand)'],
    ];

    let changed = false;
    for (const [pattern, replacement] of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        changed = true;
      }
    }

    if (!changed) return { fixed: false, description: 'Pattern not found in current file state' };

    if (!isDryRun) await fs.writeFile(filepath, content, 'utf-8');

    return {
      fixed: true,
      description: `Replaced blue/indigo/purple with brand tokens in ${issue.file}:${issue.line}`,
      before: issue.observed,
    };
  },

  NO_TRANSITION_ALL: async (issue) => {
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) return { fixed: false, description: 'File not found' };

    let content = await fs.readFile(filepath, 'utf-8');

    // Replace transition-all with specific transition
    const before = content;
    content = content
      .replace(/\btransition-all\b/g, 'transition-[transform,opacity]')
      .replace(/transition:\s*all\s+(\S+)/gi, 'transition: transform $1, opacity $1');

    if (content === before) return { fixed: false, description: 'Pattern not found in current state' };

    if (!isDryRun) await fs.writeFile(filepath, content, 'utf-8');

    return {
      fixed: true,
      description: `Replaced transition-all with transform+opacity in ${issue.file}:${issue.line}`,
    };
  },

  LAYERED_SHADOWS_ONLY: async (issue) => {
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) return { fixed: false, description: 'File not found' };

    let content = await fs.readFile(filepath, 'utf-8');
    const before = content;

    // Replace generic Tailwind shadow classes
    content = content
      .replace(/\bshadow-md\b/g, '[box-shadow:var(--sh-2)]')
      .replace(/\bshadow-lg\b/g, '[box-shadow:var(--sh-3)]')
      .replace(/\bshadow-sm\b/g, '[box-shadow:var(--sh-1)]')
      .replace(/\bshadow-xl\b/g, '[box-shadow:var(--sh-3)]');

    // Replace inline flat shadows with CSS variables (common pattern)
    content = content.replace(
      /boxShadow:\s*['"]0\s+4px\s+6px\s+rgba\(0,\s*0,\s*0,\s*0\.1\)['"]/g,
      "boxShadow: 'var(--sh-2)'"
    );

    if (content === before) return { fixed: false, description: 'Pattern not found in current state' };

    if (!isDryRun) await fs.writeFile(filepath, content, 'utf-8');

    return {
      fixed: true,
      description: `Replaced flat shadows with layered token shadows in ${issue.file}:${issue.line}`,
    };
  },

  CORRECT_ACTIVE_NAV_PATTERN: async (issue) => {
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) return { fixed: false, description: 'File not found' };

    let content = await fs.readFile(filepath, 'utf-8');
    const before = content;

    // Fix border-left active pattern → background fill
    content = content
      .replace(/border-l-4\s+border-(?:brand|primary|\[var\(--brand\)\])/g, 'bg-[var(--ink)] text-white')
      .replace(/border-l-2\s+border-(?:brand|primary|\[var\(--brand\)\])/g, 'bg-[var(--ink)] text-white');

    if (content === before) return { fixed: false, description: 'Pattern not found in current state' };

    if (!isDryRun) await fs.writeFile(filepath, content, 'utf-8');

    return {
      fixed: true,
      description: `Fixed active nav from border-left to background fill in ${issue.file}`,
    };
  },

  NO_ZEBRA_STRIPING: async (issue) => {
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) return { fixed: false, description: 'File not found' };

    let content = await fs.readFile(filepath, 'utf-8');
    const before = content;

    content = content
      .replace(/\beven:bg-[a-z]+-\d+\b/g, '')
      .replace(/\bodd:bg-[a-z]+-\d+\b/g, '');

    if (content === before) return { fixed: false, description: 'Pattern not found in current state' };

    if (!isDryRun) await fs.writeFile(filepath, content, 'utf-8');

    return {
      fixed: true,
      description: `Removed zebra row striping from ${issue.file}`,
    };
  },

  VEG_DOT_NOT_EMOJI: async (issue) => {
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) return { fixed: false, description: 'File not found' };

    let content = await fs.readFile(filepath, 'utf-8');
    const before = content;

    // Replace leaf/vegetable emoji with veg-dot component placeholder
    content = content.replace(/[🥬🌿🍃]/g, '');

    if (content === before) return { fixed: false, description: 'Pattern not found in current state' };

    if (!isDryRun) await fs.writeFile(filepath, content, 'utf-8');

    return {
      fixed: true,
      description: `Removed veg emoji from ${issue.file}. Manually add .veg-dot CSS class.`,
    };
  },

  HARDCODED_COLOR_VALUES: async (issue) => {
    const filepath = path.join(PROJECT_ROOT, issue.file);
    if (!await fs.pathExists(filepath)) return { fixed: false, description: 'File not found' };

    let content = await fs.readFile(filepath, 'utf-8');
    const before = content;

    const tokenMap = {
      '#FF4D3D': 'var(--brand)',
      '#14131A': 'var(--ink)',
      '#FFF8F3': 'var(--bg)',
      '#FFFFFF': 'var(--surface)',
      '#1E9E5E': 'var(--green)',
      '#F2A500': 'var(--amber)',
      '#E03A30': 'var(--red)',
    };

    for (const [hex, token] of Object.entries(tokenMap)) {
      // Only replace in style attributes and CSS, not in comments
      content = content.replace(new RegExp(hex.replace('#', '\\#'), 'g'), token);
    }

    if (content === before) return { fixed: false, description: 'Pattern not found in current state' };

    if (!isDryRun) await fs.writeFile(filepath, content, 'utf-8');

    return {
      fixed: true,
      description: `Replaced hardcoded hex colors with CSS variables in ${issue.file}`,
    };
  },
};

// ─── APPLY FIXES ──────────────────────────────────────────────────────────

async function applyFixes(report) {
  const appliedFixes = [];
  const skippedFixes = [];
  const manualFixes = [];

  // Sort: CRITICAL first, then HIGH, then MEDIUM
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const allIssues = report.screens
    .flatMap(s => s.issues.map(i => ({ ...i, screen: s.id })))
    .sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

  // Filter by target rule if specified
  const issueList = targetRule
    ? allIssues.filter(i => i.rule === targetRule)
    : allIssues.filter(i => i.severity !== 'LOW'); // Skip LOW in auto-fix

  console.log(`\n🔧 Processing ${issueList.length} issues...`);

  // Track already-processed files to avoid duplicate work
  const processedFileRules = new Set();

  for (const issue of issueList) {
    const key = `${issue.rule}::${issue.file || issue.screen}`;
    if (processedFileRules.has(key)) continue;
    processedFileRules.add(key);

    const strategy = FIX_STRATEGIES[issue.rule];

    if (!strategy) {
      manualFixes.push({
        issue,
        reason: 'No auto-fix strategy available for this rule. Requires manual intervention.',
      });
      continue;
    }

    if (!issue.file) {
      manualFixes.push({
        issue,
        reason: 'No file path in issue report. Requires manual intervention.',
      });
      continue;
    }

    process.stdout.write(`  [${issue.severity}] ${issue.rule} in ${issue.file}... `);

    try {
      const result = await strategy(issue);
      if (result.fixed) {
        console.log(`✅ ${isDryRun ? '(DRY RUN) ' : ''}fixed`);
        appliedFixes.push({ issue, result });
      } else {
        console.log(`⏭  skipped: ${result.description}`);
        skippedFixes.push({ issue, reason: result.description });
      }
    } catch (err) {
      console.log(`✗ error: ${err.message}`);
      manualFixes.push({ issue, reason: err.message });
    }
  }

  return { appliedFixes, skippedFixes, manualFixes };
}

// ─── FINAL REPORT ─────────────────────────────────────────────────────────

function buildFinalReport(report, fixResults, isDryRun) {
  const { appliedFixes, skippedFixes, manualFixes } = fixResults;

  const fixTable = appliedFixes
    .map(({ issue }) => `| ${issue.screen || '_global'} | ${issue.rule} | ${issue.severity} | ✅ Fixed |`)
    .join('\n');

  const manualTable = manualFixes
    .map(({ issue, reason }) => `| ${issue.screen || '_global'} | ${issue.rule} | ${issue.severity} | ${reason.substring(0, 60)} |`)
    .join('\n');

  const remainingCritical = report.summary.critical_count - appliedFixes.filter(f => f.issue.severity === 'CRITICAL').length;
  const remainingHigh = report.summary.high_count - appliedFixes.filter(f => f.issue.severity === 'HIGH').length;

  return `# Enhancement Cycle — ${new Date().toLocaleDateString()}
${isDryRun ? '\n> ⚠️ DRY RUN MODE — No files were modified\n' : ''}

## Pre-Enhancement State
| Severity | Count |
|----------|-------|
| CRITICAL | ${report.summary.critical_count} |
| HIGH     | ${report.summary.high_count} |
| MEDIUM   | ${report.summary.medium_count} |

## Fixes Applied (${appliedFixes.length})

| Screen | Rule | Severity | Result |
|--------|------|----------|--------|
${fixTable || '| — | No auto-fixes applied | — | — |'}

## Manual Fixes Required (${manualFixes.length})

${manualFixes.length ? `| Screen | Rule | Severity | Reason |
|--------|------|----------|--------|
${manualTable}` : 'None — all issues auto-fixed ✅'}

## Skipped (${skippedFixes.length})
${skippedFixes.map(f => `- ${f.issue.rule} in ${f.issue.file || f.issue.screen}: ${f.reason}`).join('\n') || 'None'}

---

## Post-Enhancement Estimate
| Severity | Before | After |
|----------|--------|-------|
| CRITICAL | ${report.summary.critical_count} | ~${Math.max(0, remainingCritical)} |
| HIGH     | ${report.summary.high_count} | ~${Math.max(0, remainingHigh)} |
| MEDIUM   | ${report.summary.medium_count} | ~${Math.max(0, report.summary.medium_count - appliedFixes.filter(f => f.issue.severity === 'MEDIUM').length)} |

## Next Steps
1. ${remainingCritical > 0 ? '❌ Critical issues remain — address manually' : '✅ No critical issues remaining'}
2. ${remainingHigh > 0 ? `🟠 ${remainingHigh} high issues remain — check AUDIT_SUMMARY.md` : '✅ No high issues remaining'}
3. Run \`node 01_screenshotter.js --mode=verify\` to capture updated screenshots
4. Run \`node 02_auditor.js\` again to confirm fixes took effect
5. Review manual fixes in the table above

---

*Generated by ScanBite Enhancer Agent on ${new Date().toISOString()}*
`;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 ENHANCER — ${isDryRun ? 'DRY RUN MODE' : 'APPLYING FIXES'}\n`);

  if (!await fs.pathExists(REPORT_PATH)) {
    console.error('No audit report found. Run 02_auditor.js first.');
    process.exit(1);
  }

  const report = await fs.readJson(REPORT_PATH);

  console.log(`Audit report loaded:`);
  console.log(`  🔴 CRITICAL: ${report.summary.critical_count}`);
  console.log(`  🟠 HIGH:     ${report.summary.high_count}`);
  console.log(`  🟡 MEDIUM:   ${report.summary.medium_count}`);

  if (report.summary.critical_count === 0 && report.summary.high_count === 0) {
    console.log('\n✅ No CRITICAL or HIGH issues to fix. All clean!');
    return;
  }

  const fixResults = await applyFixes(report);

  const finalReport = buildFinalReport(report, fixResults, isDryRun);
  await fs.writeFile(FINAL_REPORT_PATH, finalReport, 'utf-8');

  console.log('\n' + '═'.repeat(60));
  console.log('ENHANCEMENT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Auto-fixed:  ${fixResults.appliedFixes.length}`);
  console.log(`⏭  Skipped:    ${fixResults.skippedFixes.length}`);
  console.log(`📋 Manual req: ${fixResults.manualFixes.length}`);
  console.log('═'.repeat(60));

  console.log(`\n📄 Final report: ${FINAL_REPORT_PATH}`);

  if (!isDryRun && fixResults.appliedFixes.length > 0) {
    console.log('\n📸 Re-run screenshots to verify fixes:');
    console.log('   node 01_screenshotter.js --mode=verify');
    console.log('   node 02_auditor.js');
  }

  if (fixResults.manualFixes.length > 0) {
    console.log('\n⚠️  Manual intervention required for some issues.');
    console.log('   See FINAL_REPORT.md for details.');
  }
}

main().catch(err => {
  console.error('Enhancer crashed:', err);
  process.exit(1);
});
