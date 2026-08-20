# auto mode — 设计文档

author: qinyi
created_at: 2026-04-08 07:28:00

## 背景

当前 sillyspec 的每个阶段（brainstorm → plan → execute → verify）需要用户手动执行 `sillyspec run <stage>` 和 `sillyspec run <stage> --done`。用户希望一个自动模式，从 brainstorm 一路推进到 verify 完成。

## 需求

1. 用户启动一次，AI 自动循环所有阶段和步骤
2. 步骤内部的用户确认点保留不变
3. 不修改 CLI 代码，纯 skill 文件实现

## 设计

### 新增文件：`.claude/skills/sillyspec-auto/SKILL.md`

**核心逻辑：**

1. 读 `$ARGUMENTS` 作为用户需求
2. 阶段循环（brainstorm → plan → execute → verify）
3. 每个阶段内步骤循环：
   - `sillyspec run <stage> --input "需求"` → 读 step prompt
   - 执行 prompt 中的操作
   - 需要用户确认的步骤 → 暂停等回复
   - 完成后自动 `sillyspec run <stage> --done --output "摘要"`
   - 读下一步 prompt，继续
4. 当前阶段全部完成 → 自动进入下一阶段
5. verify 完成 → 输出总结，停止
6. 命令失败 → 暂停，等用户介入

**确认点保留规则：**
- prompt 中有"请用户选择""等待用户回答""展示给用户"等字样 → 暂停
- prompt 中有"自审""检查"等纯内部操作 → 自动完成

### 同步到 npm 包

init.js 已有逻辑复制 `sillyspec-*` skills 到项目 `.claude/skills/`，新 skill 自动生效。

## 改动范围

- 新增：`.claude/skills/sillyspec-auto/SKILL.md`（~60 行）

## 不做的事

- 不修改任何 JS 源码
- 不改变现有阶段流程
- 不自动 commit 或发布
