---
author: t
created_at: 2026-10-10T19:10:00.000Z
---
# 提案书（Proposal）— 2026-10-10-cross-repo-patch-freeze

## 动机

用户实证（任务原话）：「代码跨仓时候 change-patch.json 和 change.patch 只有本仓的变更，我感觉不对，应该能展示全部的，不然这个就偏差了缺失了」。

排查确认两处结构性缺失：
1. **跨仓 diff 正文从未冻结**——收口只冻主仓面（`buildFrozenPatch(cwd,…)` + `projectTraceFaceRows` 显式滤 crossRepo 行）；跨仓只有计数与锚点哈希（`scopeAudit.repos[]`，heavy 通道）。B/C 档锚（最近提交窗口/未提交窗口）的改动内容在收口时点之后**永久不可复得**，「审计真相在 change.patch sha256 锚定」的核心承诺对跨仓面不成立。
2. **轻量道（flow done）跨仓行谎报**——`buildThinSnapshotRows` 对带 repo 的声明条目恒补 `untouched ⊘` 行，跨仓实际改了也显示「未动」，无任何跨仓对账。

## 方案对比（三选一）

- **方案 A：每仓独立 patch 文件**（`change--<repoKey>.patch` 落变更目录）——diff 内容可独立 `git apply`；但要打破 2026-10-09-close-trace-single-set「只写 change.patch + change-patch.json 两件」的收口纪律，平台 assets/归档/读侧兼容链全要扩一件文件族，动面最大。
- **方案 B（选定）：跨仓 patch 内嵌 change-patch.json**——`scopeAudit.repos[]` 条目增 `patch` + `patchSha256` 两键；单套两件纪律保持、读侧兼容链不动（纯增量键）、平台本来就读 JSON。独立 apply 形态记非目标（提取一行 jq 即得）。
- **方案 C：混进单 change.patch**——多仓 diff 混单文件 `git apply` 必失效且路径语义误导，否决。

## 变更范围

- src/scope-audit.js：跨仓对账集成段抽导出 `reconcileCrossRepoPlan`（heavy/thin 同源单一实现）+ repos[].patch/patchSha256 采集。
- src/flow-parity.js：`buildThinSnapshotRows` 增可选 `crossRepoRows` 参（缺省零回归）。
- src/flow.js：done 路径跨仓对账接线（fail-soft）。
- 新增 test/cross-repo-patch-freeze.test.mjs（真实 git fixture）。

## 成功标准（可验证）

1. 跨仓声明的变更收口后，change-patch.json `scopeAudit.repos[]` 含该仓实际改动 diff 正文（窗口 = 行数采集窗口）与 sha256 锚；采集失败/空窗口落 `patch: null` 不出伪件。
2. 轻量道 flow done 对跨仓声明行产出真实三态行（planned/unplanned 实改 + 实 +/- 行数），不再恒 `untouched ⊘`；降级仓（未注册/不可达）诚实 ⊘ + degradedReason 留痕。
3. 顶级 `files[]/totals` 主仓投影面、`change.patch` 单件、`patchSha256/patchStatus` 顶级键全部不变（既有读方零回归）；既有测试面（close-trace-unified / cross-repo-* / worktree-isolation）全绿。
