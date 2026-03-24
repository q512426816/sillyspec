---
description: 验证实现 — 对照规范检查 + 测试套件
argument-hint: "[可选：指定验证范围]"
---

## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改任何代码（只做检查和报告）
- ❌ 跳过状态检查
- ❌ 自行推进到下一阶段

## 状态检查（必须先执行）

```bash
sillyspec status --json
```

- `phase: "verify"` → ✅ 继续
- 其他 phase → 提示 `sillyspec next`

---

## 流程

### 1. 加载规范

```bash
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{proposal,design,tasks}.md "$LATEST/specs/requirements.md" 2>/dev/null
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

### 5. 代码质量扫描

```bash
grep -r "TODO\|FIXME\|HACK\|XXX" src/ lib/ app/ --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" 2>/dev/null | head -20
```

### 6. 输出验证报告

```markdown
# SillySpec 验证报告
## 任务完成度：X/Y
## 设计一致性
## 测试结果：passed N, failed N
## 技术债务标记
## 结论：✅ PASS / ⚠️ PASS WITH NOTES / ❌ FAIL
```

```bash
bash scripts/validate-all.sh 2>/dev/null
```

### 7. 完成

```bash
sillyspec status --json && sillyspec next
```

更新 `.sillyspec/STATE.md`：阶段改为 `verify ✅` 或 `verify ⚠️`。
