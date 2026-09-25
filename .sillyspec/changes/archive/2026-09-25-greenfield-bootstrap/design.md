---
author: flow-machine-draft
created_at: 2026-09-25T16:03:45.339Z
---
# 设计记录（Design Record）— 2026-09-25-greenfield-bootstrap

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-greenfield-bootstrap 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
四件：①flow start 绿地检测——模块图缺席（discoverModuleIndex null）且 --input 路径语料非空时新模块 greenfield-bootstrap.draftModuleMap 机器起草初始 _module-map.yaml（目录段聚合 modules.<id>.paths；generator/status=draft 自明身份；不含 blast 段——判级缺席安全降级；不覆盖已有、全库任一图在场即不写的幂等闸门）；②archive 侧 indexRequirements 供清单（archive-distill 与 complete-handlers 两调用点加 deliverableFiles=archiveDeliverableFiles：design 表∪apply-manifest files——R17 臂3 unmapped 的直接成因修复，与轻量道口径对齐）；③indexRequirements 尾部伪域提醒（落 auto-*/unmapped 时提示补模块卡升级路径）；④unmapped 超阈（>50）告警配治理指引（本仓 720 条实证堆积病入口）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-greenfield-bootstrap 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新文件 src/greenfield-bootstrap.js（导出 draftModuleMap）；src/fr-index.js 新导出 archiveDeliverableFiles + indexRequirements 尾部提醒段；src/run/archive-distill.js 与 src/run/complete-handlers.js 调用点供清单；src/flow.js fresh 分支草案起草接线（best-effort 不阻断 start）。行为变化：绿地首变更自动获得草案模块图（此前静默落 unmapped）；archive 侧 FR 域路由按真实交付文件面投票。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-greenfield-bootstrap 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：草案在 start 时点起草、distill 在 done 时点消费——草案先于消费且不覆盖已有（时序安全）；apply-manifest 是归档时冻结件（迟到无影响）。2. 并发：草案幂等闸门扫全库模块图（两并行会话同仓同起点竞争写时后者 existsSync 拦住——窗口极窄且 writeAtomicSync 文件级原子）；知识域文件写沿 indexRequirements 既有单写入方纪律。3. 切换：起草失败 best-effort 不阻断 start（退化为旧行为——落 unmapped+提醒）；提醒段 fail-open。4. 作用域：草案项目名取 package.json name（多项目仓幂等闸门防重复建）；GENERIC_SEGMENTS 泛化段集与 fr-index.pseudoDomainFromPaths 同族（未合并——两处语义略异：草案要求可命名段、伪域投票取众数，强行统一会耦合，留观）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-greenfield-bootstrap 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=草案模块切分错误（把一个模块劈成两个或并错段）——错误域语义比 unmapped 更隐蔽（评审 P3 已预登）；缓释：draft 标识+醒目提示 scan 校准+modules rebuild 可重建；不校准也可用（域路由至少分流不堆积）。死路①：草案含 blast 段——判级消费 blast 缺席有安全降级（S1 起步），写入反而引入过时 blast 风险，弃；死路②：unmapped 治理自动化（自动按目录段迁移存量条目）——720 条存量迁移是数据操作需逐条人审（承接语义），超出本变更，交治理指引引导后续变更分批承接。
