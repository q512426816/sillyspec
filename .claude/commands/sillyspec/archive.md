---
description: 归档变更 — 规范沉淀，可追溯
argument-hint: "[变更名]"
---

## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 未经验证就归档（必须先确认验证通过）
- ❌ 归档后留下活跃变更的残留状态

## 变更名称
$ARGUMENTS

---

## 流程

1. **确认验证通过：** 检查是否执行过 verify，没有则提示 `/sillyspec:verify`
2. **展示归档内容：** 变更目录名、文件列表、生成总结
3. **用户确认：** AskUserQuestion 确认归档或取消
4. **执行归档：** 移动到 `.sillyspec/changes/archive/YYYY-MM-DD-<change-name>/`
5. **更新 tasks.md：** 确保所有 checkbox 勾选
6. **更新 ROADMAP.md**（如存在）：标记对应 Phase 已完成
7. **Git 提交：** `git add .sillyspec/ && git commit -m "docs: archive sillyspec change <change-name>"`

### 最后说：

> ✅ 变更 `<change-name>` 已归档。继续：`/sillyspec:brainstorm "新想法"`

更新 `.sillyspec/STATE.md`：清除当前变更信息，历史记录追加归档完成。
