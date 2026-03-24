## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

> **提示：** 通常不需要单独执行 propose。brainstorm 阶段会自动产出 design.md。仅当需求已经明确、跳过 brainstorm 时才手动执行 propose。

## 核心约束（必须遵守）
- ❌ 写实现代码
- ❌ tasks.md 写具体步骤（只列任务名）
- ❌ 编造表名、字段名、API 端点（必须来自 ARCHITECTURE.md 或明确标注"新增"）

## 状态检查（必须先执行）

```bash
sillyspec status --json
```

- `phase: "propose"` → ✅ 继续
- 其他 phase → 提示 `sillyspec next`

## 变更名称
$ARGUMENTS

---

## 流程

### 1. 加载上下文

```bash
cat .sillyspec/changes/*/MASTER.md 2>/dev/null  # 子阶段变更
ls -t .sillyspec/specs/*.md | head -1
cat .sillyspec/{REQUIREMENTS}.md .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
ls .sillyspec/changes/ | grep -v archive
```

**子阶段变更（如 `name/stage-1`）：** 读 MASTER.md 获取方向 + 前序经验 + 原型分析。规范保存到 `changes/<name>/stages/<stage-N>/`。

无设计文档 → 提示先 `/sillyspec:brainstorm`。

### 1.5 锚定确认（必须完成）

确认实际存在的文件。

### 2. 探索现有代码

理解相关模块当前实现，识别影响范围。

### 3. 生成规范文件

创建 `.sillyspec/changes/$ARGUMENTS/`：

**`proposal.md`：** 动机、变更范围、不在范围内、可量化成功标准

**`specs/requirements.md`：** 功能需求（REQ-001 格式）、Given/When/Then 用户场景、非功能需求

**`design.md`：** 架构决策及理由、文件变更清单表格、数据模型、API 设计、**代码风格参照**（参考已有的 Controller/Service/Entity 源文件，标注返回值类型、异常类型、注解风格）

**`tasks.md`：** 准备 → 实现 → 收尾的任务列表（每个 task 标注文件路径）

### 4. 展示关键文件

展示 proposal.md 和 design.md 给用户审阅。tasks.md 只展示任务列表。

### 5. 自检门控

- [ ] proposal.md 含"动机、变更范围、不在范围内、成功标准"？
- [ ] design.md 含"文件变更清单"表格？
- [ ] requirements.md 含 Given/When/Then 用户场景？
- [ ] tasks.md 每个 task 有文件路径？

```bash
bash scripts/validate-proposal.sh .sillyspec/changes/$ARGUMENTS 2>/dev/null
```

### 6. 完成

```bash
sillyspec status --json && sillyspec next
```

更新 `.sillyspec/STATE.md`：阶段改为 `propose ✅`，下一步 `/sillyspec:plan`。
