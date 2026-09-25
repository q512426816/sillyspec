---
author: flow-machine-draft
created_at: 2026-09-25T05:08:34.229Z
---
# 提案书（Proposal）— 2026-09-25-flow-checkpoints

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:faf20636e33d3bdee9436f81d513102e0b8ad3a1b9c35a6dff9e5dc55fc175c6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-checkpoints 留痕重锚 -->
任务原话转写：动机：轻量变更 2 调用协议优化了 token 效率但牺牲了可控性——用户反馈：阶段不可见（agent 进黑盒）、没有卡点（spec 写完直接写代码，归档一口气过）、agent 不主动汇报。需要三断点纪律+状态查询命令。
成功标准：
- flow start 简报增加三断点纪律段：①spec 断点（填完 FR/design 槽后把摘要给用户看，等确认再写代码）②执行断点（写完代码跑完测试后把结果给用户看）③归档断点（flow done 后把收口结果给用户看）——用户明确说全跑完则跳过
- 新增 flow status 子命令：读 flow-state.yaml 显示当前变更名/阶段（spec/execute/archive）/已填槽位/子步进度
- flow done 收口输出加「即将归档」预告行（8 子步跑完 → 📦 归档前预告 → 归档执行）
- 测试：status 命令三态（无变更/进行中/已归档）、简报三断点文案断言
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:3a3bbd3f72f094d83c9ebdda494ddf884f43bf1c209465e78503a5ba2ee78617:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-checkpoints 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. flow start 简报增加三断点纪律段：①spec 断点（填完 FR/design 槽后把摘要给用户看，等确认再写代码）②执行断点（写完代码跑完测试后把结果给用户看）③归档断点（flow done 后把收口结果给用户看）——用户明确说全跑完则跳过
2. 新增 flow status 子命令：读 flow-state.yaml 显示当前变更名/阶段（spec/execute/archive）/已填槽位/子步进度
3. flow done 收口输出加「即将归档」预告行（8 子步跑完 → 📦 归档前预告 → 归档执行）
4. 测试：status 命令三态（无变更/进行中/已归档）、简报三断点文案断言
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:7b838dd9e3729d73f19a74cfa2caa83ebaa29b1eea1910ef22f6c366a5447926:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-checkpoints 留痕重锚 -->
1. flow start 简报增加三断点纪律段：①spec 断点（填完 FR/design 槽后把摘要给用户看，等确认再写代码）②执行断点（写完代码跑完测试后把结果给用户看）③归档断点（flow done 后把收口结果给用户看）——用户明确说全跑完则跳过
2. 新增 flow status 子命令：读 flow-state.yaml 显示当前变更名/阶段（spec/execute/archive）/已填槽位/子步进度
3. flow done 收口输出加「即将归档」预告行（8 子步跑完 → 📦 归档前预告 → 归档执行）
4. 测试：status 命令三态（无变更/进行中/已归档）、简报三断点文案断言
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
