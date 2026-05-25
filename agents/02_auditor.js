#!/usr/bin/env node
'use strict';

/**
 * AGENT 2: AUDITOR
 *
 * Reads screenshots + source files, compares against DESIGN_SPEC.md rules,
 * and produces a structured audit report with specific change requests.
 *
 * Usage:
 *   node 02_auditor.js
 *   node 02_auditor.js --mode=diff   (compare against previous run)
 */

const fs = require('fs-extra');
const path = require('path');
const { globSync } = require('glob');
const { CRITICAL_RULES, HIGH_RULES, MEDIUM_RULES, SCREEN_CONTRACTS } = require('./lib/design-rules');

const MANIFEST_PATH = path.join(__dirname, 'output', 'manifest.json');
const REPORT_PATH = path.join(__dirname, 'output', 'audit-report.json');
const SUMMARY_PATH = path.join(__dirname, 'output', 'AUDIT_SUMMARY.md');

// Root of the Next.js project
const PROJECT_ROOT = path.join(__dirname, '..', 'qrdine');

// ─── SOURCE FILE SCANNER ───────────────────────────────────────────────────

function scanSourceFiles(patterns) {
  const results = [];
  for (const pattern of patterns) {
    const files = globSync(pattern, { cwd: PROJECT_ROOT, absolute: true });
    results.push(...files);
  }
  return [...new Set(results)];
}

function readFileContent(filepath) {
  try {
    return fs.readFileSync(filepath, 'utf-8');
  } catch {
    return '';
  }
}

// ─── RULE CHECKER ─────────────────────────────────────────────────────────

function checkRuleInSources(rule) {
  const issues = [];
  const filePatterns = rule.filePatterns || [
    'components/**/*.tsx',
    'app/**/*.tsx',
    'app/**/*.css',
  ];

  const files = scanSourceFiles(filePatterns);

  for (const filepath of files) {
    const content = readFileContent(filepath);
    if (!content) continue;

    for (const pattern of rule.patterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : pattern;

      let match;
      const freshRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');

      while ((match = freshRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const lineContent = content.split('\n')[lineNum - 1]?.trim() || '';

        // Skip if in allowed context
        if (rule.allowedContexts && rule.allowedContexts.some(ctx => lineContent.includes(ctx))) {
          continue;
        }

        const relPath = path.relative(PROJECT_ROOT, filepath).replace(/\\/g, '/');

        issues.push({
          severity: rule.severity,
          rule: rule.id,
          file: relPath,
          line: lineNum,
          observed: lineContent.substring(0, 120),
          expected: rule.fix || 'See DESIGN_SPEC.md for the correct pattern',
          fix_hint: rule.fix || '',
        });

        // Don't report more than 5 instances of same rule per file
        if (issues.filter(i => i.file === relPath && i.rule === rule.id).length >= 5) break;
      }
    }
  }

  return issues;
}

// ─── CSS PROPERTY CHECKER ─────────────────────────────────────────────────

function checkCSSContracts(screenId, screenshotPath) {
  const contract = SCREEN_CONTRACTS[screenId];
  if (!contract) return [];

  const issues = [];

  // Check for forbidden patterns in source files related to this screen
  const screenName = screenId.replace('admin-', '').replace('customer-', '').replace('kds-', '');

  for (const forbidden of (contract.forbidden || [])) {
    if (forbidden.includes('emoji')) {
      // Already caught by NO_EMOJI_UI rule
      continue;
    }
    issues.push({
      severity: 'MEDIUM',
      rule: 'SCREEN_CONTRACT',
      screen: screenId,
      observed: `Potential violation: ${forbidden}`,
      expected: `Screen ${screenId} must not have: ${forbidden}`,
      fix_hint: `Review ${screenId} against DESIGN_SPEC.md section 6-8`,
    });
  }

  return issues;
}

// ─── GLOBAL CSS CHECKS ────────────────────────────────────────────────────

function checkGlobalCSS() {
  const issues = [];
  const globalCSSPath = path.join(PROJECT_ROOT, 'app', 'globals.css');
  const content = readFileContent(globalCSSPath);

  if (!content) {
    issues.push({
      severity: 'CRITICAL',
      rule: 'MISSING_GLOBALS_CSS',
      file: 'app/globals.css',
      observed: 'File not found or empty',
      expected: 'globals.css must contain all --brand tokens from DESIGN_SPEC.md',
      fix_hint: 'Ensure app/globals.css exists and imports the brand token system',
    });
    return issues;
  }

  // Check brand tokens are defined
  const requiredTokens = ['--brand', '--ink', '--bg', '--surface', '--sh-coral', '--r-pill', '--sans', '--display'];
  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      issues.push({
        severity: 'CRITICAL',
        rule: 'MISSING_BRAND_TOKEN',
        file: 'app/globals.css',
        observed: `Token ${token} not found in globals.css`,
        expected: `${token} must be defined in :root {}`,
        fix_hint: `Copy the :root token block from brandassets/app.css`,
      });
    }
  }

  // Check fonts are loaded
  if (!content.includes('Plus Jakarta Sans') && !content.includes('PlusJakartaSans')) {
    issues.push({
      severity: 'HIGH',
      rule: 'MISSING_FONTS',
      file: 'app/globals.css or app/layout.tsx',
      observed: 'Plus Jakarta Sans not found in CSS',
      expected: 'Font must be loaded via next/font/google',
      fix_hint: "import { Plus_Jakarta_Sans } from 'next/font/google'",
    });
  }

  return issues;
}

// ─── REPORT BUILDER ───────────────────────────────────────────────────────

function buildAuditReport(manifest, allIssues) {
  const byScreen = {};

  // Add source-level issues (not screen-specific, affects all)
  for (const issue of allIssues.source) {
    const screenKey = '_global';
    if (!byScreen[screenKey]) byScreen[screenKey] = { id: '_global', issues: [] };
    byScreen[screenKey].issues.push(issue);
  }

  // Add screen-specific CSS contract issues
  for (const [screenId, issues] of Object.entries(allIssues.screens)) {
    if (!byScreen[screenId]) byScreen[screenId] = { id: screenId, issues: [] };
    byScreen[screenId].issues.push(...issues);
  }

  const allFlatIssues = Object.values(byScreen).flatMap(s => s.issues);

  const summary = {
    timestamp: new Date().toISOString(),
    total_screens: manifest?.screenshots?.length || 0,
    screens_with_issues: Object.keys(byScreen).length,
    critical_count: allFlatIssues.filter(i => i.severity === 'CRITICAL').length,
    high_count: allFlatIssues.filter(i => i.severity === 'HIGH').length,
    medium_count: allFlatIssues.filter(i => i.severity === 'MEDIUM').length,
    low_count: allFlatIssues.filter(i => i.severity === 'LOW').length,
  };

  return { timestamp: summary.timestamp, summary, screens: Object.values(byScreen) };
}

// ─── MARKDOWN SUMMARY ─────────────────────────────────────────────────────

function buildSummaryMarkdown(report) {
  const { summary, screens } = report;

  const passFailRows = screens.map(s => {
    const criticals = s.issues.filter(i => i.severity === 'CRITICAL').length;
    const highs = s.issues.filter(i => i.severity === 'HIGH').length;
    const mediums = s.issues.filter(i => i.severity === 'MEDIUM').length;
    const status = criticals > 0 ? '❌ CRITICAL' : highs > 0 ? '⚠️ NEEDS WORK' : mediums > 0 ? '🔶 MINOR' : '✅ PASS';
    const issueText = [
      criticals ? `${criticals} CRITICAL` : '',
      highs ? `${highs} HIGH` : '',
      mediums ? `${mediums} MEDIUM` : '',
    ].filter(Boolean).join(', ') || 'None';
    return `| ${s.id} | ${status} | ${issueText} |`;
  });

  const criticalItems = screens
    .flatMap(s => s.issues.filter(i => i.severity === 'CRITICAL').map(i => ({ ...i, screen: s.id })))
    .map((i, n) => `${n + 1}. **${i.screen}**: ${i.observed} → ${i.fix_hint}`)
    .join('\n');

  const highItems = screens
    .flatMap(s => s.issues.filter(i => i.severity === 'HIGH').map(i => ({ ...i, screen: s.id })))
    .slice(0, 10) // Show top 10
    .map((i, n) => `${n + 1}. **${i.file || i.screen}** line ${i.line || '?'}: ${i.rule}`)
    .join('\n');

  return `# ScanBite UI Audit — ${new Date(report.timestamp).toLocaleDateString()}

## Summary

| Metric | Count |
|--------|-------|
| Screens Checked | ${summary.total_screens} |
| Screens with Issues | ${summary.screens_with_issues} |
| 🔴 CRITICAL | ${summary.critical_count} |
| 🟠 HIGH | ${summary.high_count} |
| 🟡 MEDIUM | ${summary.medium_count} |
| ⚪ LOW | ${summary.low_count} |

---

## Critical Issues — Must Fix Before Deploy
${criticalItems || 'None ✅'}

---

## High Priority Issues
${highItems || 'None ✅'}

---

## Per-Screen Pass/Fail

| Screen | Status | Issues |
|--------|--------|--------|
${passFailRows.join('\n')}

---

## Top Rule Violations

${(() => {
  const allIssues = screens.flatMap(s => s.issues);
  const byCounts = {};
  for (const i of allIssues) { byCounts[i.rule] = (byCounts[i.rule] || 0) + 1; }
  return Object.entries(byCounts)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)
    .map(([rule, count]) => `- **${rule}**: ${count} occurrences`)
    .join('\n') || 'None';
})()}

---

*Generated by ScanBite Auditor Agent on ${new Date(report.timestamp).toISOString()}*
*Reference: DESIGN_SPEC.md*
`;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  await fs.ensureDir(path.join(__dirname, 'output'));

  console.log('\n🔍 AUDITOR — Running Design Compliance Checks\n');

  // Load manifest
  let manifest = null;
  if (await fs.pathExists(MANIFEST_PATH)) {
    manifest = await fs.readJson(MANIFEST_PATH);
    console.log(`📄 Manifest loaded: ${manifest.screenshots?.length || 0} screenshots`);
  } else {
    console.log('⚠️  No manifest found. Run 01_screenshotter.js first.');
    console.log('   Proceeding with source-only checks...\n');
  }

  const allIssues = {
    source: [],
    screens: {},
  };

  // ── Global CSS checks
  console.log('📋 Checking globals.css...');
  const cssIssues = checkGlobalCSS();
  allIssues.source.push(...cssIssues);
  if (cssIssues.length) console.log(`  Found ${cssIssues.length} CSS issues`);

  // ── Source file rule checks
  console.log('📋 Scanning source files for rule violations...\n');

  const allRules = [...CRITICAL_RULES, ...HIGH_RULES, ...MEDIUM_RULES];
  for (const rule of allRules) {
    process.stdout.write(`  Checking ${rule.id}... `);
    const issues = checkRuleInSources(rule);
    allIssues.source.push(...issues);

    if (issues.length === 0) {
      process.stdout.write('✅\n');
    } else {
      const critical = issues.filter(i => i.severity === 'CRITICAL').length;
      const high = issues.filter(i => i.severity === 'HIGH').length;
      process.stdout.write(`${critical ? '🔴 ' + critical + ' CRITICAL' : ''}${high ? ' 🟠 ' + high + ' HIGH' : ''} ${issues.length} total\n`);
    }
  }

  // ── Screen contract checks (if screenshots exist)
  if (manifest?.screenshots) {
    console.log('\n📋 Checking screen contracts...');
    for (const screenshot of manifest.screenshots) {
      if (screenshot.error) continue;
      const issues = checkCSSContracts(screenshot.screen, screenshot.path);
      if (issues.length) {
        allIssues.screens[screenshot.screen] = [
          ...(allIssues.screens[screenshot.screen] || []),
          ...issues,
        ];
      }
    }
  }

  // ── Build and save report
  const report = buildAuditReport(manifest, allIssues);
  await fs.writeJson(REPORT_PATH, report, { spaces: 2 });

  const summary = buildSummaryMarkdown(report);
  await fs.writeFile(SUMMARY_PATH, summary, 'utf-8');

  // ── Print results
  console.log('\n' + '═'.repeat(60));
  console.log('AUDIT RESULTS');
  console.log('═'.repeat(60));
  console.log(`🔴 CRITICAL: ${report.summary.critical_count}`);
  console.log(`🟠 HIGH:     ${report.summary.high_count}`);
  console.log(`🟡 MEDIUM:   ${report.summary.medium_count}`);
  console.log(`⚪ LOW:      ${report.summary.low_count}`);
  console.log('═'.repeat(60));

  console.log(`\n📄 Audit report: ${REPORT_PATH}`);
  console.log(`📄 Summary:      ${SUMMARY_PATH}`);

  if (report.summary.critical_count > 0) {
    console.log('\n❌ CRITICAL issues found. Run 03_enhancer.js to fix them.');
    process.exit(0); // Don't exit with error here — let the enhancer run
  } else {
    console.log('\n✅ No CRITICAL issues. Check AUDIT_SUMMARY.md for remaining items.');
  }
}

main().catch(err => {
  console.error('Auditor crashed:', err);
  process.exit(1);
});
