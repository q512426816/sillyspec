---
author: flow-machine-draft
created_at: 2026-09-24T22:22:30.207Z
---
# 设计记录（Design Record）— 2026-09-25-thin-release-pack

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
立即包三件：①package.json 3.29.6→3.30.0——AGENTS.md 受管段升级靠版本差触发，停更版本则九个变更的模板/指令面改进对已装仓全部传播失效；②flow start 简报（fresh+adopt 双路）钉交付纪律一行：收口前交付代码显式 pathspec 提交，冻结件范围=baseline..HEAD 提交面（R16 评审 P2 实证根因——agent 提交晚于 done 致冻结件漏全部代码）；③verify-result 回执：实测面断点续跑后从 verify-runs 最新 test-result.json 回读（mtime 排序），HEAD 字段改名「基线..收口时 HEAD」且等于基线时注明代码未提交。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
package.json 版本；src/flow.js 简报两行+statSync 导入+回填块；src/flow-parity.js 回执 headNote；测试 ①⑮ 各加一断言。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：版本号静态字符串、简报纯文案、回填只读最新实测记录（mtime 排序确定性受文件系统时间戳精度限制——同秒多记录场景取字典序后者，可接受）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答 -->
风险=版本 bump 后已装仓重跑 init 触发受管段升级——手改过 AGENTS.md 的仓走「未自动更新」分支提示手动迁移，属预期非破坏。死路=只改模板不升版本号——升级链靠版本差触发，同版本不更新，传播零效果（本片动机）。

