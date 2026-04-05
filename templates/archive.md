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

- [ ] **文件完整性：** 检查 `design.md` 是否存在，缺失则警告
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
- quicklog 修改记录（如有 `.sillyspec/changes/<change-name>/quicklog/` 目录）

### 3. Spec 沉淀

将 `.sillyspec/changes/<change-name>/` 下的设计文档**复制到 `.sillyspec/knowledge/` 主目录**，确保已完成的设计规范可被后续变更参考。如目标已存在同名文件则跳过并提示。

### 4. 用户确认

用 AskUserQuestion 让用户确认：
- ① 确认归档
- ② 取消

### 4.5 生成归档摘要

在变更目录下自动生成 `SUMMARY.md`：

```markdown
# <变更名> 归档

- 创建：YYYY-MM-DD
- 完成：YYYY-MM-DD
- 涉及阶段：brainstorm → plan → execute → verify

## 关键决策
- （从 design.md 提取 3-5 条核心决策）

## 产出文件
- design.md — 设计文档
- tasks.md — 任务清单
- quicklog/ — 关联 quick 修改（N次）
  - quick1: 描述
  - quick2: 描述

## 代码变更统计
- 新增 X 文件，修改 Y 文件，删除 Z 文件
- 详见 CHANGELOG.md
```

在变更目录下自动生成 `CHANGELOG.md`：

```bash
# 收集该变更相关的 git commit（按变更名过滤或按时间范围）
git log --oneline --no-merges -- .sillyspec/changes/<change-name>/ 2>/dev/null
# 以及变更目录创建后的所有 commit
git log --oneline --no-merges --since="<创建时间>" -- "*.ts" "*.js" "*.vue" "*.java" 2>/dev/null
```

写入 CHANGELOG.md，格式：
```markdown
# <变更名> 变更日志

## brainstorm 阶段
- (相关 commit)

## plan 阶段
- (相关 commit)

## execute 阶段
- (相关 commit)

## quick 修改
- (相关 commit)

## verify 阶段
- (相关 commit)
```

### 5. 执行归档

- 目标路径：`.sillyspec/changes/archive/YYYY-MM-DD-<change-name>/`
- **检查目标路径是否已存在**，存在则中止并报错，防止覆盖
- 移动变更目录到归档路径

### 6. 归档后更新

- **tasks.md：** 确保所有 checkbox 都已勾选 `[x]`
- **ROADMAP.md**（如存在）：标记对应 Phase 已完成
- **STATE.md：** 清除当前变更信息，历史记录追加归档完成（含精确到秒的时间戳）
- **Git 暂存：** `git add .sillyspec/`

**工作区模式下：** 如果变更属于某个子项目，cd 到子项目目录执行 git add。工作区根目录无 git 则跳过。

💡 归档产出已暂存。准备好后用 `/sillyspec:commit` 提交。

### 最后说：

> ✅ 变更 `<change-name>` 已归档到 `archive/YYYY-MM-DD-<change-name>/`。继续：`/sillyspec:brainstorm "新想法"`
