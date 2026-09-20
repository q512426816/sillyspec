---
author: qinyi
created_at: 2026-09-21 10:30:00
---
# 需求规格（Requirements）— 流程命令卡

## 角色

| 角色 | 说明 |
|---|---|
| agent（受训方） | 新会话读卡获取 bootstrap 层（命令面/参数形态/坑清单）的执行者 |
| init 调用方 | `sillyspec init --tools <t>` 触发卡注入的用户/脚本 |
| 注入器 | `injectCommandCards`：读包内资产、按工具落点、三态幂等写盘 |

## 功能需求

### FR-01: init 按 tools 生成命令卡
Given 一个未初始化（或重跑）的项目目录
When `sillyspec init --tools zcode` 执行
Then `.zcode/commands/sillyspec/` 下出现 7 张卡（run-brainstorm/plan/execute/verify/archive/quick + status），尾部锚行含 `sillyspec-card: v<版本> sha256=<落盘正文sha>`（管理面单点；frontmatter 仅 name/description）

### FR-02: 三态幂等
Given 目标卡已存在
When 重跑 init 且尾部锚行在、剥离锚行重算的落盘正文 sha 与锚行记录一致（完好）
Then 与包内资产正文一致 → 不写（mtime 不动）；不一致（CLI 版本更新）→ 覆盖写新；锚行缺失（外来同名文件）或重算 sha 不符（用户手改正文）→ warn 跳过，仅 `--force` 覆盖

### FR-03: claude 双落点
Given init tools 含 claude
Then `.claude/commands/sillyspec/` 下同 7 张卡，语义同 FR-01/02

### FR-04: 卡内容四段契约
Given 任一张包内卡资产
When 检视其内容
Then 依次含：何时用（一行判据）/ 生命周期速查（逐字可粘贴命令块）/ 防坑清单（2-5 条实测坑）/ 边界声明（本卡不含步骤内容，跑 `sillyspec run <stage>` 取实时渲染指令）

### FR-05: zcode 入工具面
Given init 交互菜单或 --tools 校验
When 选择/传入 zcode
Then 被接受（VALID_TOOLS 新增项），且 zcode 工具同时获得 AGENTS.md 注入（跨工具通用标准内容源）+ 命令卡注入

### FR-06: 不动他者产物
Given 注入执行
When 目标目录存在用户自建文件
Then 仅触碰 sillyspec 命名空间的 7 张卡文件，其余文件零接触

## 非功能需求

- 兼容性：Windows/Linux/macOS 路径 join；卡 LF 落盘（writeAtomicSync）；npm 全局安装与本地 checkout 双形态资产读取（import.meta.url 相对解析）
- .npmignore 不排 assets/（黑名单模式维持，不新增 package.json files）+ 发版断言 `npm pack --dry-run | grep assets/command-cards`（防发布白屏）

## 决策覆盖矩阵（如存在 decisions.md）

| 决策 | 覆盖需求 |
|---|---|
| D-001 薄卡定位（不镜像步骤提示） | FR-04 边界声明段 |
| D-002 包内资产而非运行时生成 | FR-01/02 标记机制 |
| D-03 zcode+claude 双落点（其余工具不落） | FR-03/05，proposal 非目标清单 |
