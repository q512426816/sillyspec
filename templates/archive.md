## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 未经验证就归档（必须先确认验证通过）
- ❌ 未勾选的 checkbox 未告知用户就归档
- ❌ 归档后留下活跃变更的残留状态
- ❌ 覆盖已存在的归档目录

## 变更名称
$ARGUMENTS

---

## 流程

### 1. 前置检查（门禁）

读取 `.sillyspec/changes/<change-name>/` 下所有必要文件，逐项检查：

- [ ] **verify 状态：** 检查是否有验证记录，无则提示先执行 `/sillyspec:verify`
- [ ] **文件完整性：** 检查 `proposal.md` 和 `design.md` 是否存在，缺失则警告
- [ ] **任务完成度：** 读取 `tasks.md`，统计已完成/未完成任务数。**有未完成的 → 用 AskUserQuestion 询问：**
  - ① 继续归档（未完成任务将被标记完成）
  - ② 取消，回去完成任务

> 任一门禁不通过且用户选择取消 → 终止流程。

### 2. 展示归档清单

展示即将归档的内容摘要：
- 变更目录名
- 包含的文件列表
- 任务完成统计（✅ 已完成 / ⬜ 未完成）
- 一句话总结本次变更

### 3. Spec 沉淀

将 `.sillyspec/changes/<change-name>/specs/` 下的设计文档**复制到 `.sillyspec/specs/` 主目录**，确保已完成的设计规范可被后续变更参考。如目标已存在同名文件则跳过并提示。

### 4. 用户确认

用 AskUserQuestion 让用户确认：
- ① 确认归档
- ② 取消

### 5. 执行归档

- 目标路径：`.sillyspec/changes/archive/YYYY-MM-DD-<change-name>/`
- **检查目标路径是否已存在**，存在则中止并报错，防止覆盖
- 移动变更目录到归档路径

### 6. 归档后更新

- **tasks.md：** 确保所有 checkbox 都已勾选 `[x]`
- **ROADMAP.md**（如存在）：标记对应 Phase 已完成
- **STATE.md：** 清除当前变更信息，历史记录追加归档完成
- **Git 提交：** `git add .sillyspec/ && git commit -m "docs: archive sillyspec change <change-name>"`

### 最后说：

> ✅ 变更 `<change-name>` 已归档到 `archive/YYYY-MM-DD-<change-name>/`。继续：`/sillyspec:brainstorm "新想法"`
