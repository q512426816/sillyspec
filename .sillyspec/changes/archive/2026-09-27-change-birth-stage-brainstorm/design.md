---
author: flow-machine-draft
created_at: 2026-09-27T12:42:47.563Z
---
# 设计记录（Design Record）— 2026-09-27-change-birth-stage-brainstorm

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-change-birth-stage-brainstorm 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三处出生硬编码（progress.js initChange/_readOrInit 两处 INSERT + db.js changes DDL DEFAULT）'scan'→'brainstorm'：scan 是 auxiliary（shared.js MAIN_FLOW_ORDER 不含、stage-machine 下一步推荐已跳过），从不是变更主流程起点，出生落它上面纯属 DDL 历史遗留。存量数据走 db.js _createSchema 末尾幂等 UPDATE 迁移（DB_SCHEMA_VERSION 7→8 触发戳失效重跑），只改写「active + 从未真跑 scan」的出生默认行——判据为 stages.scan='pending' 或根本没有 stages.scan 行（registerChange 出生行不带 stages 行，评审 P3-2 补面）；setStage('scan') 会置 in-progress，真在跑/已跑完 scan 的行天然不命中。改写行同时刷 last_local_modified_ts（与 pm._touchLocalModified 同语义），防平台 pull 见本地无脏度把旧 'scan' 静默导回。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-change-birth-stage-brainstorm 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
无新增函数/端点/命令；DB schema 版本 7→8（DB_SCHEMA_VERSION / project DDL DEFAULT / shared.js CURRENT_VERSION 三处 + progress.js read() 的 _version 由字面量 6 收敛为单一源 CURRENT_VERSION——v7 bump 漏改的第五处漂移顺带清偿）。对外可见行为变化：新建变更 current_stage 出生值 'scan'→'brainstorm'（progress show / overview stage_label 随之显示「🧠 需求探索」）；QUICK_CLOSE_ALLOWED_STAGES 已含 'brainstorm'，quick-close 阶段闸行为不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-change-birth-stage-brainstorm 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：迁移条件是状态谓词（current_stage/status/stages.scan 三列联判）不依赖事件顺序；某会话恰在迁移瞬间 setStage('scan') 时，SQLite WAL 单写者串行化，最终 Either 迁移已跑（该行保持 scan+in-progress，下次幂等补）或 setStage 先落（stages.scan=in-progress，迁移不命中）——两序都不产生错误态。
2. 并发写：迁移在 _createSchema 内、init 事务路径上，与既有 busy_timeout=5000 + BUSY 有限重试同机制；UPDATE 单语句原子。
3. 生命周期：迁移幂等（改写后条件不再命中），中断重入零重复效果；时间戳第二跑不 变（测试④断言）。
4. 作用域：迁移在每项目各自的 .sillyspec/.runtime/sillyspec.db 内执行，不跨仓；标脏只影响本行平台同步冲突判定（冲突保留本地现状），无串台。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-change-birth-stage-brainstorm 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：迁移把「从未进主流程」的存量行改判为 brainstorm 后，滞留提示语义从「停在代码扫描」变「停在需求探索」——展示层措辞变化，用户已裁定接受（起步就是头脑风暴）。放弃的方案：① 从 VALID_STAGES/STAGE_ORDER 里整体移除 scan——放弃，scan 阶段本身（项目级扫描操作）合法存在，牵动 stage-contract/consistency 面太大且非本缺陷根因；② 只改出生默认不做存量迁移——放弃，存量误导行（governance-rpc-actions 类）会一直显示到归档才消失，修复不完整。
