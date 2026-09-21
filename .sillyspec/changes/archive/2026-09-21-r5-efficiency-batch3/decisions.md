---
author: qinyi
created_at: 2026-09-21T22:52:00
---
# 决策记录（Decisions）— R5 效率优化第 3 批

## D-001@v1: 测试结果记账=fail-closed 三键指纹，宁假红不假绿
- type: design
- question: 全量测试结果何时可复用？
- answer: 三键全等才复用：codeFingerprint（HEAD+porcelain 脏摘要）×testSetHash（命令+测试面内容摘要）×envProfile（结构化探针：cwd worktree 布尔/平台模式/SILLYSPEC 键集/node 版本/平台名，裸路径不入键）。三层 fail-closed：键分量不可得=不复用；失败结果永不缓存（失败即走真跑修复）；严格全等无模糊无时间窗放宽。worktree 与主仓因 envProfile 天然分键（batch2 实证 13 环境族测试在两种 cwd 表现不同）。
- impacts: [src/run/test-ledger.js, gates.js/verify-postcheck.js/quick 实测门消费点]
- evidence: batch2 七跑全量账（必要 2-3 跑）；quality-scan P0-1 指纹复用先例（单向，本批泛化多消费点）
- 故障面: 假绿（指纹漏维度放走回归）→ 三层 fail-closed + 「改一行必重跑」验收钉
- 退役判据: 对撞重跑实测复用率<30%（记账未命中说明键设计过严或消费点未接全）

## D-002@v1: 预检补全=--full 只读档，与 --done 同引擎，「预检过=必过」
- type: design
- question: gate 预检如何覆盖 --done 独有的贵门？
- answer: `sillyspec gate <stage> --full` 增只读档：module 子集实测（经 P2 复用）、reconcile 只读跑、stage review 缺失探测、quick 实测门同口径。全只读零副作用（账本写入除外）；默认档现状零变化；口径承诺=同源同引擎（batch1 verify-lint-parity 先例），「--full 绿→--done 不因同因再拦」写进测试。
- impacts: [src/run/gates.js, src/verify-postcheck.js, src/index.js flag 注册]
- evidence: batch2 四类 --done 独有失败（stage review/reconcile×2/manifest）均为预检盲区，每起=一整 agent 回合
- 故障面: 口径漂移（--full 与 --done 判定不同源）→ 同引擎调用+parity 测试钉
- 退役判据: 无（方向性设施）

## D-003@v1: 归档就绪度=草拟不代写，apply 强提示只在老化交集态
- type: design
- question: verify 收口如何让 archive 回到分钟级？
- answer: verify --done 尾部出「归档就绪度报告」：未-apply 面（checkOnly 含合并感知）+manifest 补行草拟+module-impact 归因草拟——只草拟带「待确认」标记，agent 确认后自落（代写会弱化声明门禁确认语义）。apply 强提示条件=main HEAD 前进过基点 ∩ 前进文件与交付面有交集（batch2 实证 118bb92f 窗口期）。归档门保持全查（verify→archive 间状态变化由复查兜底）。
- impacts: [src/run/complete-handlers.js]
- evidence: batch2 archive 三查全部时段内首查=15 回合主因；118bb92f 窗口期三方合并面
- 故障面: 草拟被误当自动确认 → 「待确认」标记+代写禁令约束
- 退役判据: 无（编排层）

## D-004@v1: M1 缺省开，env 逃生门保留，迁移面以全量零红为硬门
- type: design
- question: SILLYSPEC_STEP_GUIDE 何时翻默认？
- answer: 本批翻转：未设=开（短输出+落盘），=0 显式关。前置迁移 stdout 确定性测试族（别名路由奇偶校验等 5 断言）逐例改 fixture 设 0 或断言短形态（逐例迁移注记可审计）。D-001@batch2（指纹增量）退役判据兑现；--json 全量与动态段永不缓存语义不动。
- impacts: [src/run/prompt.js, 受影响测试族]
- evidence: 单会话跑到底为既定形态（用户裁决）→ 每步注入税被轮数乘数放大，翻默认收益最大化
- 故障面: 迁移漏测试面 → 翻转后全量零红硬门+逐例注记
- 退役判据: 无（终态）
