#!/usr/bin/env node
'use strict';

/**
 * CI Gate — exits with code 1 if any CRITICAL issues are found in the audit report.
 * Used in GitHub Actions to block merges with critical design violations.
 */

const fs = require('fs-extra');
const path = require('path');

const REPORT_PATH = path.join(__dirname, 'output', 'audit-report.json');

async function main() {
  if (!await fs.pathExists(REPORT_PATH)) {
    console.error('No audit report found. Run the pipeline first.');
    process.exit(1);
  }

  const report = await fs.readJson(REPORT_PATH);
  const critical = report.summary?.critical_count || 0;

  if (critical > 0) {
    console.error(`\n❌ CI GATE FAILED: ${critical} CRITICAL design violations found.`);
    console.error('   Review agents/output/AUDIT_SUMMARY.md for details.');
    console.error('   Run "node agents/03_enhancer.js" to auto-fix where possible.\n');

    // Print critical issues
    const criticalIssues = report.screens
      .flatMap(s => s.issues.filter(i => i.severity === 'CRITICAL').map(i => ({ ...i, screen: s.id })));

    for (const issue of criticalIssues) {
      console.error(`  [${issue.screen}] ${issue.rule}: ${issue.observed?.substring(0, 80)}`);
    }

    process.exit(1);
  }

  console.log(`\n✅ CI GATE PASSED: 0 critical issues.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
