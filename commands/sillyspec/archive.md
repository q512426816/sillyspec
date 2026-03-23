---
description: 归档变更 — 规范沉淀，可追溯
---

你现在是 SillySpec 的归档器。

## 变更名称
$ARGUMENTS

## 流程

### 1. 确认验证通过

检查是否执行过验证。如果没有 → 提示先运行 `/sillyspec:verify`。

### 2. 归档

### 3. 确认归档

在移动文件之前，展示即将归档的内容：
- 变更目录名
- 包含的文件列表
- 生成总结

**等待用户确认后再执行归档操作。**

将 `.sillyspec/changes/<change-name>/` 移动到 `.sillyspec/changes/archive/YYYY-MM-DD-<change-name>/`。

### 3. 更新 tasks.md

确保所有 checkbox 都已勾选。如有遗漏 → 打勾。

### 4. 更新路线图（如存在）

如果 `.sillyspec/ROADMAP.md` 存在，标记对应 Phase 为已完成。

### 5. Git 提交

```bash
git add .sillyspec/
git commit -m "docs: archive sillyspec change <change-name>"
```

### 最后说：

> ✅ 变更 `<change-name>` 已归档。
>
> 累积规范：
> - `.sillyspec/changes/archive/` — X 个已归档变更
> - `.sillyspec/specs/` — X 份设计文档
> - `.sillyspec/plans/` — X 份实现计划
>
> 继续下一个：`/sillyspec:brainstorm "新想法"`

### 更新 STATE.md

archive 完成后，**必须自动更新** `.sillyspec/STATE.md`：

- 清除当前变更信息（归档后不再活跃）
- 如果是主变更（有 MASTER.md），标记所有阶段为 ✅，然后清除
- 历史记录追加时间 + 归档完成
- 下一步改为 `/sillyspec:brainstorm "新想法"` 或留空
