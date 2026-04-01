## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

> **可选阶段。** execute 完成后会询问是否需要 verify，也可以手动调用。

## 核心约束（必须遵守）
- ❌ 修改任何代码（只做检查和报告）
- ❌ 跳过状态检查
- ❌ 自行推进到下一阶段

## 状态检查（必须先执行）

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

检查当前阶段。如果没有 STATE.md，检查是否有未归档变更：

```bash
ls .sillyspec/changes/ 2>/dev/null | grep -v archive
```

无 STATE.md 且无未归档变更 → 提示用户先完成 execute 或用 `/sillyspec:status` 查看状态。

---

## 工作区模式处理

如果 `.sillyspec/config.yaml` 包含 `projects` 字段：

1. 检查工作区根目录 `.sillyspec/changes/` 下的未归档变更
2. 检查每个子项目 `<子项目路径>/.sillyspec/changes/` 下的未归档变更
3. 列出所有未归档变更，让用户选择要验证哪个
4. 根据 $ARGUMENTS 或用户选择，cd 到对应目录执行验证

---

## 流程

### 1. 加载规范

```bash
# 确定变更目录
if [ -n "$ARGUMENTS" ]; then
  CHANGE_DIR=".sillyspec/changes/$ARGUMENTS"
else
  CHANGE_DIR=$(ls -d .sillyspec/changes/*/ 2>/dev/null | grep -v archive | tail -1)
fi
cat "$CHANGE_DIR"/{design,tasks}.md 2>/dev/null
cat .sillyspec/local.yaml 2>/dev/null
```

锚定确认实际存在的文件。

### 2. 逐项检查 tasks.md

对每个 checkbox 报告：✅ 已完成 / ❌ 未完成 / ⚠️ 部分完成

### 3. 对照 design.md

架构决策？文件变更一致性？数据模型？API 设计？

### 4. 运行测试套件

```bash
pnpm test 2>/dev/null || npm test 2>/dev/null || pytest 2>/dev/null || go test ./... 2>/dev/null
```

### 4b. E2E 测试

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
读取 `.sillyspec/changes/<变更名>/e2e-steps.md`，按步骤逐条执行。每条标注 ✅/❌，断言失败记为 FAILED。
> ⚠️ 使用 MCP 执行时 AI 判断可能不如测试框架精确。追求可靠性建议安装 Playwright。

**自动修复循环（选了策略 1 或 2 时）：**

必须按以下流程严格执行，不可跳过：

```
ROUND = 1
MAX_ROUNDS = 策略1时为5，策略2时为50

while ROUND <= MAX_ROUNDS:
    1. 运行失败测试，捕获完整输出（错误信息、堆栈、期望值 vs 实际值）
    2. 如果全部通过 → 跳出循环，标记 ✅
    3. 读取 .sillyspec/local.yaml 中当前变更的 fixAttempts
    4. 对每个失败测试：
       a. 如果 fixAttempts >= MAX_ROUNDS → 跳过，标记 ❌ MAX_REACHED
       b. 否则 → 调 /sillyspec:quick 修复，prompt 必须包含：
          - 失败的测试文件路径和测试名
          - 完整错误信息（含期望值 vs 实际值）
          - 相关源文件路径
          - "只修复这个测试失败，不要改其他代码"
       c. 修复后重跑该测试确认是否通过
       d. 通过 → fixAttempts 保持不变；仍失败 → fixAttempts + 1
    5. 写入 .sillyspec/local.yaml 更新 fixAttempts
    6. ROUND++
    7. 如果本轮无任何修复（所有失败都已 MAX_REACHED）→ 跳出循环
```

**quick 修复 prompt 模板：**
```
/sillyspec:quick "修复测试失败：<测试文件路径>:<测试名>

错误信息：
<完整错误输出，包含期望值和实际值>

相关文件：
<被测源文件路径>

只修复这个测试失败，不要改其他代码。修完后运行该测试确认通过。"
```

**禁止行为：**
- ❌ 只看错误摘要就修复（必须看完整输出）
- ❌ 跳过 fixAttempts 计数
- ❌ 一次 quick 修复多个不相关的失败（逐个修复，每次修复后重跑确认）
- ❌ 主代理直接修改代码（verify 阶段禁止改代码，必须通过 /sillyspec:quick）

**更新测试结果到 `.sillyspec/local.yaml`（按变更名隔离，覆盖写入）：**
```yaml
e2e:
  {变更名}:
    login.spec.ts:
      status: passed
      fixAttempts: 0
    form-submit.spec.ts:
      status: failed
      fixAttempts: 3
```

### 5. 代码质量扫描

```bash
grep -r "TODO\|FIXME\|HACK\|XXX" src/ lib/ app/ --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" 2>/dev/null | head -20
```

审查 design.md「文件变更」中列出的文件：安全问题（输入校验、SQL拼接、硬编码敏感信息）、潜在 bug（空值、边界条件）、与 CONVENTIONS.md 一致性。每个问题标 🔴必须 / 🟡建议 / 🔵优化。

### 5.5 MCP 基础设施验证

检测已配置的 MCP 服务，利用它们做实际验证（不只查文档）：

**MCP 能力检测：**

不要只检查配置文件路径（不同客户端配置位置不同），直接检查当前可用工具列表中是否存在以下工具：

- 数据库相关工具（包含 postgres/sqlite/mysql/redis 关键词）
- 浏览器相关工具（包含 browser/chrome/puppeteer/playwright/devtools 关键词）
- 搜索相关工具（包含 search/web_search 关键词）

**判断方式：** 尝试调用或列出当前可用的 MCP 工具，有就用来验证，没有就跳过。

**按检测结果执行对应验证：**

**数据库 MCP（postgres/sqlite/mysql/redis）：**
- 对照 design.md 中的数据模型，验证表/集合是否存在
- 验证字段类型、约束（主键、外键、唯一索引）是否与设计一致
- 验证新增的 API 是否能正确读写对应数据
- ⚠️ 只执行 SELECT 查询，禁止任何写操作

**浏览器 MCP（chrome-devtools/puppeteer/playwright）：**
- 验证页面能否正常加载（无 404/500 错误）
- 验证关键 UI 元素是否存在（导航、表单、按钮等）
- 验证基础交互（点击、提交、跳转）

**API MCP：**
- 验证新增接口是否可达
- 验证请求/响应格式是否与设计一致

**无 MCP → 跳过此步骤，不影响验证结论。**

将验证结果纳入验证报告。

### 6. Lint / Format 检查

自动检测并运行项目配置的 lint/format 工具，验证代码是否符合规范：

```bash
# ESLint
if [ -f .eslintrc -o -f .eslintrc.js -o -f .eslintrc.cjs -o -f .eslintrc.json -o -f .eslintrc.yml ] || grep -q '"eslint"' package.json 2>/dev/null; then
  echo "=== ESLint ==="
  npx eslint . --max-warnings 0 2>&1 | tail -50
fi

# Prettier（检查而非修复）
if [ -f .prettierrc -o -f .prettierrc.js -o -f .prettierrc.json -o -f .prettierrc.yml ] || grep -q '"prettier"' package.json 2>/dev/null; then
  echo "=== Prettier ==="
  npx prettier --check . 2>&1 | tail -30
fi

# TypeScript 类型检查
if [ -f tsconfig.json ]; then
  echo "=== TypeScript ==="
  npx tsc --noEmit 2>&1 | tail -30
fi

# Stylelint
if [ -f .stylelintrc -o -f .stylelintrc.js -o -f .stylelintrc.json ] || grep -q '"stylelint"' package.json 2>/dev/null; then
  echo "=== Stylelint ==="
  npx stylelint "**/*.{css,scss,less}" 2>&1 | tail -30
fi
```

**处理策略（AskUserQuestion）：**
1. **自动修复** — 对支持 `--fix` 的工具（ESLint、Prettier、Stylelint）自动修复后重跑检查，同一问题最多修复 3 次
2. **只报告** — 仅列出所有 lint 错误，不修改代码

将 lint 结果纳入验证报告（步骤 7）。

### 7. 输出验证报告

```markdown
# SillySpec 验证报告
## 任务完成度：X/Y
## 设计一致性
## 测试结果：passed N, failed N
## 技术债务标记
## 代码审查：🔴 N / 🟡 N / 🔵 N
## Lint 检查：ESLint ✅/❌ | Prettier ✅/❌ | TypeScript ✅/❌ | Stylelint ✅/❌
## MCP 基础设施验证：数据库 ✅/❌/跳过 | 页面 ✅/❌/跳过 | API ✅/❌/跳过
## E2E 测试：passed N / failed N / fixAttempts 详情
## 结论：✅ PASS / ⚠️ PASS WITH NOTES / ❌ FAIL
```

### 7. 完成

更新 `.sillyspec/STATE.md`（如存在）：阶段改为 `verify ✅` 或 `verify ⚠️`，记录精确到秒的时间戳。
