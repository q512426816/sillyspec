---
author: flow-machine-draft
created_at: 2026-10-21T12:20:19.508Z
---
# 决策记录（Decisions）— 2026-10-21-lint-to-prepush

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：收口证据不再含 lint 后，代码变更的 lint 破坏推迟到 push 才暴露（pre-push 拦截），多 agent 并行仓里 push 时 lint 红可能是他侧在途文件、归属判别成本后移——用户已知此代价并显式选 A；缓解：pre-push 钩子同一命令同一口径拦截，不丢防线只换时点。次风险：模板规则 4 措辞随版本发布扩散到消费仓——语义为 additive（描述既有 unavailable 标记），不改默认行为。放弃方案：① B 案面感知 lint（变更面零 lintable 文件才跳过）——放弃：用户显式选 A，且 B 需改 CLI+更多测试面；② 新增 lint_strategy 配置键——放弃：既有 unavailable 标记覆盖诉求，加键徒增配置面；③ 只改 AGENTS.md 不动模板——放弃：test-runner-failed-face ③ 逐字一致断言会红，且模板与 AGENTS 漂移。
