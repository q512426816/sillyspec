---
author: flow-machine-draft
created_at: 2026-10-28T16:03:46.900Z
---
# 提案书（Proposal）— 2026-10-29-open-metrics-gate

## 动机

任务原话转写：收口开放指标门与假测试评审判据

动机与背景：ub-mode（Uncle Bob 2026-10-25 发布的 agent 技能仓，3438 star）核心价值两点：确定性质量门（crapper CRAP 评分 / dryer 重复检测 / mutator 变异测试——机器在环硬判定）与测试有效性纪律（测行为不测实现，空实现仍绿即假测试）。对照本仓：流程门硬（状态机+收口实测），但指标面只有测试绿+lint 绿；假测试无判据。经会话讨论采纳两点进本仓：收口开放指标门 + 评审面假测试判据。不引入新依赖，命令开放不绑死任何工具；缺省未配置零开销（跳过留痕），慢工具（变异测试）定位 pre-push/CI 层不在每变更收口跑。

成功标准：
- local.yaml 新增 commands.metrics 键：未配置或标 unavailable 时收口跳过留痕（复用 lint 的 fail-open 语义）；配置后收口实测在隔离快照内执行，非零退出=门红阻断收口，结果计入 verify-runs 证据（kind: metrics），支持 metrics_timeout_sec 超时链
- 收口评审 taskbook（renderReviewerTaskbook）与测试厚度 advisory（buildTestSurfaceAdvisory）增补两判据：空实现判据（若每个函数返回空测试仍全绿则测试无效）与根因判据（只藏崩溃的 guard 不是修复）
- config-schema 注册新键（readers/desc/example），local.yaml.example 与 {LOCAL_COMMANDS} 注入自动带出，示例注释提及 CRAP/重复/变异类工具与快慢定位但不绑定
- 零新 npm 依赖；新增测试覆盖门三态（未配置跳过/配置通过/配置失败阻断）与判据文案渲染；quick-audit/flow-review/config-schema 相关既有面回归绿 + lint 绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. local.yaml 新增 commands.metrics 键：未配置或标 unavailable 时收口跳过留痕（复用 lint 的 fail-open 语义）；配置后收口实测在隔离快照内执行，非零退出=门红阻断收口，结果计入 verify-runs 证据（kind: metrics），支持 metrics_timeout_sec 超时链
2. 收口评审 taskbook（renderReviewerTaskbook）与测试厚度 advisory（buildTestSurfaceAdvisory）增补两判据：空实现判据（若每个函数返回空测试仍全绿则测试无效）与根因判据（只藏崩溃的 guard 不是修复）
3. config-schema 注册新键（readers/desc/example），local.yaml.example 与 {LOCAL_COMMANDS} 注入自动带出，示例注释提及 CRAP/重复/变异类工具与快慢定位但不绑定
4. 零新 npm 依赖；新增测试覆盖门三态（未配置跳过/配置通过/配置失败阻断）与判据文案渲染；quick-audit/flow-review/config-schema 相关既有面回归绿 + lint 绿

## 成功标准（可验证）

1. local.yaml 新增 commands.metrics 键：未配置或标 unavailable 时收口跳过留痕（复用 lint 的 fail-open 语义）；配置后收口实测在隔离快照内执行，非零退出=门红阻断收口，结果计入 verify-runs 证据（kind: metrics），支持 metrics_timeout_sec 超时链
2. 收口评审 taskbook（renderReviewerTaskbook）与测试厚度 advisory（buildTestSurfaceAdvisory）增补两判据：空实现判据（若每个函数返回空测试仍全绿则测试无效）与根因判据（只藏崩溃的 guard 不是修复）
3. config-schema 注册新键（readers/desc/example），local.yaml.example 与 {LOCAL_COMMANDS} 注入自动带出，示例注释提及 CRAP/重复/变异类工具与快慢定位但不绑定
4. 零新 npm 依赖；新增测试覆盖门三态（未配置跳过/配置通过/配置失败阻断）与判据文案渲染；quick-audit/flow-review/config-schema 相关既有面回归绿 + lint 绿
