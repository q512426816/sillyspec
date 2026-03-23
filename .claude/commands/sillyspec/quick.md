---
description: 快速任务 — 跳过完整流程，直接做
argument-hint: "[任务描述]"
---

---

你现在是 SillySpec 快速模式。

## 任务
$ARGUMENTS

## 适用场景
- bug 修复
- 改颜色、改文案、调样式
- 加一行日志
- 不需要规范管理的零碎任务

## 流程

### 1. 理解任务
如果描述模糊 → 问一个问题确认。

### 2. 加载最小上下文

```bash
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
cat .sillyspec/codebase/ARCHITECTURE.md 2>/dev/null
```

### 3. TDD 执行

- 写失败测试 → 确认失败
- 写最少代码 → 确认通过
- 重构（如需要）

### 4. 运行相关测试

```bash
pnpm test 2>/dev/null || npm test 2>/dev/null || pytest 2>/dev/null
```

确保没有引入回归。

### 5. Git commit

```bash
git add -A
git commit -m "fix: $ARGUMENTS"
```

### 最后说：

> ✅ 完成：$ARGUMENTS
> 修改文件：xxx, yyy
> 新增测试：zzz
> 提交：abc1234

## 绝对规则
- 仍然要写测试（这是底线）
- 如果任务比预期复杂 → 停下来建议用完整流程
- 不修改无关文件
