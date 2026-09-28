---
author: flow-machine-draft
created_at: 2026-09-28T14:14:25.940Z
---
# 提案书（Proposal）— 2026-09-28-sentinel-mirror-waiver

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:0a1de539e831c6a68722df490cc40d0c72f0465958556bbb564b93be10ebfc64:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-mirror-waiver 留痕重锚 -->
任务原话转写：哨兵假阳性根治：任务来源感知的证据判据（镜像勾选免 per-task token）＋批量勾选噪音收敛。

动机：thin 道机器稿把成功标准镜像为任务面，agent 实现粒度天然不等于镜像条数——收口哨兵按「每勾选任务须有提交 token/review.json」验一个 agent 从未认领的任务面，假勾选拒收频发（本会话三连实证，workaround 全是改写任务+amend token 的仪式）；watcher 人判警告同样对镜像勾选误报。且镜像任务不是 agent 工作单元，批量勾选是常态而非纪律失守——节奏 advisory 对镜像面是纯噪音。

成功标准：
- detectFakeCheckCompletion 增任务来源维度：与机器稿基线（route-hindsight-baseline 快照）逐字相同的勾选行＝镜像勾选，免 per-task 提交证据（成功标准面交付由实测门/patch/review 背书），missing 只含覆写任务
- 无基线快照时 fail-safe 维持现行判据（全部要求证据）
- flow done 拒收文案与 watcher 人判警告不再对镜像勾选触发；覆写任务无证据仍拒收（假勾选守卫不弱化）
- 勾选节奏 advisory 仅在存在覆写任务面时提示（镜像面批量勾选不提示）
- 单测覆盖镜像豁免/覆写守卫/无基线 fail-safe 三态；真实演练：镜像全勾单提交无 token 收口通过、覆写任务无证据仍拒收；npm test 与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:0cc160108ad4947644b6b5061b004faf42966f6206a6a9c10ec08689850659d8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-mirror-waiver 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. detectFakeCheckCompletion 增任务来源维度：与机器稿基线（route-hindsight-baseline 快照）逐字相同的勾选行＝镜像勾选，免 per-task 提交证据（成功标准面交付由实测门/patch/review 背书），missing 只含覆写任务
2. 无基线快照时 fail-safe 维持现行判据（全部要求证据）
3. flow done 拒收文案与 watcher 人判警告不再对镜像勾选触发
4. 覆写任务无证据仍拒收（假勾选守卫不弱化）
5. 勾选节奏 advisory 仅在存在覆写任务面时提示（镜像面批量勾选不提示）
6. 单测覆盖镜像豁免/覆写守卫/无基线 fail-safe 三态
7. 真实演练：镜像全勾单提交无 token 收口通过、覆写任务无证据仍拒收
8. npm test 与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:5645901a7e8b6650795c3cb53dc542e52661a24468c7ce8e4e22c9dc89439cd8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-mirror-waiver 留痕重锚 -->
1. detectFakeCheckCompletion 增任务来源维度：与机器稿基线（route-hindsight-baseline 快照）逐字相同的勾选行＝镜像勾选，免 per-task 提交证据（成功标准面交付由实测门/patch/review 背书），missing 只含覆写任务
2. 无基线快照时 fail-safe 维持现行判据（全部要求证据）
3. flow done 拒收文案与 watcher 人判警告不再对镜像勾选触发
4. 覆写任务无证据仍拒收（假勾选守卫不弱化）
5. 勾选节奏 advisory 仅在存在覆写任务面时提示（镜像面批量勾选不提示）
6. 单测覆盖镜像豁免/覆写守卫/无基线 fail-safe 三态
7. 真实演练：镜像全勾单提交无 token 收口通过、覆写任务无证据仍拒收
8. npm test 与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
