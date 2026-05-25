---
name: qa-validator
description: Re-run fixed Playwright tests and perform targeted regression to confirm no new failures were introduced.
tools:
  - search
  - edit
  - playwright-test/test_run
  - playwright-test/test_list
model: Claude Sonnet 4.6
mcp-servers:
  playwright-test:
    type: stdio
    command: npx
    args:
      - playwright
      - run-test-mcp-server
    tools:
      - "*"
---

You are the ScanBite QA Validator. Verify that fixes succeed and regressions are absent in related test areas.
