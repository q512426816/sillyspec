---
author: flow-machine-draft
created_at: 2026-10-07T15:27:48.775Z
---
# 提案书（Proposal）— 2026-10-07-unify-close-trace

## 动机

任务原话转写：双通道收尾留痕统一（缺陷记录 multi-agent-platform docs/sillyspec/thin-flow-done-no-scope-audit-snapshot.md 修复方向之三；第 2 层读侧回读已由 2026-10-07-scope-audit-thin-patch-replay 落地）：thin（flow done）只写 change.patch/change-patch.json、heavy（execute --done）只写 scope-audit.json/scope-audit.patch，两条通道留痕不对称——平台两张卡各认一份，每类变更恰好一张卡失真（轻量对账明细恒假计划未动〔读侧已修〕；厚道归档留档 patch 块空）。修法：flow-parity.js 新增共用 writeCloseTraceArtifacts——一次写齐四件（沉淀资产面 change.patch+change-patch.json、对账快照面 scope-audit.patch+scope-audit.json），sha256/patchStatus 双套同锚；flow done 与 printExecuteScopeAudit 双接线，新变更两通道留痕对称，读侧回退（快照>change-patch 回放>实时区间）退化为存量兜底。

成功标准：
- flow done（thin）收尾后变更目录四件齐备：change.patch/change-patch.json（既有语义不变——files 含治理工件目录、totals 口径不变）+ scope-audit.json/scope-audit.patch（新增：三态行含 verdict、baseAnchor=baseline、closedBy=flow done）
- execute --done（heavy）收尾后同样四件齐备：scope-audit.json/patch（既有语义不变）+ change-patch.json/change.patch（新增：files=主仓实改行投影、baseline=快照锚、head=当点 HEAD）
- 同一次收尾的四件 sha256 同锚：change.patch 与 scope-audit.patch 字节一致，两份 json 的 patchSha256 相同
- 读面双路径验证：新 thin 归档查 scope-audit 走快照记录态（note 标 flow done 时点，不再误标 execute --done）；重跑 flow done（漂移重冻结）不自嵌入（scope-audit.json/patch 进排除面）
- 全量测试绿（含新增 writer 单测/round-trip/双通道 CLI 夹具）；既有断言零改动（flow-protocol 归档双件断言原样）

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. flow done（thin）收尾后变更目录四件齐备：change.patch/change-patch.json（既有语义不变——files 含治理工件目录、totals 口径不变）+ scope-audit.json/scope-audit.patch（新增：三态行含 verdict、baseAnchor=baseline、closedBy=flow done）
2. execute --done（heavy）收尾后同样四件齐备：scope-audit.json/patch（既有语义不变）+ change-patch.json/change.patch（新增：files=主仓实改行投影、baseline=快照锚、head=当点 HEAD）
3. 同一次收尾的四件 sha256 同锚：change.patch 与 scope-audit.patch 字节一致，两份 json 的 patchSha256 相同
4. 读面双路径验证：新 thin 归档查 scope-audit 走快照记录态（note 标 flow done 时点，不再误标 execute --done）；重跑 flow done（漂移重冻结）不自嵌入（scope-audit.json/patch 进排除面）
5. 全量测试绿（含新增 writer 单测/round-trip/双通道 CLI 夹具）；既有断言零改动（flow-protocol 归档双件断言原样）

## 成功标准（可验证）

1. flow done（thin）收尾后变更目录四件齐备：change.patch/change-patch.json（既有语义不变——files 含治理工件目录、totals 口径不变）+ scope-audit.json/scope-audit.patch（新增：三态行含 verdict、baseAnchor=baseline、closedBy=flow done）
2. execute --done（heavy）收尾后同样四件齐备：scope-audit.json/patch（既有语义不变）+ change-patch.json/change.patch（新增：files=主仓实改行投影、baseline=快照锚、head=当点 HEAD）
3. 同一次收尾的四件 sha256 同锚：change.patch 与 scope-audit.patch 字节一致，两份 json 的 patchSha256 相同
4. 读面双路径验证：新 thin 归档查 scope-audit 走快照记录态（note 标 flow done 时点，不再误标 execute --done）；重跑 flow done（漂移重冻结）不自嵌入（scope-audit.json/patch 进排除面）
5. 全量测试绿（含新增 writer 单测/round-trip/双通道 CLI 夹具）；既有断言零改动（flow-protocol 归档双件断言原样）
