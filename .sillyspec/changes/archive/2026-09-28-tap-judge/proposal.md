---
author: flow-machine-draft
created_at: 2026-09-28T09:15:41.328Z
---
# 提案书（Proposal）— 2026-09-28-tap-judge

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:413f946dc96ab7cf9e12739ddad4a857f042115f3cd2fc9086ec572973f8606a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-tap-judge 留痕重锚 -->
任务原话转写：倒推收尾：已做改动——P2 一期与 P1 根因修复在同批落地。背景：门失败行正则对自由文本误计（task-done fixture 文案两次实证）；e2e ⑮ 门内必挂单独跑必过悬案多轮。
成功标准：
- deps(auto-js) 批改 node:test 双报告器（spec 到 stderr 人读、tap 到 stdout 机读），judgeTapOutput 按 not ok 用例粒度判账，非 TAP 输出自动回退 legacy 正则零断裂
- 豁免匹配复用 buildExemptPats 与 matchExemptLine 共用单点（锚定式、裸子串、泛用停用语义与既有完全一致）
- P1 根因修复：runOneModule execSync 剥离 NODE_TEST_CONTEXT（父级 node:test 进程 env 泄漏致内层 node --test 误入 child 模式 stdout 全空——脏 env 复现 0 输出、清洗后 flow-protocol 22/22 含 ⑮ 全过，实证闭环）
- local.yaml 豁免 D 组三条按删除条件移除（⑮ 与两条 fixture——根因已修）
- 单测六用例含真实双报告器集成（发现并锁定嵌套 env 坑）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:0862c95908d9f9dad8447474d6f1ba58d82267bed22015b86436c2214399a1d1:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-tap-judge 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. deps(auto-js) 批改 node:test 双报告器（spec 到 stderr 人读、tap 到 stdout 机读），judgeTapOutput 按 not ok 用例粒度判账，非 TAP 输出自动回退 legacy 正则零断裂
2. 豁免匹配复用 buildExemptPats 与 matchExemptLine 共用单点（锚定式、裸子串、泛用停用语义与既有完全一致）
3. P1 根因修复：runOneModule execSync 剥离 NODE_TEST_CONTEXT（父级 node:test 进程 env 泄漏致内层 node --test 误入 child 模式 stdout 全空——脏 env 复现 0 输出、清洗后 flow-protocol 22/22 含 ⑮ 全过，实证闭环）
4. local.yaml 豁免 D 组三条按删除条件移除（⑮ 与两条 fixture——根因已修）
5. 单测六用例含真实双报告器集成（发现并锁定嵌套 env 坑）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:3fd92be75d53fa8bd2b88cad31f1f2b8e4e03e43f612ff36fb62631005de8cf7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-tap-judge 留痕重锚 -->
1. deps(auto-js) 批改 node:test 双报告器（spec 到 stderr 人读、tap 到 stdout 机读），judgeTapOutput 按 not ok 用例粒度判账，非 TAP 输出自动回退 legacy 正则零断裂
2. 豁免匹配复用 buildExemptPats 与 matchExemptLine 共用单点（锚定式、裸子串、泛用停用语义与既有完全一致）
3. P1 根因修复：runOneModule execSync 剥离 NODE_TEST_CONTEXT（父级 node:test 进程 env 泄漏致内层 node --test 误入 child 模式 stdout 全空——脏 env 复现 0 输出、清洗后 flow-protocol 22/22 含 ⑮ 全过，实证闭环）
4. local.yaml 豁免 D 组三条按删除条件移除（⑮ 与两条 fixture——根因已修）
5. 单测六用例含真实双报告器集成（发现并锁定嵌套 env 坑）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
