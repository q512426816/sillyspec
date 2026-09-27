---
author: flow-machine-draft
created_at: 2026-09-27T09:01:58.456Z
---
# 提案书（Proposal）— 2026-09-27-confirm-on-use

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:2ce98a4b8f3b04a71d4218a78bb5720232ad0e50dbd94d76eeea4c4d9357b671:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-confirm-on-use 留痕重锚 -->
任务原话转写：知识注入已把触达域 active FR 摘要带进干活 agent 上下文，但 candidate 绑定行（confirmed_by=null，机器提升）永远无人翻牌——绑定状态机（candidate→active 需 confirmed_by=agent）有机制无消费者，长期准确性无兜底（R23 三臂全部 candidate 入库实证）。三层治理设计第①层：消费时确认。
成功标准：
- readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - row: 块的 confirmed_by≠agent 行）
- 知识注入面：未确认条目带 ⚪N未确认 标记；追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符则收口前 sillyspec tests confirm --anchor <id> --evidence <真实测试路径>，不符留给 knowledge digest 信号）
- 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解析为真实文件，机械防橡皮图章）→ 该条目全部 candidate 机器行翻 active（confirmed_by=agent, confirmed_at=HEAD）；已是 active 幂等提示；无绑定行/证据不可解析拒绝 exit 1
- 全仓测试绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:12593e7ece7374f633fa91085629f462fb0c8f26aed3b06afa6f06e7da69f2d7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-confirm-on-use 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - row: 块的 confirmed_by≠agent 行）
2. 知识注入面：未确认条目带 ⚪N未确认 标记
3. 追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符则收口前 sillyspec tests confirm --anchor <id> --evidence <真实测试路径>，不符留给 knowledge digest 信号）
4. 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解析为真实文件，机械防橡皮图章）→ 该条目全部 candidate 机器行翻 active（confirmed_by=agent, confirmed_at=HEAD）
5. 已是 active 幂等提示
6. 无绑定行
7. 证据不可解析拒绝 exit 1
8. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:06699b1b2274917414a120d939d588e9b917c3f73a2d20b07a1b7c3365fc98ba:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-confirm-on-use 留痕重锚 -->
1. readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - row: 块的 confirmed_by≠agent 行）
2. 知识注入面：未确认条目带 ⚪N未确认 标记
3. 追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符则收口前 sillyspec tests confirm --anchor <id> --evidence <真实测试路径>，不符留给 knowledge digest 信号）
4. 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解析为真实文件，机械防橡皮图章）→ 该条目全部 candidate 机器行翻 active（confirmed_by=agent, confirmed_at=HEAD）
5. 已是 active 幂等提示
6. 无绑定行
7. 证据不可解析拒绝 exit 1
8. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
