## 核心约束（必须遵守）
- ❌ 跳过自动判断，直接执行某个阶段

---

## 判断逻辑

**先检查是否工作区模式：**
```bash
cat .sillyspec/config.yaml 2>/dev/null | grep -q "projects"
```

**工作区模式：** 同时检查根目录和每个子项目，列出所有未完成的工作，让用户选择继续哪个。

**单项目模式：** 按顺序检查，第一个未完成的就执行：

```
1. 有进行中的变更？
   1a. 无 design.md → 提示补充设计（/sillyspec:brainstorm）
   1b. 无 tasks.md → 执行 /sillyspec:plan
   1c. tasks.md 有未完成项 + 有计划 → 执行 /sillyspec:execute
   1d. tasks.md 全完成 + 未验证 → 执行 /sillyspec:verify（可选）
   1e. 已验证通过 → 执行 /sillyspec:archive

2. 有 .sillyspec/codebase/ 但无进行中工作？
   → /sillyspec:brainstorm "你的想法"

3. 什么都没有？
   → /sillyspec:init（新项目）或 /sillyspec:scan（棕地项目）
```

先报告检测结果，再执行。
