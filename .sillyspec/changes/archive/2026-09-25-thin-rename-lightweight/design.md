---
author: flow-machine-draft
created_at: 2026-09-24T23:02:32.292Z
---
# 设计记录（Design Record）— 2026-09-25-thin-rename-lightweight

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-rename-lightweight 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
术语统一全量替换：薄流程→轻量变更、薄跑道→轻量跑道、薄协议→轻量协议、薄档→轻量档、薄道→轻量变更、薄工件面→轻量工件面、薄→厚→轻量→完整。两遍替换（第一遍主词表 9 文件 57 处 + 第二遍残留 11 处），覆盖 console 输出/机器稿模板/评审任务书/简报/横幅/schema 描述/AGENTS 模板/SKILL.md 与测试断言。英文 thin 与档位值/flag 零变化；厚/升厚/完整流程用语保持；docs/analysis 历史对账不改（事实记录）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-rename-lightweight 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src 九文件 + 测试五文件的纯文本替换，无逻辑改动；diff 全为字符串字面量与注释。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-rename-lightweight 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯文案替换，无行为面；50 例 + lint + core 全绿即证零行为漂移。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-rename-lightweight 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与作答（三轮评审修正版） -->
风险=多会话同文件活跃期的提交边界污染（三轮评审实证）：b008ebcb 夹带并行会话 stage.js 墙修正与用户同窗口的 docs/analysis R16 口径修正（7000afbf）；28235e16 再夹带 index.js windowsHide 行为改动与 brainstorm.js 模板外置重构（-101/+7）——共五桩（c0cb9ab6 的 docs/analysis R16 交叉审计段 +21 行，冻结窗口内并行落笔）——文件级 pathspec 防不住 hunk 级夹带，规则 18 需补此教训。夹带内容均自洽（全套测试绿）且归属并行变更，不回滚、如实披露；本变更可判面=术语替换正确性与英文零变化。另：冻结件在首评时点早于补扫提交（F3），已重置 patch 子步标记按最终交付重冻。
系统性边界：多会话活跃仓的 baseline..HEAD 是移动靶，冻结件必然吸收窗口内并行提交——归属切分只认已声明文件面，未声明的并行提交无法剔除；正确解法=披露完整+冻结定点不追（工具债：提交带变更名 trailer 可根治）。死路=回滚夹带 hunk——会砸掉并行会话的在途工作；多会话期正确解法是披露+评审划界。
