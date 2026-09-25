---
author: flow-machine-draft
created_at: 2026-09-25T15:24:49.577Z
---
# 设计记录（Design Record）— 2026-09-25-cli-protocol-trust

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-cli-protocol-trust 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
四修一钉，全部经子代理拿真实代码实证定位：①--same-session/--force 登记 knownFlags（双死路：CLI 报错指引指向被自己白名单拦死的 flag）；②extractSuccessCriteria 前置续行合并（括号/引号未闭合与行尾悬空连接符跨行并回，切分保持行级——句子级强切经评审否决）+ clipTaskText 句界感知截断（60 硬切→80 窗句读截断+省略号，下游按前缀锚消费放宽安全）+ 碎片特征检测 console.warn；③verify 批量对齐前补亲测（对齐面含 verifyRunQualityScan 步先跑 executeVerifyQualityScan，幂等指纹复用，失败弃批量保单步——「批量不省任何门」承诺恢复）；④archiveNarrowedGitAdd 扩 knowledge 面（status 窄化逐文件 add fr/decisions/INDEX，非目录级防扫他侧 WIP）；⑤flag-contract 一致性钉（静态扫描三种消费形态 vs 白名单，钉死整类漂移非单实例）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-cli-protocol-trust 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
command.js knownFlags +2 登记；flow-draft.js 新导出 clipTaskText、内部 helper needsContinuationMerge/detectFragmentedCriteria、extractSuccessCriteria 输入前置合并、draftAll 入口碎片检测、draftTasks 渲染改 clip；complete.js verify 批量分支加 pendingScanStep 前置亲测（_skipBatch 失败降级单步）；complete-handlers.js archiveNarrowedGitAdd 加 knowledge 侧 status 窄化 add（fail-soft）。行为变化：两死路 flag 可用；摘录不再拆碎片；批量对齐亲测必跑；归档链暂存面含 knowledge 蒸馏产物。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-cli-protocol-trust 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：续行合并是纯文本前置变换，与节检测顺序无关（节标题行显式豁免合并）；批量亲测在 --done 单线程内时点固定。2. 并发：knowledge 侧 add 用 status 快照逐文件（瞬时窗口内他侧新写文件可能被顺带 add——追加型共享面整文件提交与惯例一致，且比目录级精确）；executeVerifyQualityScan 幂等（同变更并发 --done 至多重复一次秒级指纹检查）。3. 切换：批量亲测失败降级单步推进（noAI 硬门原路径），无半态；_batchAligned 戳与既有 gate_rollback 语义不变。4. 作用域：flag 钉只扫 command.js 单文件（消费形态三種静态字面量，方案评审证实零动态 flag）；clip 80 窗对超长英文路径条目可能截断路径尾——路径类条目建议整条不截的边界已知（P3 级，前缀锚消费不破坏，留观）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-cli-protocol-trust 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=批量亲测改变 verify --done 时序（原先纯同步批量对齐现在可能跑 2-10 分钟实测）——照 gates.js 亲测先例补了预告输出，且幂等指纹复用使二次跑秒回；若亲测环境异常，失败降级单步（用户可 --reopen 走原路）无新死路。死路①：句子级强切+标点自检（评审否决：误伤复合条目/无标点条目）；死路②：flag 钉全仓扫描（三个子模块读 argv 的透传面无法静态判定消费——收窄到 command.js 单文件+显式 allowlist 才可行）。
