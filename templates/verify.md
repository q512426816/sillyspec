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

检测项目中是否有 E2E 测试：
```bash
ls tests/e2e/ e2e/ cypress/e2e/ 2>/dev/null | head -5
cat .sillyspec/local.yaml 2>/dev/null | grep -A1 "e2e-framework"
```

**无 E2E 测试** → 跳过此步骤。

**有 E2E 测试** → 先确认修复策略（AskUserQuestion）：
1. 自动修复，同一用例最多 5 次（超过停止，提示人工介入）
2. 一直修复直到全绿
3. 只报告，不自动修复

**执行测试：**
```bash
npx playwright test 2>/dev/null || npx cypress run 2>/dev/null
```

**自动修复循环（选了策略 1 或 2 时）：**
读取 `.sillyspec/local.yaml` 中 `e2e-results` 的 `fixAttempts`，对每个失败测试：
- fixAttempts 未达上限 → 调 `/sillyspec:quick "修复 E2E 失败：<失败描述>"` → 重跑该测试 → 更新 local.yaml
- fixAttempts 达到上限 → 停止，报告失败详情，提示人工介入

**更新测试结果到 `.sillyspec/local.yaml`：**
```yaml
e2e-results:
  - name: login.spec.ts
    status: passed
    duration: "2.3s"
    time: "2026-03-31T12:30:00+08:00"
    fixAttempts: 0
```

### 5. 代码质量扫描

```bash
grep -r "TODO\|FIXME\|HACK\|XXX" src/ lib/ app/ --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" 2>/dev/null | head -20
```

审查 design.md「文件变更」中列出的文件：安全问题（输入校验、SQL拼接、硬编码敏感信息）、潜在 bug（空值、边界条件）、与 CONVENTIONS.md 一致性。每个问题标 🔴必须 / 🟡建议 / 🔵优化。

### 6. 输出验证报告

```markdown
# SillySpec 验证报告
## 任务完成度：X/Y
## 设计一致性
## 测试结果：passed N, failed N
## 技术债务标记
## 代码审查：🔴 N / 🟡 N / 🔵 N
## E2E 测试：passed N / failed N / fixAttempts 详情
## 结论：✅ PASS / ⚠️ PASS WITH NOTES / ❌ FAIL
```

### 7. 完成

更新 `.sillyspec/STATE.md`（如存在）：阶段改为 `verify ✅` 或 `verify ⚠️`，记录精确到秒的时间戳。
