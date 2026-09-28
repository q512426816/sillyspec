---
author: flow-machine-draft
created_at: 2026-09-28T13:39:36.123Z
---
# 提案书（Proposal）— 2026-09-28-knowledge-score-denoise

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:c6939796f824d480d373c8e0b6544b3ceb9cdceb200cbfb10189829b8521d935:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-score-denoise 留痕重锚 -->
任务原话转写：decisionHits 评分剥除数字与标点：变更名场景的日期/id 数字 bigram 噪音主导排序。

动机：「确定吗」追问下实弹复测 prompt.js {DECISION_HITS} 第三注入点（taskContext=ASCII 变更名）实测：变更名 2026-09-28-unmapped-drill 与 D-009@v1 共享 -0/09 两个数字 bigram，得分反超死路条目，D-001 枚举开放世界未置顶——数字噪音在「变更名纯 ASCII、无内容词」场景主导排序（此前判定「微量不受扰」只对标题词查询成立）。

成功标准：
- 评分只计内容字符（剥除数字与标点后取 bigram），变更名纯数字/ASCII 场景下各条目内容得分为零 → 零分平局 → 死路先验接管置顶
- 主场景（枚举/开放世界标题词）与近义场景（穷举/关键词表）排序不回归
- 新增用例：ASCII 变更名（unmapped-drill 形态）下 D-001 死路条目置顶；npm test 全量与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:a60c5d5e4eb707f04ed416d861560ef4eccb46820d5bb94dbf4d9024af3c55c7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-score-denoise 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. 评分只计内容字符（剥除数字与标点后取 bigram），变更名纯数字/ASCII 场景下各条目内容得分为零 → 零分平局 → 死路先验接管置顶
2. 主场景（枚举/开放世界标题词）与近义场景（穷举/关键词表）排序不回归
3. 新增用例：ASCII 变更名（unmapped-drill 形态）下 D-001 死路条目置顶
4. npm test 全量与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:569d938e8e9ae6761ecdee99922abca2dae2bdb49405ba9316606252706314f8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-score-denoise 留痕重锚 -->
1. 评分只计内容字符（剥除数字与标点后取 bigram），变更名纯数字/ASCII 场景下各条目内容得分为零 → 零分平局 → 死路先验接管置顶
2. 主场景（枚举/开放世界标题词）与近义场景（穷举/关键词表）排序不回归
3. 新增用例：ASCII 变更名（unmapped-drill 形态）下 D-001 死路条目置顶
4. npm test 全量与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
