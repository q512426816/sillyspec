---
author: qinyi
created_at: 2026-05-13T08:38:05
source_commit: 4401b3d
updated_at: 2026-08-16T19:07:28+08:00
generator: sillyspec-scan
---

# STRUCTURE

sillyspec 是一个 Node.js ESM CLI（v3.26.8），通过状态机驱动 AI 严格按阶段步骤完成 spec-driven 开发。入口为 `bin/sillyspec.js`，实际逻辑全在 `src/` 下。

## 顶层目录树

```
sillyspec/
├── bin/                      CLI 可执行入口
│   └── sillyspec.js          #!/usr/bin/env node shebang，仅 import '../src/index.js'
├── src/                      核心源码（全部 .js ESM，node:sqlite 存储）
│   ├── index.js              CLI 主入口：usage/子命令路由（init/setup/run/progress/knowledge 等）
│   ├── run.js                run 命令 barrel（23 行 re-export），实际逻辑在 src/run/ 叶子模块
│   ├── progress.js           ProgressManager W6 facade（1127 行），实现拆至 src/progress/ 子模块
│   ├── version.js            轻量读 package.json 版本号（--version 高频路径不加载重型依赖）
│   ├── constants.js          平台状态枚举等全局常量（scan/postcheck/workflow-runs 共享）
│   ├── init.js               绿地项目初始化（cmdInit + AGENTS.md 指引注入 + CLAUDE.md 指针 + .runtime 残留清理）
│   ├── setup.js              MCP 工具安装引导（cmdSetup，版本锁定）
│   ├── migrate.js            旧 .sillyspec/ 结构迁移到统一 docs/<project>/（migrateDocs）
│   ├── db-engine.js          node:sqlite DatabaseSync 引擎抽象层（pragma/事务/savepoint 封装）
│   ├── db.js                 DB 存储层（export class DB，schema 版本戳）
│   ├── sync.js               SillyHub 平台同步 SyncManager（原生 fetch，best effort 不阻塞）
│   ├── workflow.js           工作流引擎：加载/校验/执行 .sillyspec/workflows/*.yaml
│   ├── modules.js            模块映射（_module-map.yaml）重建/状态/依赖文档生成
│   ├── worktree.js           WorktreeManager：git worktree 生命周期（create/list/cleanup/meta）
│   ├── worktree-apply.js     worktree 变更应用回主工作区（applyWorktree）
│   ├── worktree-deps.js      worktree 依赖供给引擎（junction/symlink 快路径 + install 兜底）
│   ├── task-review.js        execute 任务级评审 gate（review.json 硬校验）
│   ├── stage-review.js       阶段级审查 gate（文档型，与 task-review 分工）
│   ├── review-tier.js        审查分级：self（自审）vs independent（独立子代理）
│   ├── stage-contract.js     StageContract 阶段协议（前置/产出/校验器/后续）
│   ├── stage-contract-spec.js 阶段产物契约 manifest（单一真相源）
│   ├── stage-contract-engine.js 产物字面校验通用引擎（消费 contract-spec）
│   ├── check-primitives.js   共享产物校验原语（contains_sections/min_lines 等纯函数）
│   ├── change-list.js        design 文件清单解析（normalizePath/globMatch/parseFileChangeList）
│   ├── change-risk-profile.js 变更风险分级 P0/P1/P2（detectChangeRisk → risk-profile）
│   ├── change-delete.js      变更删除命令（status='deleted' 终态 + 移目录/清 worktree/推墓碑）
│   ├── classify-change.js    变更规模分类器（quick/auto/full，供 auto 模式选流程深度）
│   ├── contract-matrix.js    API 契约矩阵：plan 生成 provider/consumer，execute 注入
│   ├── knowledge-match.js    knowledge 关键词匹配引擎（INDEX.md → hit report）
│   ├── endpoint-extractor.js HTTP 端点提取（provider 路由 vs consumer apiFetch 对账）
│   ├── docs-check.js         文档 file:line 引用校验核心（存在性 + 行号实测）
│   ├── docs-gate.js          docs check 的 ratchet 门（欠账只许减少不许增加）
│   ├── docs-debt.js          模块文档欠账事实计算（CLI 算事实注入 Wave prompt）
│   ├── doctor-diagnostics.js 结构化项目自检（平台模式状态分裂检测）
│   ├── scan-postcheck.js     scan 完成 CLI 强制校验（不信任 agent 自检报告）
│   ├── scan-staleness.js     scan 文档新鲜度提示（D-7 方案 A）
│   ├── verify-postcheck.js   verify 客观测试执行与自报告对账（CLI 亲自跑测试）
│   ├── quick-recommend.js    quick 多变更关联推荐打分（脏文件+任务描述双信号）
│   ├── quicklog.js           QUICKLOG 条目 CLI 接管层（ql-ID 分配 + 追加）
│   ├── config-schema.js      local.yaml 配置键单一数据源
│   ├── local-detect.js       纯 fs 项目类型嗅探（create/gate 用，几秒完成不跑全 scan）
│   ├── machine-interface.js  机器接口层 v1（JSON envelope + 退出码契约，driver 模式地基）
│   ├── git-helper.js         统一 git 调用入口（execFileSync 数组参数，不经 shell）
│   ├── fs-atomic.js          原子文件写 + Windows rename 重试（pointer/guard.json 等）
│   ├── spec-dir-typo.js      spec 目录拼写变体检测（.silyspec 等近似拼写提示）
│   ├── run/                  run 命令叶子模块（W6 重构从 run.js 单体拆出，11 文件）
│   │   ├── shared.js         共享纯工具（parsePorcelainPath/didYouMean/resolveSpecDir 等）
│   │   ├── command.js        runCommand 主入口 + auto 模式 + ensureStageSteps
│   │   ├── stage.js          runStage 执行主干（run <stage> 默认路径 + 启动期副作用）
│   │   ├── prompt.js         outputStep prompt 渲染（persona/铁律/占位符/注入框架）
│   │   ├── complete.js       completeStep 完成处理核心（调度主干 + WAIT 门控）
│   │   ├── complete-handlers.js completeStep 子 handler + archive 收尾
│   │   ├── gates.js          阶段完成校验 gate 级联 + execute deps 硬门 + 完成回滚
│   │   ├── quick-audit.js    quick 审计结论打印 + 多变更关联选择
│   │   ├── scan-profile.js   scan profile 数据生成 + quick scan preflight/postcheck
│   │   ├── concurrent-detect.js 多 agent 并发写预检（git status 单扫 → 关联/他者分类）
│   │   └── multi-repo-context.js 跨仓 task 运行时多仓执行上下文（W1 task-01）
│   ├── progress/             ProgressManager 子模块（W6 Step9 拆分，5 文件，持 pm 引用）
│   │   ├── shared.js         progress 共享常量（STAGE_ORDER/VALID_STAGES 等，防循环引用）
│   │   ├── change-registry.js 变更注册表（changes 表生命周期：注册/隔离/审批状态）
│   │   ├── step-store.js     阶段/步骤/批量进度管理（stages+steps+batch_progress 表）
│   │   ├── stage-machine.js  阶段状态机（completeStage/reopen/reset/validate/show）
│   │   └── consistency-doctor.js Revision v1 状态一致性检查与修复 + --force 审计
│   ├── stages/               阶段定义（15 文件：每阶段一个 + 共享 helper）
│   │   ├── index.js          stageRegistry 注册表（10 阶段 + auxiliary 标记）
│   │   ├── brainstorm.js     brainstorm 头脑风暴（交互式需求澄清）
│   │   ├── brainstorm-auto.js auto/full 模式 brainstorm（artifact-first，自动决策）
│   │   ├── plan.js           plan 拆解实现计划（buildPlanSteps 动态步骤）
│   │   ├── plan-postcheck.js plan 确定性校验（拓扑排序/蓝图一致性/产物校验）
│   │   ├── execute.js        execute 代码实现（buildExecuteSteps 动态 + 契约矩阵注入）
│   │   ├── verify.js         verify 验证（全局护栏：禁止破坏性操作）
│   │   ├── archive.js        archive 归档变更
│   │   ├── quick.js          quick 快速直改（跳过完整流程）
│   │   ├── scan.js           scan 代码扫描（辅助阶段）
│   │   ├── explore.js        explore 自由探索（只读，辅助阶段）
│   │   ├── status.js         status 项目快照（只读，辅助阶段）
│   │   ├── doctor.js         doctor 项目自检（步骤结构，检查项在 prompt bash 中）
│   │   ├── knowledge.js      knowledge 管理命令（search/inspect/validate/refresh/propose）
│   │   └── cmd-existence.js  共享命令存在性校验（npm run/pnpm/yarn + monorepo 感知）
│   ├── dispatch/             任务派发策略层（dispatcher 非 JS 执行体，只产出派发指令）
│   │   ├── probe.js          SillyHub 能力探测（决定 dispatch 用 SillyHub 还是 Local 后端）
│   │   ├── strategy.js       派发策略生成器（依据 probe 结果选后端组合指令模板）
│   │   └── backends/         后端派发指令模板
│   │       ├── local-agent.js     Local 后端（Claude Code Task 工具）指令模板
│   │       └── sillyhub-mcp.js    SillyHub MCP 后端（create_mission 等）指令模板
│   ├── sillyhub-mcp/         SillyHub MCP 接入（2 文件）
│   │   ├── client.js         MCP 客户端（streamable HTTP，best-effort 不抛穿 execute）
│   │   └── config.js         MCP 凭据共享 helper（readMcpConfig 统一读源）
│   └── hooks/                Git/工具钩子
│       ├── worktree-guard.js     Hook 拦截判断（stageGate × locationGate × fileGate，直读 db）
│       └── claude-pre-tool-use.cjs Claude Code PreToolUse hook 入口（stdin JSON → guard）
├── test/                     测试套件（原生 node:test，207 个 *.test.mjs + dispatch/ 子目录）
│   ├── run-tests.mjs         测试聚合入口（npm test）
│   ├── check-syntax.mjs      语法/lint 检查入口（npm run lint）
│   ├── _cli-step-harness.mjs CLI 子进程步骤测试 harness
│   ├── _complete-step-harness.mjs completeStep 测试 harness
│   ├── decision-ref-version.mjs 决策引用版本一致性检查
│   ├── dispatch/             dispatch 层测试（strategy/probe/execute 集成）
│   └── *.test.mjs            约定式契约与回归测试（platform-* / scan-* / worktree-* 等）
├── templates/                模板资源（init 安装到用户项目）
│   ├── agents-instruction.md Agent 指引模板（AGENTS.md 完整内容源）
│   ├── prompts/              plan/execute prompt 片段（taskcard-rules / testcase-design / verify-probes）
│   ├── skills/               SKILL 模板（sillyspec-onboard）
│   └── workflows/            工作流 YAML 模板（archive-impact.yaml、scan-docs.yaml）
├── docs/                     项目文档
│   ├── sillyspec/            sillyspec 自身规范文档（file-lifecycle、scan/、troubleshooting 等）
│   ├── prompt/               各阶段 CLI→Agent 提示词镜像（由 _extract.mjs 从源码再生）
│   ├── troubleshooting.md    踩坑与修复登记
│   └── *.md                  各专项契约文档（brainstorm-plan / plan-execute / platform-scan 等）
├── packages/
│   └── dashboard/            可视化面板（独立 Vite 项目，不参与 CLI 主流程）
├── .sillyspec/               dogfood 进度库（sillyspec.db + changes/ + quicklog/ + docs/）
├── .claude/skills/           SillySpec SKILL 定义（随 npm 发布 + init 复制）
├── .husky/pre-push           push 前 hook（拦截未过校验的提交）
├── meta.json                 worktree 元数据（execute worktree 基线锚点）
├── package.json              依赖与脚本（type: module，engines.node >= 22.13.0）
├── package-lock.json
├── README.md
├── SKILL.md
├── CLAUDE.md                 Claude Code 项目指引
└── logo.jpg
```

## 关键模块说明

- **bin/sillyspec.js** — shebang 入口，仅 `import '../src/index.js'`，由 package.json `bin` 字段注册为 `sillyspec` 命令。
- **src/index.js** — CLI 主入口与子命令分发（init/setup/run/progress/knowledge 等），状态管理通过 sillyspec.db 完成。
- **src/run.js + src/run/** — W6 重构后 run.js 退化为 23 行 barrel（re-export 保留外部 import 契约），实际逻辑在 src/run/ 11 个叶子模块（shared/prompt/quick-audit/scan-profile/gates/complete-handlers/complete/stage/command 等）。
- **src/progress.js + src/progress/** — ProgressManager 为 W6 facade（1127 行），实现拆至 src/progress/ 5 个子模块（change-registry/step-store/stage-machine/consistency-doctor/shared），权威状态存于 `.sillyspec/.runtime/sillyspec.db`。
- **src/stages/** — 15 个文件：10 个流程阶段定义（brainstorm/plan/execute/verify/scan/quick/explore/archive/status/doctor）+ 辅助定义（brainstorm-auto/plan-postcheck/knowledge/cmd-existence/index）。propose.js 阶段已移除（knowledge 阶段另有 `propose` 子命令，指知识条目提议，与已移除的 propose 阶段无关）。
- **src/db.js + src/db-engine.js** — 存储层：db-engine.js 封装 node:sqlite DatabaseSync（pragma/事务/savepoint），db.js 提供 DB 类与 schema 管理。
- **src/sync.js + src/sillyhub-mcp/** — SillyHub 平台集成：sync.js 为 best-effort 同步，sillyhub-mcp/ 为 MCP 客户端与凭据配置。
- **src/dispatch/** — 任务派发策略层：probe 探测 SillyHub 能力，strategy 按探测结果在 local-agent / sillyhub-mcp 两套后端指令模板间组合。dispatcher 产出指令文本，不做 JS 执行。
- **src/worktree.js / worktree-apply.js / worktree-deps.js / hooks/worktree-guard.js** — Git worktree 隔离体系：创建/应用/依赖供给/钩子拦截，含原生元数据与 overlay 防自覆盖。
- **src/docs-check.js + docs-gate.js + docs-debt.js** — 文档一致性体系：行号引用校验、ratchet 门、欠账事实计算。
- **test/** — 原生 `node:test` + .mjs（207 个 test 文件），覆盖平台同步回归、scan 契约、worktree 隔离、阶段定义、dispatch 策略等。
- **packages/dashboard/** — 独立可视化面板子项目（自带 server/watcher/WebSocket），与 CLI 主流程解耦，本扫描不深入。
