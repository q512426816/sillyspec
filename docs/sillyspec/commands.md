# 命令参考

## 核心流程

### init — 绿地项目初始化

**用途：** 深度提问、调研、生成需求文档和路线图。

```bash
sillyspec init
```

适用于空目录或新项目。会通过一系列问题挖掘需求，生成项目路线图。

---

### scan — 代码库扫描

**用途：** 交互式引导扫描已有代码库，生成代码库文档。

```bash
sillyspec run scan
```

支持快速扫描和深度扫描两阶段。深度扫描会提取代码风格、注解、返回值等信息。

---

### brainstorm — 需求探索

**用途：** 结构化头脑风暴，直接产出 design.md + proposal.md + requirements.md + tasks.md。

```bash
sillyspec run brainstorm
```

创建性工作前的必用命令。合并了 propose 功能，一次性生成所有规范文件。包含批量/半批量模式检测。

---

### plan — 实现计划

**用途：** 编写实现计划，plan.md 总览 + tasks/task-N.md 独立蓝图。

```bash
sillyspec run plan
```

按 Wave 分组任务，每个任务产出独立的 task-N.md 蓝图（接口定义、数据结构、边界处理、TDD 步骤、验收标准）。plan.md 只放总览，不写实现细节。

---

### execute — 执行实现

**用途：** 波次执行，按 task 蓝图搬砖，禁止发散思维。

```bash
sillyspec run execute
```

CLI 自动注入 task-N.md 内容到 prompt。上下文分层加载（热/温/冷）。不频繁编译，只在必要时运行。

**铁律：**
- task-N.md 是唯一执行蓝图，只做蓝图里写的事，不增不减不改
- 发现问题停下来反馈，不要自己改方案
- Reverse Sync：发现 Bug 先检查文档是否有遗漏

---

### verify — 验证（可选）

**用途：** 对照文档检查 + 测试套件 + 代码审查 + 任务蓝图验收。

```bash
sillyspec run verify
```

分层验证：逐项检查任务 → 对照 design.md → 任务蓝图验收 → 运行测试 → 代码质量扫描。支持批量模式分层验证（L1 自动化 / L2 AI 抽查 / L3 模式性 bug 检测）。

---

### archive — 归档

**用途：** 规范沉淀到 knowledge/，可追溯。

```bash
sillyspec run archive
```

五道门禁：文件完整性、任务完成度、spec 沉淀、防覆盖。

---

### doctor — 项目自检

**用途：** 4 步自检，检查配置、构建环境和外部依赖。

```bash
sillyspec run doctor
```

步骤：SillySpec 内部检查 → 构建与测试检查 → 外部依赖检查 → 生成诊断报告。包含 deriveState 全量扫描。

---

### auto — 全流程自动推进

**用途：** 自动执行 brainstorm → plan → execute → verify。

```bash
sillyspec run auto "需求描述"
sillyspec run auto --input "需求" --done --output "摘要"  # 推进下一步
```

自动模式，AI 按步骤自动推进。支持阶段审核门控——brainstorm/plan 完成后可选多角度子代理审查。

---

## 辅助工具

### quick — 快速模式

```bash
sillyspec run quick "任务描述"
```

跳过完整流程，直接做。3 步完成：理解任务 → 实现并验证 → 暂存和记录。支持 `--change xxx` 追加到变更 tasks.md。

---

### explore — 自由思考

```bash
sillyspec run explore "想法"
```

讨论、画图、调研，不写代码。

---

### commit — 智能提交

```bash
/sillyspec:commit
```

自动收集变更信息（QUICKLOG/tasks.md/阶段产出），生成 commit message。

---

### status / state — 查看进度

```bash
sillyspec progress show    # 查看进度（含批量进度条）
/sillyspec:state           # 显示 progress.json 内容
```

---

### resume / continue — 恢复工作

```bash
/sillyspec:resume          # 从中断处继续
/sillyspec:continue        # 自动判断下一步
```

---

### export — 导出模板

```bash
/sillyspec:export
```

导出成功方案为可复用模板。

---

### progress — 进度管理

```bash
sillyspec progress show      # 查看进度
sillyspec progress reset     # 重置进度
sillyspec progress validate  # 校验修复
sillyspec progress batch --total 100 --completed 73  # 更新批量进度
sillyspec progress batch --status                   # 查看批量进度
```

### run — 步骤驱动流程引擎

**用途：** CLI 控制的阶段流程，AI 通过此命令驱动每个阶段。

```bash
sillyspec run <stage>           # 进入指定阶段
sillyspec run <stage> --status  # 查看阶段进度
sillyspec run <stage> --done    # 标记当前步骤完成
sillyspec run <stage> --done --output "摘要"  # 标记完成 + 记录输出
sillyspec run <stage> --skip    # 跳过可选步骤
sillyspec run <stage> --reset   # 重置阶段
```

支持的阶段：`scan`、`brainstorm`、`plan`、`execute`、`verify`、`doctor`。

## 其他 CLI 命令

### dashboard — 启动面板

```bash
sillyspec dashboard              # 默认端口 3456
sillyspec dashboard --port 8080  # 指定端口
```

### setup — MCP 工具安装

```bash
sillyspec setup          # 安装推荐 MCP 工具
sillyspec setup --list   # 查看状态
```
