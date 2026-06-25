---
author: qinyi
created_at: 2026-05-13T08:38:05
source_commit: 850b485
updated_at: 2026-06-24T10:18:40+08:00
generator: sillyspec-scan
---

# STRUCTURE

sillyspec 是一个 Node.js ESM CLI（v3.19.2），通过状态机驱动 AI 严格按阶段步骤完成 spec-driven 开发。入口为 `bin/sillyspec.js`，实际逻辑全在 `src/` 下。

## 顶层目录树

```
sillyspec/
├── bin/                      CLI 可执行入口
│   └── sillyspec.js          #!/usr/bin/env node shebang，仅 import '../src/index.js'
├── src/                      核心源码（全部 .js ESM）
│   ├── index.js              命令分发：解析 argv，路由到各阶段/子命令
│   ├── run.js                运行引擎：阶段状态机、步骤流转、门禁
│   ├── constants.js          全局常量定义
│   ├── init.js               绿地项目初始化（交互式）
│   ├── setup.js              MCP 服务器配置引导（chalk/ora/inquirer）
│   ├── migrate.js            v1/v2 → v3 历史进度迁移
│   ├── progress.js           ProgressManager：进度恢复，封装 DB 读写
│   ├── db.js                 SQLite WASM 存储层（sql.js/initSqlJs）
│   ├── sync.js               SillyHub 平台同步（原生 fetch，best effort）
│   ├── workflow.js           工作流解析（js-yaml）
│   ├── modules.js            模块映射与影响分析
│   ├── worktree.js           Git worktree 管理（隔离/原生元数据/overlay）
│   ├── worktree-apply.js     Worktree 变更应用
│   ├── task-review.js        任务评审逻辑
│   ├── change-list.js        变更清单聚合
│   ├── change-risk-profile.js 变更风险评估
│   ├── contract-matrix.js    契约矩阵
│   ├── knowledge-match.js    知识库匹配
│   ├── endpoint-extractor.js API 端点提取（扫描代码中的 fetch/apiFetch）
│   ├── stage-contract.js     阶段契约校验
│   ├── scan-postcheck.js     扫描后置检查
│   ├── stages/               阶段定义（每个文件 = 一个流程阶段）
│   │   ├── index.js          阶段注册表/导出
│   │   ├── scan.js           scan 扫描项目生成文档
│   │   ├── brainstorm.js     brainstorm 需求澄清
│   │   ├── plan.js           plan 拆解实现计划
│   │   ├── execute.js        execute 代码实现
│   │   ├── verify.js         verify 验证
│   │   ├── archive.js        archive 归档
│   │   ├── doctor.js         doctor 状态自检/修复
│   │   ├── explore.js        explore 自由调研
│   │   ├── propose.js        propose 生成规范
│   │   ├── quick.js          quick 轻量直改
│   │   └── status.js         status 查看进度
│   └── hooks/                Git/工具钩子
│       ├── worktree-guard.js       Worktree 门禁（解析 local.yaml）
│       └── claude-pre-tool-use.cjs Claude Code PreToolUse 钩子（CJS）
├── test/                     测试套件（原生 node:test，.mjs）
│   ├── run-tests.mjs         测试聚合入口（npm test）
│   ├── check-syntax.mjs      语法/lint 检查入口（npm run lint）
│   └── *.test.mjs            约定式契约与平台回归测试（platform-* / scan-* / worktree-* 等）
├── templates/                模板资源
│   └── workflows/            工作流 YAML 模板（archive-impact.yaml、scan-docs.yaml）
├── docs/                     项目文档
│   ├── sillyspec/            sillyspec 自身规范文档（file-lifecycle、scan 子目录等）
│   ├── brainstorm-plan-contract.md
│   ├── plan-execute-contract.md
│   ├── platform-scan-protocol.md
│   ├── revision-mode.md
│   ├── workflow-contract-regression.md
│   └── worktree-isolation.md
├── packages/                 子包（独立）
│   └── dashboard/            可视化面板（独立 Vite 项目，不参与 CLI 主流程）
├── package.json              依赖与脚本（type: module，engines.node >= 18）
├── package-lock.json
├── README.md
├── SKILL.md
├── CLAUDE.md                 Claude Code 项目指引
└── logo.jpg
```

## 关键模块说明

- **bin/sillyspec.js** — shebang 入口，仅 `import '../src/index.js'`，由 package.json `bin` 字段注册为 `sillyspec` 命令。
- **src/index.js** — 命令分发中枢，解析顶层子命令并路由到对应阶段处理函数。
- **src/run.js** — 核心运行引擎，承载阶段状态机、步骤流转、门禁（gate）与同步触发。
- **src/stages/** — 12 个阶段定义文件，每个对应一个 sillyspec 流程阶段（scan/brainstorm/plan/execute/verify/archive/doctor/explore/propose/quick/status）。
- **src/db.js + src/progress.js** — 存储层：db.js 封装 sql.js（SQLite WASM），progress.js 提供 ProgressManager，权威状态存于 `.sillyspec/.runtime/sillyspec.db`。
- **src/sync.js** — SillyHub 平台同步，使用 Node 18+ 原生 fetch，best effort 不阻塞主流程。
- **src/worktree.js / worktree-apply.js / hooks/worktree-guard.js** — Git worktree 隔离体系，含原生元数据与 overlay 防自覆盖。
- **src/workflow.js** — 工作流 YAML 解析（js-yaml）。
- **test/** — 原生 `node:test` + .mjs，覆盖平台同步回归、scan 契约、worktree 隔离、阶段定义等。
- **packages/dashboard/** — 独立可视化面板子项目（自带 server/watcher/WebSocket），与 CLI 主流程解耦，本扫描不深入。
