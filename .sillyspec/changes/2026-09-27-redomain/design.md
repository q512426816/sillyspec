---
author: flow-machine-draft
created_at: 2026-09-27T11:37:00.043Z
---
# 设计记录（Design Record）— 2026-09-27-redomain

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-redomain 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
新模块 src/redomain.js：planRedomain（干跑列条目不落盘）+ redomainFrEntries（段切割手术）。段解析单源复用 fr-index 的 FR_SECTION_RE（新增 export；splitKnowledgeSections 默认正则是 decisions 形态——首版漏传参是本变更换来的教训）；目标域缺席按 loadDomainSections 同款头新建；INDEX 路由行经 syncIndexRoutingLines 幂等补；全域迁后源文件 0 条目则删（空壳防线）；目标域同 ID 冲突拒。身份铁律：迁域不换号——绑定/supersede 链/最近确认全靠 ID 寻址（upsertFrBindings 按 ## <id> 全目录扫描，与所在文件无关）。CLI tests --redomain --from --to [--anchor…] [--write]，前置用法守卫放宽放行。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-redomain 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新 CLI 形态 sillyspec tests --redomain --from <源域> --to <目标域> [--anchor <FR-id>] [--write]（干跑缺省）；fr-index 新增 export FR_SECTION_RE；redomain.js 导出 planRedomain/redomainFrEntries（平台伪域卡「一键迁移」按钮的 CLI 端）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-redomain 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
乱序：迁移是整段权威重写，幂等重跑（迁过的 ID 已在目标域=同 ID 冲突防线拦截而非重复迁移——防线即幂等）。并发写：writeAtomicSync 原子性；与 upsertFrBindings 并发时后者按 ID 全目录扫描定位，迁移中窗口内输者重跑安全。切换/生命周期：干跑零副作用；--write 中断（源已写目标未写）由冲突防线兜底重入。作用域：只动 knowledge/fr/<from|to>.md 与 INDEX.md，不触绑定语义/条目内容。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-redomain 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：ID 前缀与域不符的历史痕迹（FR-auto-backend-019 住 platform-sync.md）——有意取舍：换号会断绑定/supersede/最近确认三条寻址链，痕迹只影响美观；INDEX 路由按域文件而非 ID 前缀，注入/rot 查询全按文件域走。次风险：syncIndexRoutingLines 全目录同步在 INDEX 手改杂行时的行为——既有函数幂等语义（既有行 no-op），风险承袭不新增。放弃方案：迁域换号+三链改写——身份重写面太大且易漏，违背 D-001 单一身份。
