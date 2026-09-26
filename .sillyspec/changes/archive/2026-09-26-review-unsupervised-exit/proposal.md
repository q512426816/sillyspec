---
author: flow-machine-draft
created_at: 2026-09-26T01:24:45.967Z
---
# 提案书（Proposal）— 2026-09-26-review-unsupervised-exit

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:a8607f747be19befcc872a6fe57fc3a642a03417c26050e12ca7b701560637d3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-review-unsupervised-exit 留痕重锚 -->
任务原话转写：动机：R18-full 实证阶段评审层在无嵌套派发能力的环境（子代理不能再派子代理）全降级自审——三份自审 review.json 全 PASS 零信息量，纯表演；而门仍硬拦形式合规（15 次拦截里 5 次是 review 面形式：缺件/假 hash/枚举错），每次拦截在 300K+ 上下文重试。R8 基线（主会话有真派发能力）评审抓过真缺口——层本身有价值，价值条件=独立评审者可用。缺一条诚实出口：无派发能力时豁免生成+豁免门+留痕，不自审表演。
成功标准：
- 豁免凭据：变更目录 review-unsupervised.md（agent 一行声明：环境无嵌套派发能力+时间，含 unsupervised 字样）——Stage Review 门与 Task Review 校验点两处共吃：有效 review.json ‖ 豁免声明在场（warn 放行+遥测 review-unsupervised-escape 可观测豁免率）；两者皆无照旧硬拦
- gates.js enforceAlignExecuteReviewGate（doctor 门）与 enforceReviewJsonGate（--done 硬门）同步吃豁免凭据
- 生成侧指引（brainstorm Grill/plan/execute QA 三处）加豁免分支：无 Agent/Task 类派发工具 → 不产 review.json 不自审，写 review-unsupervised.md 声明即豁免，凭据随归档留痕
- 既有有效 review.json 路径零变化（真独立评审仍强制优待）；测试：声明放行/无凭据仍拦/有效 review.json 照旧三态
- Task Review 层的退役清理（砍生成+砍门）不在本变更——独立收口
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d9a77889324c32f912b24b17ad87f726767d18ef484d81d8b274c656a6cff8f0:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-review-unsupervised-exit 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 豁免凭据：变更目录 review-unsupervised.md（agent 一行声明：环境无嵌套派发能力+时间，含 unsupervised 字样）——Stage Review 门与 Task Review 校验点两处共吃：有效 review.json ‖ 豁免声明在场（warn 放行+遥测 review-unsupervised-escape 可观测豁免率）
2. 两者皆无照旧硬拦
3. gates.js enforceAlignExecuteReviewGate（doctor 门）与 enforceReviewJsonGate（--done 硬门）同步吃豁免凭据
4. 生成侧指引（brainstorm Grill/plan/execute QA 三处）加豁免分支：无 Agent/Task 类派发工具 → 不产 review.json 不自审，写 review-unsupervised.md 声明即豁免，凭据随归档留痕
5. 既有有效 review.json 路径零变化（真独立评审仍强制优待）
6. 测试：声明放行/无凭据仍拦/有效 review.json 照旧三态
7. Task Review 层的退役清理（砍生成+砍门）不在本变更——独立收口
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:d1a48d1e73524ad1d6773453a637784198208bf4dae7ec36501b9cb7442de598:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-review-unsupervised-exit 留痕重锚 -->
1. 豁免凭据：变更目录 review-unsupervised.md（agent 一行声明：环境无嵌套派发能力+时间，含 unsupervised 字样）——Stage Review 门与 Task Review 校验点两处共吃：有效 review.json ‖ 豁免声明在场（warn 放行+遥测 review-unsupervised-escape 可观测豁免率）
2. 两者皆无照旧硬拦
3. gates.js enforceAlignExecuteReviewGate（doctor 门）与 enforceReviewJsonGate（--done 硬门）同步吃豁免凭据
4. 生成侧指引（brainstorm Grill/plan/execute QA 三处）加豁免分支：无 Agent/Task 类派发工具 → 不产 review.json 不自审，写 review-unsupervised.md 声明即豁免，凭据随归档留痕
5. 既有有效 review.json 路径零变化（真独立评审仍强制优待）
6. 测试：声明放行/无凭据仍拦/有效 review.json 照旧三态
7. Task Review 层的退役清理（砍生成+砍门）不在本变更——独立收口
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
