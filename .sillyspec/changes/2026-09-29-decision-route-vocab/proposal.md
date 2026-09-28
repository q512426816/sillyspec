---
author: flow-machine-draft
created_at: 2026-09-28T16:24:44.397Z
---
# 提案书（Proposal）— 2026-09-29-decision-route-vocab

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:74adbc0c74b6231e7242208caf96417d20ceddbb2dc316cea65ae54d07b3272b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-decision-route-vocab 留痕重锚 -->
任务原话转写：蒸馏侧检索词覆盖：路由关键词稀有度派生＋条目标题必填。

动机：检索面词形桥接实测死路一条（shingle 全文扫在 200 条目量级精度不可达，df 阈值分不开同频真值/噪音——已弃并记录）；真正的词形栖息地是条目标题与理由，而路由行关键词靠人工扩（注释自述「可能被人工扩充」）。Mouse B 的成功路径（读 INDEX→读域文件）可工具化：域文件条目文本（标题∪理由）稀有词片（域内出现≤3 次）派生进路由 tag，查询含这些词片即路由命中，CLI search／digest 知识命中／门条目行三面把 agent 指到对的文件。

成功标准：
- syncIndexRoutingLines（decisions 侧）按域从条目标题∪理由行派生稀有词片（出现≤3 次的 CJK bigram／≥4 字符 ASCII 词，封顶 20）增量并入路由行关键词——幂等、保留人工已有词、不碰 fr 段
- 真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched 且指向 decisions/unmapped.md）；「枚举词表」既有命中不回归
- 蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦截（对齐 rejected 缺否决理由先例），存量夹具适配或降级为告警以实测爆炸半径为准
- 既有蒸馏/知识测试回归全绿；test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:849cea7cae3b420f590383eb23c325dee1153fa9b3b82d10bd15f24f0b4c2b79:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-decision-route-vocab 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. syncIndexRoutingLines（decisions 侧）按域从条目标题∪理由行派生稀有词片（出现≤3 次的 CJK bigram／≥4 字符 ASCII 词，封顶 20）增量并入路由行关键词——幂等、保留人工已有词、不碰 fr 段
2. 真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched 且指向 decisions/unmapped.md）
3. 「枚举词表」既有命中不回归
4. 蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦截（对齐 rejected 缺否决理由先例），存量夹具适配或降级为告警以实测爆炸半径为准
5. 既有蒸馏/知识测试回归全绿
6. test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:8f64419eaa5399512a5192df57494acbd0d713f0018227dc8aea76aa9012539c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-decision-route-vocab 留痕重锚 -->
1. syncIndexRoutingLines（decisions 侧）按域从条目标题∪理由行派生稀有词片（出现≤3 次的 CJK bigram／≥4 字符 ASCII 词，封顶 20）增量并入路由行关键词——幂等、保留人工已有词、不碰 fr 段
2. 真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched 且指向 decisions/unmapped.md）
3. 「枚举词表」既有命中不回归
4. 蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦截（对齐 rejected 缺否决理由先例），存量夹具适配或降级为告警以实测爆炸半径为准
5. 既有蒸馏/知识测试回归全绿
6. test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
