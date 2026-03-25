---
description: 自动判断并执行下一步
argument-hint: ""
---

## 核心约束（必须遵守）
- ❌ 跳过自动判断，直接执行某个阶段

## 核心约束（必须遵守）
- ❌ 跳过自动判断，直接执行某个阶段

---

## 判断逻辑

按顺序检查，第一个未完成的就执行：

```
1. 有进行中的变更？
   1a. 无文件 → 提示完善 proposal
   1b. 无 design.md → 提示补充 design
   1c. 无 tasks.md → 执行 /sillyspec:propose
   1d. tasks.md 有未完成项 + 有计划 → 执行 /sillyspec:execute
   1e. tasks.md 全完成 + 未验证 → 执行 /sillyspec:verify
   1f. 已验证通过 → 执行 /sillyspec:archive

2. 有设计文档但无对应变更？
   → /sillyspec:propose <name>

3. 有 .sillyspec/codebase/ 但无进行中工作？
   → /sillyspec:brainstorm "你的想法"

4. 什么都没有？
   → /sillyspec:init（新项目）或 /sillyspec:scan（棕地项目）
```

先报告检测结果，再执行。
