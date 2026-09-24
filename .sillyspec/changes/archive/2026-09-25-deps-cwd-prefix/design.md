---
author: flow-machine-draft
created_at: 2026-09-24T23:34:04.422Z
---
# 设计记录（Design Record）— 2026-09-25-deps-cwd-prefix

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
deps(auto-py) 运行器推断改为链前缀整体提取：正则先试 ^((?:cds+[^&|;]+&&s*)*[^&|;]*?pytest) 保留 cd <dir> && 前缀（惰性到首个 pytest 段），不匹配再退旧段级正则（裸 pytest 命令行为不变）；前缀在场时批次文件路径按该 dir 重定基（剥前导目录——模块命令的文件参即 dir 相对口径）。根因：剥前缀后从 worktree 根跑 uv，根上无 pyproject.toml，uv 解析到无 dev extras 的错环境致 aiobotocore 假红（R15/R16 两轮 known_failures 豁免顶着）。buildDepsBatches 导出供测。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/verify-postcheck.js buildDepsBatches（推断正则+rebase+export）；test/deps-cwd-prefix.test.mjs 新增三态单测；verify-deps-auto-default 旧「未导出」注释清理。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（纯命令串构造）。2. 并发写：无状态。3. 切换：批次构造每轮重算幂等。4. 作用域：rebase 只对带 cd 前缀的 py 批次文件；不以该 dir 开头的 py 文件保持原样（混合布局罕见，注释声明口径）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=cd 目录推断按 S+ 取词，引号路径或带空格目录名不支持——模块命令惯例为无引号简单目录（local.yaml 模板与 R15/R16 实配均如此），不支持面留注释；死路=把 deps 批次 cwd 切到模块目录再拼根相对路径——等价但要动批次执行器两处，重定基一处收口更小。
