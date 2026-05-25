#!/usr/bin/env node
'use strict';

/**
 * Pipeline Orchestrator
 * Runs all three agents in sequence: Screenshot → Audit → Enhance
 *
 * Usage:
 *   node run-pipeline.js                 Full pipeline
 *   node run-pipeline.js --level=1       Screenshot only
 *   node run-pipeline.js --level=2       Audit only
 *   node run-pipeline.js --level=3       Enhance only
 *   node run-pipeline.js --verify        Screenshot + Audit after enhancement
 *   node run-pipeline.js --dry-run       Enhance without writing files
 *   node run-pipeline.js --screen=X      Target single screen (screenshot only)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const args = process.argv.slice(2);
const levelArg = args.find(a => a.startsWith('--level='))?.split('=')[1];
const isVerify = args.includes('--verify');
const isDryRun = args.includes('--dry-run');
const screenArg = args.find(a => a.startsWith('--screen='));

function run(script, extraArgs = '') {
  const scriptPath = path.join(__dirname, script);
  const cmd = `node "${scriptPath}" ${extraArgs} ${args.filter(a => !a.startsWith('--level=')).join(' ')}`.trim();
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${cmd}`);
  console.log('─'.repeat(60));
  execSync(cmd, { stdio: 'inherit', cwd: __dirname });
}

async function main() {
  console.log('\n🚀 SCANBITE UI QUALITY PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Mode: ${isVerify ? 'VERIFY' : levelArg ? 'LEVEL ' + levelArg : 'FULL'}`);
  console.log(`Dry run: ${isDryRun ? 'YES' : 'NO'}`);
  console.log('═'.repeat(60));

  await fs.ensureDir(path.join(__dirname, 'output', 'screenshots'));

  try {
    if (isVerify) {
      // Post-enhancement verification
      run('01_screenshotter.js', '--mode=verify');
      run('02_auditor.js', '--mode=diff');
      return;
    }

    const level = levelArg ? parseInt(levelArg) : 0; // 0 = all

    if (level === 0 || level === 1) {
      run('01_screenshotter.js', screenArg || '');
    }

    if (level === 0 || level === 2) {
      run('02_auditor.js');
    }

    if (level === 0 || level === 3) {
      run('03_enhancer.js', isDryRun ? '--dry-run' : '');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ PIPELINE COMPLETE');
    console.log('═'.repeat(60));
    console.log('\nOutput files:');
    console.log('  agents/output/screenshots/   — Visual captures');
    console.log('  agents/output/audit-report.json — Structured issues');
    console.log('  agents/output/AUDIT_SUMMARY.md  — Human-readable audit');
    console.log('  agents/output/FINAL_REPORT.md   — Enhancement results');

  } catch (err) {
    console.error('\n❌ Pipeline failed:', err.message);
    process.exit(1);
  }
}

main();
