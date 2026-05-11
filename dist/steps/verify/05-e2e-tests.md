检测项目中是否有 E2E 测试或测试步骤文件：
```bash
ls tests/e2e/ e2e/ cypress/e2e/ 2>/dev/null | head -5
cat .sillyspec/changes/*/e2e-steps.md 2>/dev/null | head -5
```

**无任何测试** → 跳过此步骤。

**有测试** → 确认修复策略（AskUserQuestion）：
1. 自动修复，同一用例最多 5 次（超过停止，提示人工介入）
2. 一直修复直到全绿
3. 只报告，不自动修复

**按优先级执行：**

**优先级 1：专业 E2E 框架（Playwright/Cypress）**
```bash
npx playwright test 2>/dev/null || npx cypress run 2>/dev/null
```

**优先级 2：通用测试框架（jest/vitest）**
```bash
npx vitest run 2>/dev/null || npx jest 2>/dev/null
```

**优先级 3：浏览器 MCP + e2e-steps.md（兜底）**
读取 `.sillyspec/changes/<变更名>/e2e-steps.md`，按步骤逐条执行。每条标注 ✅/❌。
