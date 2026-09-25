---
author: flow-machine-draft
created_at: 2026-09-25T06:04:14.255Z
---
# 提案书（Proposal）— 2026-09-25-fr-compound-split

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:63cd7ea64dd303dd65c4a8ac4b055a8f192a73991967fee04ed8d43127061672:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-compound-split 留痕重锚 -->
任务原话转写：动机：接管中断会话的幸存想法——复合标准拆分（条目内「A/B」「A；B」的合取标准在 FR 区 agent 书写架构下仍需在参考摘录层拆开：摘录里一行 A/B 会被 agent 直抄成一条粒度失真的 FR；路径感知防 src/flow.js 之类被误劈）。
成功标准：
- extractSuccessCriteria 增复合拆分：条目按分号恒拆、按斜杠仅在非路径形态拆（无扩展名点且不超一处斜杠）
- 参考摘录呈现拆后条目（FR-01 A、FR-02 B、FR-03 C 形态）
- 新增测试覆盖拆/不拆路径/分号三态；flow 系全绿

<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:b29710a70d75993766b87de58d4311ed64b230f4fc4aa46b514d7b1bd647dc5a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-compound-split 留痕重锚 -->
按成功标准机械推导，共 3 条验收面：
1. extractSuccessCriteria 增复合拆分：条目按分号恒拆、按斜杠仅在非路径形态拆（无扩展名点且不超一处斜杠）
2. 参考摘录呈现拆后条目（FR-01 A、FR-02 B、FR-03 C 形态）
3. 新增测试覆盖拆/不拆路径/分号三态；flow 系全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:51d508d91f27642bcd39e5950c6e37b2988f540e012f046c99009dcf2053eb21:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-compound-split 留痕重锚 -->
1. extractSuccessCriteria 增复合拆分：条目按分号恒拆、按斜杠仅在非路径形态拆（无扩展名点且不超一处斜杠）
2. 参考摘录呈现拆后条目（FR-01 A、FR-02 B、FR-03 C 形态）
3. 新增测试覆盖拆/不拆路径/分号三态；flow 系全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
