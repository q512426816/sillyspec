---
author: flow-machine-draft
created_at: 2026-09-27T13:09:56.352Z
---
# 设计记录（Design Record）— 2026-09-27-thin-module-scope-persist

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-thin-module-scope-persist 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
`reconcileModuleDocs`（src/flow-parity.js）旧实现只渲染 console 行，且落地实测发现四缺陷全哑：js-yaml 顶层迭代不进 `modules:` 包层→命中恒 0；字母序取首个项目图→多项目仓读错图（本仓 7 张图只读 backend 的）；子项目 paths 前缀缺失；docTouched 拿 specBase 相对路径比仓根相对 committedRaw→恒 false。本变更换用 module-resolve.collectModuleMaps 统一口径（收齐全部 docs/&lt;project&gt;/modules/_module-map.yaml、子项目 paths 前缀、normalizeMapPath 归一），同计算产出结构化返回面：`modules`（受影响模块：id/命中文件数/doc 路径/文档是否随变更更新/文档是否缺失）、`uncoveredDirs`（未登记模块图的交付目录：dir/文件数，全量降序）、`moduleMaps`（全部参与对账的图路径）；flow.js patch 子步把对账调用前移到 change-patch.json 写盘之前，三键随 meta 落盘——单一计算喂 console 与落盘两处，平台读 change-patch.json 即得影响模块范围，无需自建重算口径。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-thin-module-scope-persist 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- `reconcileModuleDocs`（src/flow-parity.js）签名增 `cwd` 参（子项目前缀判定 + specBase→仓根相对换算）；返回值 `{lines, hits}` → `{lines, hits, modules, uncoveredDirs, moduleMaps}`：旧键语义不变；新键 `modules: [{id, files: number, doc: string|null, docTouched: boolean, docMissing: boolean}]`、`uncoveredDirs: [{dir, files}]`、`moduleMaps: string[]`。仓内唯一调用方 flow.js patch 子步同步适配，外部无消费者。
- `module-resolve.js` 导出 `normalizeMapPath`（原模块私有，路径归一单一口径防两处漂移）。
- `change-patch.json`（flow done 时点写入）新增同名三键：零命中 → `modules: []`、无未登记 → `uncoveredDirs: []`、无模块图 → 三键空数组——键恒在场，平台读侧无需判 undefined。数据语义=done 时点冻结口径（与 `files[]` 同一时点语义），不随后续模块图变更回写。
- CLI 命令面/退出码/其它工件格式无变化。
- 评审 P1/P3 清偿追加：① `buildFrozenPatch`（src/scope-audit.js）diff 采集失败改 fail-closed 返回 null（jsdoc 原契约「不落伪 patch」首次真兑现——实证：本仓 core.bare 被外部误写 true 时 `git diff &lt;ref&gt;` 报「must be run in a work tree」，untracked 自拼 hunk 仍拼出 patchStatus ok 但正文零 tracked hunk 的伪完整件；环境项 core.bare 已还原 false，代码防线独立于环境）；② 对账输入改传冻结面 ownFiles（与 files[] 同口径——worktree/--freeze-dirty 场景 dirty 交付也计入模块命中，评审 P3 清偿）；③ 三键恒在场兜底空数组（对账整体异常路径不再缺键，评审 P3 清偿）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-thin-module-scope-persist 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：模块对账是 done 时点一次性计算、一次性落盘；模块图事后变更不回写 change-patch.json（时点冻结件，与 files[] 同语义），平台展示的是收口时点口径——后续演进由后续变更自己的落盘携带。
2. 并发写：change-patch.json 仍由 flow done 在本变更目录内单点写入，多会话 change 目录隔离；本变更不新增共享写面。
3. 切换/生命周期：patch 子步断点续跑语义不变（已 done 则 skip 不重写；对账/落盘 fail-soft 不阻断归档，重入 done 重试）；测试面填入 git 已跟踪的 0 字节占位件 test/flow-parity.test.mjs，无新增文件生命周期。
4. 作用域：模块图发现改为收齐全部项目图（collectModuleMaps 口径），`moduleMaps` 键落盘全部参与对账的图路径供平台消歧；子项目判定按「project 名=仓库顶层目录」前缀规则（与模块卡解析同口径），数据全在各自 change 目录内，跨仓/跨实例无串台。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-thin-module-scope-persist 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：平台把 advisory 数据当强承诺——`modules: []` 不等于「无影响」（可能是模块图未登记，未登记面要看 `uncoveredDirs`），展示侧应按「已知影响面」标注而非断言。缓解：键语义已在接口契约固定，`uncoveredDirs` 与 `modules` 并列落盘正是为了让「未登记」显式可见。
试过放弃：① 另立 module-scope.json 单独工件——放弃：change-patch.json 已是平台在读的冻结事实件（files/sha 都在那），多一个文件多一份生命周期与一致性成本；② 把结构化结果渲染进 verify-result.md——放弃：那是人读回执，机器消费面不应与人读面耦合；③ 只加落盘不修旧对账缺陷——放弃：实测旧实现命中恒 0（modules: 包层不进 + 多项目读错图），不修则落盘恒空数组，FR-01 形同虚设——四缺陷修复随本变更交付并各有限定测试锁定。
