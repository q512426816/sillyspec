---
author: flow-machine-draft
created_at: 2026-09-26T15:33:23.784Z
---
# 设计记录（Design Record）— 2026-09-26-dynamic-test-inference

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-dynamic-test-inference 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
测试面从「local.yaml 静态配置」改为「运行时按变更动态推断」。三源并集：① 本变更自身 diff 中的测试文件；② FR 关联回归——active FR 的覆盖文件面（来源变更 patch ∪ 绑定 tests 剥锚）∩ 本次触碰文件 ≠ ∅ 者，取其绑定的测试文件（rotSuspectFlow 同款查询反用为测试面，fr-index 新增 activeFrCoverageHits 共享查询核）；③ import 依赖测试（既有 discoverModuleDependentTests）。执行层 runner 自项目结构推断（buildDepsBatches 扩展：.py→最近 pyproject/uv 祖先的 uv run pytest 或 python -m pytest；.tsx/.jsx→最近含 vitest/jest 的 package.json；.mjs→node --test），不再依赖 modules.*.test 命令。决策树：test_strategy:skip→真跳过；显式 full→全量（commands.test 在场仍生效作逃生阀，否则结构推断 npm test/pytest）；缺省→动态子集；modules.*.test 一律不再消费（在场打印退役指引）。配套：FR 绑定写入侧（upsertFrBindings 接受 projectRoot）路径归一为仓根相对；新增 tests repair-paths 子命令修存量错形（根相对/子项目前缀丢失/裸文件名→统一仓根相对），平台仓实测修复。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-dynamic-test-inference 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- fr-index.js：新增导出 activeFrCoverageHits({knowledgeRoot, archiveRoot, changedFiles, changeDir, change})（强命中 FR 及其 bindings/coverage）与 collectFrLinkedTests({specBase, changeName, changedFiles, projectRoot})（解析为仓根相对测试文件集 + frHits 明细）；路径解析新增 resolveTestFileRel（根相对直取→子项目根前缀补全→裸文件名受限 glob 兜底）。
- verify-postcheck.js：buildDepsBatches runner 推断源从「命中模块命令」改为「项目结构」（detectSubprojectRoots + 最近清单祖先）；runVerifyTestCheck 决策树重排（见槽1）；runFullCommand 在无 commands.test 时结构推断全量命令（package.json scripts.test / pytest 发现）而非直接 skipped。
- test-bindings.js：upsertFrBindings({..., projectRoot}) 可选参——tests 路径写入前归一仓根相对。
- index.js：CLI 新增 `sillyspec tests repair-paths`（全量 fr/*.md 绑定行路径修复，干跑预览缺省、--write 落盘）。
- 行为变化：local.yaml modules.*.test 消费退役；commands.test 仅显式 test_strategy: full 生效；缺省未配置仓从「skip(local.yaml 未配置)」变为「动态子集实测」。结果对象 shape（status/command/mode/...）不变，新增 mode='dynamic-subset'。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-dynamic-test-inference 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：动态推断每次门禁时点重算（diff+索引当下态），迟到文件下一轮收口自然并入；FR 绑定行按 (source_change,row_id) 幂等合并，重放不增殖。
2. 并发写：upsertFrBindings 原子写（writeAtomicSync）+ 机器不删 agent 行既有语义保留；repair-paths 与归档提升并发时同受原子写保护，输者重跑（幂等）。多会话并行变更各自算各自测试面，零共享配置写入——正是本变更要根治的串台面。
3. 切换/生命周期：中断重入时门禁重跑即重算（无缓存态依赖）；verify-runs 台账照旧落盘可追溯；repair-paths 干跑缺省，--write 才动盘。
4. 作用域：路径解析锚 projectRoot（门禁=cwd 仓根；repair=CLI 运行仓根），FR 域路由仍走 knowledge 模块卡（非 local.yaml）；跨仓仓不进 FR 回归源（bindings 是主仓索引，与既有「跨仓只跑 full」口径一致）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-dynamic-test-inference 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：动态子集的覆盖面判断错误→漏测放行（门禁漏跑=静默通过）。缓解：三源并集宁可多跑（import 闭包+FR 回归都是加法面）、deps 批超帽照旧（30/组保底 5）、全量语义留 test_strategy: full+CI 兜底；existing 测试大量断言 commands.test 执行——显式 full 逃生阀保住该路径语义，fixture 迁移成本可控。次风险：结构推断 runner 猜错（如 monorepo 双 package manager）——推断按「最近清单祖先」就近原则，猜不出降档 skipped 带指引不硬跑。放弃的方案：① 纯静态修补（继续 local.yaml 加 per-module 键）——治标，并行互改问题原样；② bindings 单源（只跑 FR 绑定测试）——冷启动仓索引空会饿死，且 bindings 是「上次跑过」非「必须跑」的形式化证明；③ agent 每变更自带测试命令参数——把配置问题转移成提示词纪律，无机器校验面。
