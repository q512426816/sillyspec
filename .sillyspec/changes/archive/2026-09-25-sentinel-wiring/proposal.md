---
author: flow-machine-draft
created_at: 2026-09-24T23:43:30.367Z
---
# 提案书（Proposal）— 2026-09-25-sentinel-wiring

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:2e85fa06032064e598dbfd3fa96ea03351e5f85b1ea039ff88c7905e011b2c19:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
任务原话转写：动机：sentinel-assertions.js 交付两日零调用方（注释自证「接线留下批」）——L0 假勾选硬门只在单测里活着，真实收口从不执行；R16 评审抓的真缺陷（64KiB 码点 bug）修完即散，无沉淀通道。
成功标准：
- run/complete.js 的 --done 链接入 detectFakeCheckCompletion：tasks.md 全勾但零完成证据（区间提交 subject 无 task-NN token 且无对应 review.json）→ 拒收 exit 1 点名缺失任务；非全勾/零勾选行放行不变
- 轻量变更 flow done 的 artifacts 子步同判接入（changeDir 内 tasks.md 全勾零证据同拒）——两道收口同一哨兵
- 提交区间口径：quick 用 quick 基线区间提交、flow 用 baseline..HEAD（与既有归属收窄单源一致）
- 新增集成测试：全勾零证据拒/全勾有提交证据放/非全勾放 三态（run 侧或 flow 侧至少一道 e2e）
- flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:4988f5db8c104e47794bb650b4e7a22e9f3db704b31887bd862c8e598c0dffb1:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. run/complete.js 的 --done 链接入 detectFakeCheckCompletion：tasks.md 全勾但零完成证据（区间提交 subject 无 task-NN token 且无对应 review.json）→ 拒收 exit 1 点名缺失任务；非全勾/零勾选行放行不变
2. 轻量变更 flow done 的 artifacts 子步同判接入（changeDir 内 tasks.md 全勾零证据同拒）——两道收口同一哨兵
3. 提交区间口径：quick 用 quick 基线区间提交、flow 用 baseline..HEAD（与既有归属收窄单源一致）
4. 新增集成测试：全勾零证据拒/全勾有提交证据放/非全勾放 三态（run 侧或 flow 侧至少一道 e2e）
5. flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:5b9d537948426bb2522666f76e166321682b6079d0dee6228a07fde0804aba4a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
1. run/complete.js 的 --done 链接入 detectFakeCheckCompletion：tasks.md 全勾但零完成证据（区间提交 subject 无 task-NN token 且无对应 review.json）→ 拒收 exit 1 点名缺失任务；非全勾/零勾选行放行不变
2. 轻量变更 flow done 的 artifacts 子步同判接入（changeDir 内 tasks.md 全勾零证据同拒）——两道收口同一哨兵
3. 提交区间口径：quick 用 quick 基线区间提交、flow 用 baseline..HEAD（与既有归属收窄单源一致）
4. 新增集成测试：全勾零证据拒/全勾有提交证据放/非全勾放 三态（run 侧或 flow 侧至少一道 e2e）
5. flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
