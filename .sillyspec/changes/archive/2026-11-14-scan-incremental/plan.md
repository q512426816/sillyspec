---
author: t
created_at: 2026-11-14 22:23:00
change: 2026-11-14-scan-incremental
plan_level: full
execution_mode: main  # dispatch=子代理派发（判据见「执行模式声明」；缺省 main 直写——R7/R8 对撞实证）
---

# 实现计划（Plan）— 2026-11-14-scan-incremental

> plan_level: full —— 判定理由：涉及 worktree-guard / isolation（hook 白名单分支）与 scan 基线推进基础设施；跨 scan 链路 + run 编排 + hooks + command 解析多模块；estimated_files = 15（design 清单实测计数，plan 审查 note 修正）。无 schema/DB/状态机流转变更。
> execution_mode: main —— 单会话可吞吐全部任务（R8 对撞实证派发税 3.6×），Wave 内主代理直写。

## Spike 前置验证
无——codegraph 命令输出形状已于设计期实测（status/files flat/affected，1.6.2 发布包），cmd-shim 解析有成熟参考实现（multi-agent-platform 仓 sillyhub-daemon/src/codegraph/cli.ts + cmd-shim.ts），无未验证技术集成。

## Wave 1（并行，无依赖）
- task-01

## Wave 2（依赖前序 Wave）
- task-02

## Wave 3（依赖前序 Wave）
- task-03
- task-04

## Wave 4（依赖前序 Wave）
- task-05

## Wave 5（依赖前序 Wave）
- task-06

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | codegraph 适配层（探测/形状映射/cmd-shim）+单测 | W1 | P0 | — | FR-01, FR-03 / D-002 | NEW:src/scan-codegraph.js + NEW:test/scan-codegraph.test.mjs：probeCodegraph 三态 fail-soft、resolveCodegraphCommand Windows .cmd 解析、status/files/affected 防御式形状映射、分级超时、统一 env |
| task-02 | 增量计划计算层+单测 | W2 | P0 | task-01 | FR-01, FR-02, FR-04, FR-06 / D-007, D-008 | NEW:src/scan-incremental.js + NEW:test/scan-incremental.test.mjs：computeIncrementalPlan（基线锚/变化集/归属/篇章映射/对账落盘/软门/quick 深度回退/guardDocs 产出）、单点排除常量（skipDirs 同源+'.sillyspec-codegraph/'） |
| task-03 | CLI 编排接线（flags/启动探测/guard/统一 bump） | W3 | P0 | task-01, task-02 | FR-01, FR-05, FR-07 / D-006, D-008 | src/run/command.js（--incremental/--force-incremental 白名单+帮助）、src/run/stage.js（scan 启动段探测+计划落盘+guard mode='scan-incremental' 握手）、src/hooks/worktree-guard.js（白名单新分支：内放行外照拦）、src/run/scan-profile.js（finalize 增量分支 stamp 后统一 bump）、.gitignore（本仓登记 .sillyspec-codegraph/） |
| task-04 | 编排 prompt 增量分支+facts scope | W3 | P0 | task-01, task-02 | FR-02 / D-009 | src/stages/scan.js（四生成步骤注入段+conditionalWait 豁免声明+压制「已存在则跳过」；步骤名/顺序不变）、src/scan-facts.js（scope 限定参数） |
| task-05 | 文档同步 | W4 | P1 | task-03, task-04 | FR-08（流程义务） | docs/sillyspec/file-lifecycle.md（新运行时文件条目）、node docs/prompt/_extract.mjs 重跑、docs/prompt/scan.md 逐字镜像、.claude/skills/sillyspec-scan/SKILL.md |
| task-06 | 跨仓实测验收 | W5 | P0 | task-01, task-02, task-03, task-04, task-05 | 全部 FR（验收） | multi-agent-platform 增量 scan（产物 diff 对比全量/耗时 token 实测数字）+ 临时空仓降级零回归 + 对账报告人工抽查 + 既有 scan 测试面回归 |

## 关键路径
task-01 → task-02 → task-03 → task-05 → task-06（task-04 与 task-03 并行后汇入 task-05）

## 全局硬约束（从 design.md 抄录，绑定所有 task）
- 降级链：未装 CodeGraph / 无索引 / 探测失败 / 超时 → 自动回退现行全量 scan，零行为回归，绝不因索引缺失阻断 scan（D-002）
- 不改 scan 文档契约与消费方（docs-check / modules rebuild / 进度库读取）；scan-refresh 命令面与行为不动（D-001）
- 索引只供结构事实（文件清单/依赖边/路由），模块划分仍按 `_module-map` 既有规则，新文件归属由 agent 补扫时判断——不做归属语义枚举自动化
- 增量判定自身秒级（status 一次 + git diff 一次），不得引入分钟级开销；超时降级全量
- codegraph 1.6.2 发布包无 `--local-only`/`--no-telemetry` 参数（禁携带）；`CODEGRAPH_DIR` 只接受项目根下单段目录名（禁嵌套）
- 代码兼容 Windows/Linux/macOS；子进程调用 execFile 参数数组形式，禁止 shell 拼接
- 文档/提示词/错误信息默认中文；CLI 输出文案自足（路径判定原因一次给全）
- scan 阶段步骤名与顺序不变（存量进度库兼容）；`--force-rescan`/`--quick`/`--standard`/`--deep` 语义不变
- 纯逻辑先写测试；行为契约断言用户可见行为

## 全局验收标准
1. 新增单测（scan-codegraph / scan-incremental）与受影响既有测试面全部通过
2. 既有 scan 测试（scan-diff / scan-staleness / scan-refresh / scan-postcheck）零改动零失败
3. brownfield：未装 CodeGraph 的仓行为与改动前完全一致（空仓实测）
4. 跨仓实测：multi-agent-platform 增量 scan 未受影响模块文档正文零变化、耗时与 token 相比全量显著下降（给实测数字）；对账报告与人工抽查一致

> 验收结论不落在 plan.md——逐项核验结果由 verify 阶段写入 verify-result.md；task 级验收对照 TaskCard frontmatter acceptance。

## Review Focus 盲区清单（隐含面）
| # | 输入/条件 | 合理人预期行为 | 承接落点 |
|---|---|---|---|
| 1 | codegraph 输出混入非 JSON 行（npm 噪声/警告前缀）或字段缺失 | 形状映射防御式解析失败 → 降级 unavailable/null，不 throw 不阻断 | task-01（单测夹具：污染输出/缺字段样本） |
| 2 | 受影响面含**新增**模块卡（基线后新文件，无旧内容可哈希） | guard docHashes 对新文件按「计划内新建」放行（哈希缺失≠拒绝），但仍在白名单内 | task-03（guard 白名单对新增文件路径的放行分支 + 单测） |
| 3 | 非 git 仓 / git rev-parse 失败时触发 scan | 计算层 fail-soft 返回 mode:'full'（git 失败原因留痕），不崩不挂 | task-02（单测：safeGit 全失败样本） |
| 4 | quick 档触增量（受影响含 scan_depth:quick 文档回退全量）且 quick 步表无「断点续扫检测」步 | 路径判定输出在启动层（三档统一），quick 回退原因仍可见 | task-03（启动层输出 + 单测：quick 深度触发回退） |
| 5 | 并行会话同时跑 scan（计划文件/guard 写竞态） | scan-incremental-plan.json 与 guard 均原子写（writeAtomicSync），后写覆盖前写（同变更并发本就未定义，不损坏文件） | task-03（原子写接线） |

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02（单源复用）、task-06（refresh 零回归实测） | AC：既有测试零改动零失败 |
| D-002@v1 | task-01（探测三态）、task-03（回退接线）、task-06（空仓实测） | AC：空仓行为与现行一致 |
| D-003@v1 | task-03（缺省自动+flag 兜底） | AC：无 flag 自动判定输出路径 |
| D-004@v1 | （rejected 防复潮，无覆盖任务） | — |
| D-005@v1 | （rejected 防复潮，无覆盖任务） | — |
| D-006@v1 | task-03（guard 握手+白名单分支） | AC：白名单内放行/外拦截单测 |
| D-007@v1 | task-02（quick 深度回退）、task-03（启动层三档） | AC：三档输出路径判定 |
| D-008@v1 | task-02（单点排除常量）、task-03（.gitignore） | AC：对账清单不含索引目录 |
| D-009@v1 | task-04（conditionalWait 豁免+压制声明） | AC：prompt 注入段明示 |
