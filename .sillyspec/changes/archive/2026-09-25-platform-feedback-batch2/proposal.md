---
author: flow-machine-draft
created_at: 2026-09-25T15:44:59.553Z
---
# 提案书（Proposal）— 2026-09-25-platform-feedback-batch2

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:ab8e799c53ce764f42181b5d94bd40f4e555c3068cccacae8108bf2b4a72af0c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-platform-feedback-batch2 留痕重锚 -->
任务原话转写：动机：平台狗粮第二轮反馈——B 他侧声明时效判据（9-21 未归档旧变更 9-25 还在抢文件）；C test:skipped 标因（跳过不说为什么）；D 评审触发词收敛（幂等去重是实现手段不是交付语义）；E flow done 自证 design 声明面在冻结面里。
成功标准：
- B：collectForeignDeclaredFiles 增加时效判据——变更超过 7 天无活动（progress DB lastActive 或变更目录 mtime）的声明视为陈旧忽略
- C：test 结果 skipped 时带 reason 字段（环境缺件/无测试面/模块未命中/纯 doc）——实测面对账行透传
- D：PROMISE_RE 收敛——移除幂等（实现手段，由 diff 原语面覆盖），保留 at-least-once/exactly-once/不丢失/不重复/不丢不重/不重不漏/串台（交付语义）
- E：flow done patch 子步后自证——design.md 文件变更清单中声明的文件是否都在冻结面，不在则警告（design 声明了改但没交付=承诺未兑现面）
- 测试：D 收敛正负例/B 时效（新变更声明生效+旧变更声明忽略）/C reason 字段/E 声明面自证
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:443abadf4655d714432288c9ca2565cefcfe3695ded8ea211942405e87cb6157:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-platform-feedback-batch2 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. B：collectForeignDeclaredFiles 增加时效判据——变更超过 7 天无活动（progress DB lastActive 或变更目录 mtime）的声明视为陈旧忽略
2. C：test 结果 skipped 时带 reason 字段（环境缺件/无测试面/模块未命中/纯 doc）——实测面对账行透传
3. D：PROMISE_RE 收敛——移除幂等（实现手段，由 diff 原语面覆盖），保留 at-least-once/exactly-once/不丢失/不重复/不丢不重/不重不漏/串台（交付语义）
4. E：flow done patch 子步后自证——design.md 文件变更清单中声明的文件是否都在冻结面，不在则警告（design 声明了改但没交付=承诺未兑现面）
5. 测试：D 收敛正负例/B 时效（新变更声明生效+旧变更声明忽略）/C reason 字段/E 声明面自证
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:1d806fbd5d456916a2195e17bb063e4fe518afceaca4882c7fb8e9ffca8b6e05:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-platform-feedback-batch2 留痕重锚 -->
1. B：collectForeignDeclaredFiles 增加时效判据——变更超过 7 天无活动（progress DB lastActive 或变更目录 mtime）的声明视为陈旧忽略
2. C：test 结果 skipped 时带 reason 字段（环境缺件/无测试面/模块未命中/纯 doc）——实测面对账行透传
3. D：PROMISE_RE 收敛——移除幂等（实现手段，由 diff 原语面覆盖），保留 at-least-once/exactly-once/不丢失/不重复/不丢不重/不重不漏/串台（交付语义）
4. E：flow done patch 子步后自证——design.md 文件变更清单中声明的文件是否都在冻结面，不在则警告（design 声明了改但没交付=承诺未兑现面）
5. 测试：D 收敛正负例/B 时效（新变更声明生效+旧变更声明忽略）/C reason 字段/E 声明面自证
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
