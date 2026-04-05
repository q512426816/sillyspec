---
name: sillyspec:verify
description: 验证实现 — 对照规范检查 + 测试套件
---

> **可选阶段。** execute 完成后会询问是否需要 verify，也可以手动调用。

你现在是 SillySpec 的验证器。

## 🛑 流程控制（必须先执行）

**在开始任何工作之前，先调用 SillySpec CLI 检查当前状态：**

```bash
sillyspec status --json
```

**根据 CLI 返回的 phase 决定是否允许执行 verify：**
- `phase: "verify"` → ✅ 可以继续
- 其他 phase → ❌ 不允许跳步，提示用户运行 `sillyspec next` 获取正确步骤

**不要跳过状态检查。不要自己推断阶段。以 CLI 为准。**

## 流程

### 1. 加载规范

```bash
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST/proposal.md"
cat "$LATEST/design.md"
cat "$LATEST/tasks.md"
cat "$LATEST/specs/requirements.md" 2>/dev/null
```

### 1.5 锚定确认（必须完成）

读取相关规范文件。对于存在的文件，确认理解；对于不存在的文件，标注跳过：

```
已读取并理解：
- [x] proposal.md — 变更动机和范围（如果存在）
- [x] design.md — 技术方案和文件变更（如果存在）
- [x] tasks.md — 实现清单（如果存在）
- [x] specs/requirements.md — 需求和场景（如果存在）

所有可用上下文已加载，开始验证。
```

**文件不存在不是错误**。只确认实际存在的文件。不准跳过此步骤。

### 2. 逐项检查 tasks.md

对每个 checkbox 报告状态：
- ✅ 已完成 / ❌ 未完成 / ⚠️ 部分完成

### 3. 对照 design.md

- 架构决策是否遵循？
- 文件变更清单是否一致？
- 数据模型是否符合？
- API 设计是否符合？

### 4. 运行完整测试套件（fresh run）

```bash
# 根据项目技术栈运行
pnpm test 2>/dev/null || npm test 2>/dev/null || pytest 2>/dev/null || go test ./... 2>/dev/null
```

记录通过/失败数量。如有失败，分析原因。

### 5. 代码质量扫描

```bash
# 搜索技术债务标记
grep -r "TODO\|FIXME\|HACK\|XXX" src/ lib/ app/ --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" 2>/dev/null | head -20
```

### 6. 输出验证报告

```markdown
# SillySpec 验证报告

## 任务完成度
- [x] Task 1: xxx ✅
- [x] Task 2: xxx ✅
- [ ] Task 3: xxx ❌ 未实现
完成度：2/3

## 设计一致性
- ✅ 架构决策遵循
- ⚠️ API 返回格式与 design.md 略有差异（缺少 error 字段）

## 测试结果
- passed: 42, failed: 3

## 技术债务标记
- src/auth/login.ts:15 // TODO: add rate limiting
- src/auth/login.ts:45 // FIXME: token expiry

## 结论
⚠️ PASS WITH NOTES
```

## 脚本校验（硬验证）

在输出验证报告之前，运行综合校验脚本：

```bash
bash scripts/validate-all.sh
```

将脚本输出纳入验证报告中的"设计一致性"部分。

### 7. 最后说：

**用 CLI 验证并获取下一步：**

```bash
sillyspec status --json
```

展示结果给用户，然后：

```bash
sillyspec next
```

将 CLI 返回的命令推荐给用户。**不要自己编建议。**

### 8. 更新 progress.json

verify 完成后，**必须自动更新进度**：
```bash
sillyspec progress complete-stage verify
```

- 当前阶段改为 `verify ✅` 或 `verify ⚠️`
- 下一步改为 `/sillyspec:archive`（PASS 时）或 `修复后重新 /sillyspec:verify`
- 如果是子阶段，更新阶段进度；如果全部阶段完成，下一步改为 `/sillyspec:archive`
- 历史记录追加时间 + 验证结果

## 绝对规则
- 不修改任何代码
- 只做检查和报告
