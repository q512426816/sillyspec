---
author: flow-machine-draft
created_at: 2026-09-29T08:03:28.045Z
---
# 提案书（Proposal）— 2026-09-29-batch-tick-gate

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:826d6401f832c5c316b355f656f797a7740c08a3b162493b6ff606c8ff27a777:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-batch-tick-gate 留痕重锚 -->
任务原话转写：动机：勾选节奏问题三次复发（0→6/0→3，最新 2026-09-29-skill-prompt-retire 时间线 15:37:18 checked 0→3 一拍）——协议文本对 agent 执行习惯无效，需协议形状改造+收口硬门。openspec 骨架移植（A）：任务面定稿提前到 ①spec 阶段（填 FR/design 时一并覆写 tasks.md 为真实实现步骤全 - [ ]，代码开动前队列已存在）、执行段指令改任务循环（对每个 pending 任务：展示→做→勾一格→下一个，含 Working on task N/M 输出拍）。收口硬门（B，D-007 兼容零中继 CLI）：watcher 事件流存在单拍勾选（checked N→M 单跳>=2）且非镜像勾选任务非空 → 拒收点名；镜像-only 勾选维持 advisory（镜像豁免哲学不变）；观测缺席降级现行判据；出口 --allow-batch-tick 显式留痕（同意门先例）。

成功标准：
- flow start 简报（两路）与 tasks.md 头部含 spec 阶段任务面定稿要求与 openspec 式执行循环指令
- sentinel 新增 batchTickVerdict 纯函数：单跳>=2 检出/镜像-only 判定/事件缺席降级三态，单测覆盖
- flow done ledger 接线：非镜像单拍勾选 → 拒收 exit 非零并点名跳幅与非镜像任务；--allow-batch-tick 放行留痕（flow-state 记 allow_batch_tick）
- 镜像-only 单拍勾选不拒（advisory 文案）
- 既有哨兵行为零回归（fake-check 系用例全绿），flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:c2df93a11e9ca6ee6a663493c18f0859082ad8a26d29740393c2d3d0d99c65fb:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-batch-tick-gate 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. flow start 简报（两路）与 tasks.md 头部含 spec 阶段任务面定稿要求与 openspec 式执行循环指令
2. sentinel 新增 batchTickVerdict 纯函数：单跳>=2 检出/镜像-only 判定/事件缺席降级三态，单测覆盖
3. flow done ledger 接线：非镜像单拍勾选 → 拒收 exit 非零并点名跳幅与非镜像任务
4. --allow-batch-tick 放行留痕（flow-state 记 allow_batch_tick）
5. 镜像-only 单拍勾选不拒（advisory 文案）
6. 既有哨兵行为零回归（fake-check 系用例全绿），flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:fb7c5757a359592bdc7818dd6a46a2bacfacd2a59d48c8a078a9a42c054ecbd0:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-batch-tick-gate 留痕重锚 -->
1. flow start 简报（两路）与 tasks.md 头部含 spec 阶段任务面定稿要求与 openspec 式执行循环指令
2. sentinel 新增 batchTickVerdict 纯函数：单跳>=2 检出/镜像-only 判定/事件缺席降级三态，单测覆盖
3. flow done ledger 接线：非镜像单拍勾选 → 拒收 exit 非零并点名跳幅与非镜像任务
4. --allow-batch-tick 放行留痕（flow-state 记 allow_batch_tick）
5. 镜像-only 单拍勾选不拒（advisory 文案）
6. 既有哨兵行为零回归（fake-check 系用例全绿），flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
