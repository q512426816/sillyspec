## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 不写测试（底线是仍然要写测试）
- ❌ 修改无关文件
- ❌ 跳过测试因为"任务太简单"

## 任务
$ARGUMENTS

---

## 流程

1. **理解任务：** 模糊则问一个问题确认
2. **加载最小上下文：** `cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null`
3. **TDD 执行：** 🔴 写失败测试 → 🟢 写最少代码 → 🔵 重构
4. **运行相关测试：** `pnpm test 2>/dev/null || npm test 2>/dev/null || pytest 2>/dev/null`
5. **Git commit：** `git add -A && git commit -m "fix: $ARGUMENTS"`

如果任务比预期复杂 → 停下来建议用完整流程。
