---
author: flow-machine-draft
created_at: 2026-09-27T00:19:43.381Z
---
# 提案书（Proposal）— 2026-09-27-gate-face-binding-parity

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:7d79d065a91beaa67379497da23279009b508b8d708126cad65ee36f186d04fb:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-face-binding-parity 留痕重锚 -->
任务原话转写：R23 三臂实证暴露三个缺口：① thin 门禁文件面盲区——快照锚 HEAD+「先提交再收口」使 overlay 与 HEAD 同内容，快照内 diff 看不见已提交交付（R23-thin 门禁 dynamic-empty 假跳过，主仓权威面 15 文件被丢弃）；② full 流程绑定面缺失——绑定槽只在 thin flow start 收编时追加（flow.js:355），full 的 brainstorm requirements 无绑定面、不经过 flow start，test-trace 恒空，FR 入库永远无 tests 绑定（R23-full 实证 0 行），动态门 FR 回归源对 full 出身 FR 失效；③ init 模板 renderExample 的 test_strategy: full 未注释，复制即落全量道（评审 P3-5，实验快照已预适用，主仓未清偿）。
成功标准：
- runVerifyTestCheck 接受 faceOverride：在场时跳过快照内二次推导（含收窄），直接用调用方权威面算动态子集——commit-then-done 场景门禁能实测已提交交付（新测试锁定：提交后仅剩无关脏文件时，faceOverride 使动态子集真跑而非 dynamic-empty）
- quick-audit 透传 faceOverride，flow done ledger 门接线（changedFiles 即权威面）
- full 流程 brainstorm --done 对有 FR 块而无绑定面的 requirements 追加绑定槽（复用 thin 追加逻辑单源）；verify 侧既有 auto-bind 因槽在场而闭环，R23-full 形态（trace 0 行）不再复现
- renderExample 的 test_strategy 行注释化（主仓与实验快照一致）
- 全仓测试绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:b91421f436647e6574c1d0aa0f73c85cff5ac14d8af01ba9ea780b7e144f9c38:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-face-binding-parity 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. runVerifyTestCheck 接受 faceOverride：在场时跳过快照内二次推导（含收窄），直接用调用方权威面算动态子集——commit-then-done 场景门禁能实测已提交交付（新测试锁定：提交后仅剩无关脏文件时，faceOverride 使动态子集真跑而非 dynamic-empty）
2. quick-audit 透传 faceOverride，flow done ledger 门接线（changedFiles 即权威面）
3. full 流程 brainstorm --done 对有 FR 块而无绑定面的 requirements 追加绑定槽（复用 thin 追加逻辑单源）
4. verify 侧既有 auto-bind 因槽在场而闭环，R23-full 形态（trace 0 行）不再复现
5. renderExample 的 test_strategy 行注释化（主仓与实验快照一致）
6. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:fb7bf7d04889d474f27f5e09602f328d4f6064ab65475090b204744c3e1d4547:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-face-binding-parity 留痕重锚 -->
1. runVerifyTestCheck 接受 faceOverride：在场时跳过快照内二次推导（含收窄），直接用调用方权威面算动态子集——commit-then-done 场景门禁能实测已提交交付（新测试锁定：提交后仅剩无关脏文件时，faceOverride 使动态子集真跑而非 dynamic-empty）
2. quick-audit 透传 faceOverride，flow done ledger 门接线（changedFiles 即权威面）
3. full 流程 brainstorm --done 对有 FR 块而无绑定面的 requirements 追加绑定槽（复用 thin 追加逻辑单源）
4. verify 侧既有 auto-bind 因槽在场而闭环，R23-full 形态（trace 0 行）不再复现
5. renderExample 的 test_strategy 行注释化（主仓与实验快照一致）
6. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
