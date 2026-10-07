---
author: flow-machine-draft
created_at: 2026-10-07T14:50:14.029Z
---
# 设计记录（Design Record）— 2026-10-07-scope-audit-thin-patch-replay

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

缺陷（multi-agent-platform docs/sillyspec/thin-flow-done-no-scope-audit-snapshot.md）：thin 流程 `flow done` 只冻结 change-patch.json + change.patch，不落 execute --done 链才写的 scope-audit.json 快照；归档 thin 变更查范围对账时快照缺失 → 实时开放区间兜底 → 无 baseAnchor → HEAD 未提交窗口（干净树=空）→ design 清单全行恒「计划未动 +0/−0」，纯失真。

修法取读侧兼容（缺陷记录修复方向之二，优先于写侧补快照）：`computeFullFlowAudit` 的 settled 分支在快照缺失时，回读变更目录 change-patch.json（files/baseline/head/totals/patchSha256）+ change.patch（冻结正文）当冻结对账记录回放——数据在 flow done 时点已经全部冻结，读侧补一条回放链即可让**所有存量归档**（含 2026-10-07-taskboard-tasks-md）立即受益，无需重新归档。不做写侧补快照：thin 已有一份 sha256 锚定的冻结件，再落一份 scope-audit.json 会造出双冻结源（两件可能漂移），单一真相优于重复留痕。

回放行数不改采 git（baseline..head 区间对 committed 面成立，但冻结面还含 done 时点工作树件，且依赖对象库存活），直接解析 change.patch 的 `diff --git` 段统计 +/− 行——自包含、确定性、与冻结件 sha256 同源。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增内部函数（src/scope-audit.js，不导出）：`readChangePatchMeta(changeDir)`（读 change-patch.json，files 数组合法才返回，否则 null）、`readChangePatchText(changeDir)`（读 change.patch 正文）与 `parseFrozenPatchStats(patchText)`（按段返回 Map<path,{additions,deletions,kind}>，new/deleted/binary 三档与 collectNumstatByPath 口径对齐）。
- `computeChangeScopeAudit` 返回值增量字段：thin 回放态带 `frozenPatchPath`（指向 change.patch，仅 getFileDiff 消费，grep 确认无其他消费方）与 `patchSha256`/`patchStatus`（透传 meta）；既有字段语义零变化——快照回放态、实时态、quick 态不受影响。additive 契约，平台/前端按存在性读取。
- `getFileDiff`（--file）零代码改动：回放结果带 frozenPatchPath 后自动走冻结切片 + A-F01 sha256 校验链。
- CLI 命令面（scope-audit / scope-audit --json / --file）签名与输出结构零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立：回放只读 flow done 时点已冻结的静态件，无时序输入。change-patch.json 与 change.patch 不一致（一侧后写）时以 json 的 files 为文件集、patch 提供行数，patch 缺段行数落 null 档不出伪数据，sha256 不匹配由 --file 链拒绝——乱序不产生伪真值。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   回放路径纯读（computeChangeScopeAudit 全程无落盘契约不变）；若查询时点恰逢另一会话对该变更 --refreeze（change-patch.json 重写），读侧 JSON.parse 失败/形态不合法即回退下一链路（readChangePatchMeta 返回 null → 开放区间兜底）。写侧 flow.js 为 writeFileSync 直写、非原子（评审 P3 清偿：原文误称由 fs-atomic 保证）——最坏读到旧版完整件或瞬时回放缺失，不出半份伪数据。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   变更已归档 = 流程终态，冻结件不再变化；--refreeze 重冻结是写侧显式操作，重冻后回放自动取新版 meta。查询中断无状态残留（纯读、fail-soft 全 catch）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   change-patch.json 按 changeDir（changes/archive/<名>/ 或活跃目录）定位，与 resolveChangeDir 既有口径同源，不跨变更串台；meta.files 是本变更归属面（flow done 已按 own-vs-foreign 切分并排除他会话声明文件），回放不重新归属；跨仓条目（design .repo 标注）回放保持 v1 ⊘ untouched 形态（thin 冻结件只有主仓 patch，不假装对账过）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：patch 段解析与 git 真实 numstat 的口径偏差（路径含空格的引号形态、rename 段、\ No newline 标记）。缓解：段头正则与既有 filterPatchForFiles/slicePatchForFile 同款（b/ 新路径），\ 开头续行不计，rename 场景 thin 冻结面罕见且行数偏差不改变三态判定；测试对拍 buildFrozenPatch 产物。放弃的方案：① flow done 补写 scope-audit.json（写侧）——只救新变更救不了存量归档，且造双冻结源；② 行数按 meta.baseline..head 提交区间改采 git numstat——对 committed 面精确但冻结面含 done 时点工作树件（治理工件/untracked），且引入对 git 对象库存活的依赖，不如解析冻结 patch 自包含。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/scope-audit.js | settled 分支快照缺失时回读 change-patch.json/change.patch 回放三态；新增 readChangePatchMeta / readChangePatchText / parseFrozenPatchStats 内部函数；getFileDiff 经 frozenPatchPath 自动冻结切片 |
| 新增 | test/scope-audit-thin-patch-replay.test.mjs | 归档 thin 回放夹具：三态真实表 / failed 留痕 / 冻结语义与 --file 切片 / 快照优先级与双缺兜底 |
