---
author: flow-machine-draft
created_at: 2026-10-21T12:14:13.558Z
---
# 设计记录（Design Record）— 2026-10-21-lint-to-prepush

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用户选 A 案：收口 lint 全部移出，归 git 门。`commands.lint` 的唯一真实消费方是收口侧 `runVerifyLintCheck`（已核：friction-tally/gate-snapshot 只是注释提风格），CLI 既有 `unavailable` 标记（verify-postcheck.js:149-166）→ 标记即生效、src 零改动。措辞面：AGENTS.md 与 templates/agents-instruction.md 规则 4 被 test-runner-failed-face.test.mjs ③ 逐字钉着必须同改（措辞为通用语义：未配置/标 unavailable → 收口跳过归 pre-push/CI 门，不含本仓专属描述，模板仍适用消费仓）；CLAUDE.md 规则 8 lint 句同步。不选 B 案（面感知跳过）：用户明确选 A；不新增 lint_strategy 配置：既有 unavailable 标记已覆盖 A 案诉求，加配置是过度设计。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

CLI 代码接口无变化（src 零改动）。对外可见行为变化一处：本仓 flow done 收口 lint 子步从「跑 npm run lint（~50s）」变为「skipped，理由 local.yaml 未配置 commands.lint（或标记 unavailable）」。`.sillyspec/local.yaml` 的 `commands.lint` 值从 `"npm run lint"` 改为 `"unavailable"`（带注释指向本变更）。`.husky/pre-push` 明确不动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用：纯配置值替换与文档措辞改写，无事件流/输入顺序参与。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不适用：local.yaml 的 lint 行与 AGENTS/模板规则 4 行是静态文本，无并发语义；多会话同改同一行的冲突由 git 提交面自然暴露，无静默覆盖面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   不适用：各文件改动一次落盘、无中间态；中断只有未写/已写两态，重入由 flow 断点续机制承担。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不适用：local.yaml 是本仓私有配置不改其他仓；模板措辞变化属通用语义（描述 unavailable 标记的既有行为），消费仓默认行为不变（未标 unavailable 的仓收口 lint 照跑）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：收口证据不再含 lint 后，代码变更的 lint 破坏推迟到 push 才暴露（pre-push 拦截），多 agent 并行仓里 push 时 lint 红可能是他侧在途文件、归属判别成本后移——用户已知此代价并显式选 A；缓解：pre-push 钩子同一命令同一口径拦截，不丢防线只换时点。次风险：模板规则 4 措辞随版本发布扩散到消费仓——语义为 additive（描述既有 unavailable 标记），不改默认行为。放弃方案：① B 案面感知 lint（变更面零 lintable 文件才跳过）——放弃：用户显式选 A，且 B 需改 CLI+更多测试面；② 新增 lint_strategy 配置键——放弃：既有 unavailable 标记覆盖诉求，加键徒增配置面；③ 只改 AGENTS.md 不动模板——放弃：test-runner-failed-face ③ 逐字一致断言会红，且模板与 AGENTS 漂移。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | .sillyspec/local.yaml | commands.lint 值改 "unavailable"，注释指向本变更与理由 |
| 修改 | AGENTS.md | 规则 4 lint 两处措辞：补 unavailable 跳过语义、自验口径句改测试面为主 |
| 修改 | templates/agents-instruction.md | 规则 4 与 AGENTS.md 逐字同改（测试③锚定） |
| 修改 | CLAUDE.md | 规则 8 lint 相关句同步同语义（该文件本已自然漂移，只动 lint 面） |
| 修改 | test/test-runner-failed-face.test.mjs | ③ KEY 句更新为新口径句（含 unavailable 语义断言） |
