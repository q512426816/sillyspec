---
author: flow-machine-draft
created_at: 2026-09-30T08:22:34.671Z
---
# 提案书（Proposal）— 2026-09-30-snapshot-symlink-store-subdir

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:059eefc9522a88a04e02a16347db11fa24adace121ef82a2ff8bfb7de82c6df9:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-snapshot-symlink-store-subdir 留痕重锚 -->
任务原话转写：gate-snapshot 的 symlink-store 布局探测扩展到子目录 lockfile。现状：detectSymlinkStoreLayout（gate-snapshot.js:720）只查根目录 pnpm-lock.yaml/bun.lockb/lerna.json/packageManager——apps 型 monorepo（lockfile 在 frontend/、daemon/ 等子目录）漏检，快照照建，每轮实测 ~160s 纯烧在快照构建/junction 上（实证：multi-agent-platform 2026-09-30 verify 收敛循环，frontend/pnpm-lock.yaml + sillyhub-daemon/pnpm-lock.yaml 在子目录，根目录无 lockfile，质量扫描 11 轮每轮 ~290s 中 test 85s + lint 43s，其余 ~160s 为快照构建+cleanup）。改法：探测扫一层子目录（*/pnpm-lock.yaml、*/bun.lockb|bun.lock、*/lerna.json），命中返回带 subdir 标签（如 pnpm(subdir:frontend)）；两层 packages/* 型不需要（该形态 lockfile 在根）。跳快照回退主仓是既有保守裁决（宁可主仓口径，污染归属鉴定兜底）。

成功标准：
- 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile 判据时，detectSymlinkStoreLayout 返回带 subdir 标签的布局名（非 null）
- 根目录判据行为零变化（根命中优先，标签不带 subdir）
- createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（回退主仓实测），既有调用方（质量扫描/verify 门）零改动
- 非仓目录/无子目录/子目录全空的行为零变化（null）
- 全量测试回归绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:4e0749a3756ea365a84693cf09a605133b6e3d768709dab974ea013cb793837a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-snapshot-symlink-store-subdir 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile 判据时，detectSymlinkStoreLayout 返回带 subdir 标签的布局名（非 null）
2. 根目录判据行为零变化（根命中优先，标签不带 subdir）
3. createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（回退主仓实测），既有调用方（质量扫描/verify 门）零改动
4. 非仓目录/无子目录/子目录全空的行为零变化（null）
5. 全量测试回归绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:af5942c7fbca7b90f14e814db6b84eb0bd6ccc0b6ce9e3b0bd89e3baea0837d3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-snapshot-symlink-store-subdir 留痕重锚 -->
1. 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile 判据时，detectSymlinkStoreLayout 返回带 subdir 标签的布局名（非 null）
2. 根目录判据行为零变化（根命中优先，标签不带 subdir）
3. createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（回退主仓实测），既有调用方（质量扫描/verify 门）零改动
4. 非仓目录/无子目录/子目录全空的行为零变化（null）
5. 全量测试回归绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
