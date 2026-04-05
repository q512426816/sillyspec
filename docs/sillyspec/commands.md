# 命令参考

## 核心流程

### init — 绿地项目初始化

**用途：** 深度提问、调研、生成需求文档和路线图。

```bash
/sillyspec:init
```

适用于空目录或新项目。会通过一系列问题挖掘需求，生成项目路线图。

---

### scan — 代码库扫描

**用途：** 交互式引导扫描已有代码库，生成代码库文档。

```bash
/sillyspec:scan
```

支持快速扫描和深度扫描两阶段。深度扫描会提取代码风格、注解、返回值等信息。

---

### brainstorm — 需求探索

**用途：** 结构化头脑风暴，直接产出 design.md + tasks.md。

```bash
/sillyspec:brainstorm "需求描述"
```

创建性工作前的必用命令。合并了 propose 功能，直接产出完整设计文档。

---

### propose — 生成规范（可选）

**用途：** 生成 proposal + design + tasks 三件套。

```bash
/sillyspec:propose "变更名"
```

通常 brainstorm 已包含此功能，仅在跳过 brainstorm 时手动使用。

---

### plan — 实现计划

**用途：** 编写实现计划，精确到文件路径和代码，按 Wave 分组。

```bash
/sillyspec:plan
```

不再生成独立的 plan.md，直接覆盖 tasks.md，按 Wave 分组任务。

---

### execute — TDD 执行

**用途：** 波次执行，支持子代理并行 + 强制 TDD + 两阶段审查。

```bash
/sillyspec:execute
```

先读后写铁律，每个任务完成后勾选 tasks.md checkbox，完成后询问是否 verify/归档。

---

### verify — 验证（可选）

**用途：** 对照规范检查 + 测试套件 + 代码审查 + E2E。

```bash
/sillyspec:verify
```

execute 完成后可选择执行，非强制。

---

### archive — 归档

**用途：** 规范沉淀到 knowledge/，可追溯。

```bash
/sillyspec:archive "变更名"
```

五道门禁：文件完整性、任务完成度、spec 沉淀、防覆盖。

---

## 辅助工具

### status — 查看进度

```bash
/sillyspec:status
```

显示当前项目阶段和状态。

---

### continue — 自动下一步

```bash
/sillyspec:continue
```

自动判断并执行下一步，适合不知道该做什么的时候。

---

### explore — 自由思考

```bash
/sillyspec:explore "想法"
```

讨论、画图、调研，不写代码。适合探索阶段。

---

### quick — 快速模式

```bash
/sillyspec:quick "任务描述"
```

跳过完整流程，直接做。支持 `--change xxx` 追加到变更 tasks.md。

---

### commit — 智能提交

```bash
/sillyspec:commit
```

自动收集变更信息，生成 commit message。

---

### state — 查看状态

```bash
/sillyspec:state
```

显示 STATE.md 内容，当前工作状态。

---

### resume — 恢复工作

```bash
/sillyspec:resume
```

从中断处继续。

---

### workspace — 工作区管理

```bash
/sillyspec:workspace
```

初始化、管理多项目工作区，查看子项目状态。

---

### export — 导出模板

```bash
/sillyspec:export
```

导出成功方案为可复用模板。

---

### progress — 进度管理

```bash
sillyspec progress status     # 查看进度
sillyspec progress reset      # 重置进度
sillyspec progress validate   # 校验修复
```

## 其他 CLI 命令

### dashboard — 启动面板

```bash
sillyspec dashboard              # 默认端口 3456
sillyspec dashboard --port 8080  # 指定端口
```

### docs migrate — 文档迁移

```bash
sillyspec docs migrate
```

迁移旧目录结构到新的统一文档结构。

### setup — MCP 工具安装

```bash
sillyspec setup          # 安装推荐 MCP 工具
sillyspec setup --list   # 查看状态
```
