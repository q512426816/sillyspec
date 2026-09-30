---
author: flow-machine-draft
created_at: 2026-09-30T07:45:32.189Z
---
# 设计记录（Design Record）— 2026-09-30-quality-scan-passed-idempotent

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-quality-scan-passed-idempotent 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
质量扫描执行侧补 passed 态幂等闸，与既有失败签名闸（shouldReuseLastFailedScan/RERUN 签名闸）对称。实证：multi-agent-platform 2026-09-30 verify 收敛循环，agent 修 verify-result.md 文档反复重入 verify step6，码态恒定（零 commit）下质量扫描 11 轮 ×~290s 全量真跑（隔离快照构建 + dynamic-subset 测试 85s + lint 43s）——失败有签名闸防假红重试循环，passed 态无幂等闸（verify-quality-scan.js 注释明示「复用只消费 failed 态记录」）。改法三件：①shouldReuseLastPassedScan 纯函数（test passed 且 lint 非 failed、passedKey 全等、快照口径一致 → reuse）；②executeVerifyQualityScan 失败闸之后消费——命中打披露免重跑直接完成本步骤，不重写记录；③passedKey = dedupKey × 非文档脏集内容键（computeQualityScanDirtyContentKey：逐文件内容哈希，trim:false 取 porcelain 原文——git() 缺省 trim 吃首行前导空格致 slice(3) 路径错位，实证单文件脏集 digest 恒 <unreadable>；该错位对既有指纹（文件集口径）无功能影响，内容键第一次真正按路径读文件将其暴露）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-quality-scan-passed-idempotent 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- src/run/verify-quality-scan.js 新增导出：computeQualityScanDirtyContentKey({cwd})（非文档脏集逐文件内容哈希；git 不可用 null；单文件读不到按 <unreadable> 占位）、computeQualityScanPassedKey({cwd,specBase})（dedupKey×内容键合成，任一 null → null）、shouldReuseLastPassedScan({lastRecord,currentPassedKey,plannedSnapshot,forceRerun})（七态判定纯函数）。
- storeQualityScan 落盘 additive 字段 passedKey（存量记录无此键 → 闸判 no-passed-key 保守重跑一次后携带——dedupKey/rerunSignature 同款先例）；RECORD_SCHEMA_VERSION 保持 1。
- executeVerifyQualityScan 在失败签名去重闸之后新增 passed 幂等闸消费：命中 → 打「♻️ 幂等命中」披露 + 完成提示后 return（不建快照、不跑 test/lint/smoke/coverage、不重写记录 ranAt）；RERUN=1/force 旁路（与失败闸同阀）。
- 既有 computeQualityScanFingerprint/loadReusableQualityScan/--done 读侧口径零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-quality-scan-passed-idempotent 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：闸判定与记录读写都在 executeVerifyQualityScan 单进程同步序内（lookup 前置于任何实测，store 后置于全部实测），无乱序窗口；多轮重入间记录文件是唯一共享态，最后写者胜。
2. 并发写：两会话并发跑质量扫描——记录文件整文件 writeAtomicSync 覆盖写，A 落盘后 B 命中 A 的 passedKey 即免重跑（A 的实测真实有效）；passedKey 不等则各自真跑，最后写者胜。误复用方向封死：passedKey 含逐文件内容哈希，任何码态差异即失配。
3. 切换/中断：闸命中前中断 → 记录未动，下次照常判定；实测中断 → store 未达 → 记录保持上轮态（若上轮 passed 且键未变，下次幂等命中——中断的那轮本就没有新事实，语义正确）。无独立清理态。
4. 作用域：记录与键全部 per-change（qualityScanRecordPath 按 changeName）+ per-repo（cwd 的 git 态），跨仓/跨工作区天然隔离；快照口径入键（usedSnapshot × plannedSnapshot），口径切换即失配重跑。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-quality-scan-passed-idempotent 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：幂等闸吞真实重测需求。三层防线：①passedKey 内容敏感（dedupKey 的文件集口径对同文件未提交修改是盲的——开发中被既有 noAI 动作测试当场抓住：fixture 同文件翻转失败版，dedupKey 全等闸误命中；内容键正是为此存在，测试第五轮钉死）②lint failed 记录不入闸（保 lint 阻断发声）③RERUN=1/force 逃生阀与失败闸同阀。已放弃方案：a) 闸键直接用 dedupKey——同文件未提交内容修改盲区会吞真实代码修改（实证如上），弃；b) 闸键用 rerunSignature——其内容敏感面只覆盖 test/ 目录（computeTestFaceDigest(join(cwd,'test'))），仓根/子目录源文件同文件修改仍盲，弃；c) execute 侧复用 loadReusableQualityScan（--done 读侧）——它只校验 fingerprint（文件集口径），同盲区，弃。已知残留：git() 缺省 trim 吃 porcelain 首行前导空格是既有全局行为（影响所有经 porcelainCodeLines 的路径解析首行），本变更只在自己调用点传 trim:false 修正，未动 git-helper 公共行为（影响面大，若修应独立变更）。
