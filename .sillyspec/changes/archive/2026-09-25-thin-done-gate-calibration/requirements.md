---
author: flow-machine-draft
created_at: 2026-09-25T09:28:51.309Z
---
# 需求规格（Requirements）— 2026-09-25-thin-done-gate-calibration

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: 勾选态归一：段内容哈希计算前把 task-NN 勾选行的勾选态归一回未勾选，tasks.md 正常勾选后 flow done 工件校验不再指纹失配拒收，机器段真实改写仍拒收
FR-02: 哨兵证据口径：收口哨兵取整条提交消息而非仅标题行，task-NN 出现在提交正文也算完成证据，拒收文案写明标题或正文
FR-03: 补两例回归：勾选后指纹仍匹配、提交正文含 task-NN 过哨兵，相关套件全绿
-->

### FR-01: 机器段哈希勾选态归一
Given flow start 生成的 tasks.md 含 `- [ ] task-NN` 机器段且 tasks-rows 指纹在 draft-ledger 在案
When agent 按横幅纪律把任务行勾选为 `- [x] task-NN`（不改任务文本、不跑 amend-draft）
Then flow done 工件校验对 tasks-rows 验证通过（勾选态不参与「被改写」判定）；改任务文本或增删行仍判内容失配拒收

### FR-02: 收口哨兵证据取整条提交消息
Given tasks.md 全勾且区间某提交的标题行不含 task-NN、正文含完整 token
When flow done 或 quick 收口哨兵取证
Then 该任务计为有完成证据、不拒收；零证据拒收时文案写明「提交标题或正文带 task-NN」

### FR-03: 回归用例钉住新契约
Given machine-draft 三件套与哨兵接线测试面
When 套件执行
Then 「勾选后指纹仍匹配」「提交正文含 task-NN 过哨兵」两例在场（夹具不再借 amend-draft 绕指纹门），相关套件全绿

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/machine-draft.test.mjs（bodyHash 勾选态归一：[x]/[X] 与 [ ] 同哈希、勾选后 verifyMarkers 零 violation、真实改写仍失配、非 task 勾选行不归一）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-wiring.test.mjs 形态 B2（提交标题无 token、正文含 task-01 → flow done 放行收口）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/machine-draft.test.mjs + test/sentinel-wiring.test.mjs（形态 A/B 夹具去 amend 化：直接勾选 + doesNotMatch 指纹失配钉住 FR-01 的接线面）
