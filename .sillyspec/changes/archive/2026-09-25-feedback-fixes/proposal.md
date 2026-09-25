---
author: flow-machine-draft
created_at: 2026-09-25T09:56:45.430Z
---
# 提案书（Proposal）— 2026-09-25-feedback-fixes

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:221b85a3425aab333b547c228925d451b7fa416fcd422fc53a0dbd1735bcb2e3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-feedback-fixes 留痕重锚 -->
任务原话转写：动机：平台狗粮五负面逐条判定——①勾选vs指纹自相矛盾（最重）②哨兵文案缺提示（记档）③槽位报错无恢复指引④CRLF破坏槽位识别⑤冻结面归属陈旧声明抢文件（记档最复杂）。修①④③。
成功标准：
- tasks-rows 去指纹化（agent 直接勾选，不走 amend 不触发 editRatio——与 FR 区同模式）
- CRLF 全局归一化：flow-draft.js readText helper + flow-review.js classifyReviewNeed 两处读取归一
- 槽位报错加恢复指引（从 step-guides 指纹缓存找骨架 / 删文件重入 flow start）
- ②⑤记档不修（②已有勾选纪律提示；⑤需设计冻结面重触发机制，独立变更）
- 67+180 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:2fa0350f5232fb207ccd6f1a7f569472f08d7f68dd6ce65c1f411f0877bd653f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-feedback-fixes 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. tasks-rows 去指纹化（agent 直接勾选，不走 amend 不触发 editRatio——与 FR 区同模式）
2. CRLF 全局归一化：flow-draft.js readText helper + flow-review.js classifyReviewNeed 两处读取归一
3. 槽位报错加恢复指引（从 step-guides 指纹缓存找骨架
4. 删文件重入 flow start）
5. ②⑤记档不修（②已有勾选纪律提示
6. ⑤需设计冻结面重触发机制，独立变更）
7. 67+180 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:7244781f69516701387dedb59cacd57cd895cee38a57071a646fd88f94695ad3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-feedback-fixes 留痕重锚 -->
1. tasks-rows 去指纹化（agent 直接勾选，不走 amend 不触发 editRatio——与 FR 区同模式）
2. CRLF 全局归一化：flow-draft.js readText helper + flow-review.js classifyReviewNeed 两处读取归一
3. 槽位报错加恢复指引（从 step-guides 指纹缓存找骨架
4. 删文件重入 flow start）
5. ②⑤记档不修（②已有勾选纪律提示
6. ⑤需设计冻结面重触发机制，独立变更）
7. 67+180 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
