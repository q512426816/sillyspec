---
author: flow-machine-draft
created_at: 2026-10-13T07:49:56.024Z
---
# 提案书（Proposal）— 2026-10-13-flow-diff-cmd

## 动机

任务原话转写：动机：change 粒度的文件统计查询口缺失——数据两态俱在但无展示入口：归档变更有 change-patch.json scopeAudit（逐文件 +N/-M + totals + verdict），活跃变更有 flow-state baseline + git（patch 子步同款 collectNumstatByPath/filterCommittedFace 零件），但 agent/用户想看「这个变更改了哪些文件多少行」只能去翻归档 JSON 或手跑 git diff。加只读子命令 flow diff --change <名>：归档变更读 scopeAudit 渲染，活跃变更实时算（已提交交付面 baseline..HEAD 按冻结面口径 + 未提交交付面工作树对账），双态同构 + --json 机器面（平台后续轮锚对账的消费口）。只读零副作用：不触发 pull、不写盘、不动 change 状态（照 scan diff 先例跳 triggerPullActiveChange）。

成功标准：
- flow diff --change <归档名> 渲染归档件逐文件 +N/-M 与 totals（含 verdict 列），--json 输出同构结构
- flow diff --change <活跃名> 实时计算：已提交交付面（baseline..HEAD 经 filterCommittedFace 冻结面口径）+ 未提交交付面（工作树 vs HEAD，untracked 按行数、二进制 null）+ 合计
- 变更不存在 → exit 1 且修复路径一次给全；无 git 基线 → 显式提示 exit 0；变更名走既有白名单校验
- 只读零副作用：不 pull/不写盘/不改 flow-state（与 scan diff 同纪律）
- 既有回归零改动全绿；flow 族 usage 行补 diff

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. flow diff --change <归档名> 渲染归档件逐文件 +N/-M 与 totals（含 verdict 列），--json 输出同构结构
2. flow diff --change <活跃名> 实时计算：已提交交付面（baseline..HEAD 经 filterCommittedFace 冻结面口径）+ 未提交交付面（工作树 vs HEAD，untracked 按行数、二进制 null）+ 合计
3. 变更不存在 → exit 1 且修复路径一次给全；无 git 基线 → 显式提示 exit 0；变更名走既有白名单校验
4. 只读零副作用：不 pull/不写盘/不改 flow-state（与 scan diff 同纪律）
5. 既有回归零改动全绿；flow 族 usage 行补 diff

## 成功标准（可验证）

1. flow diff --change <归档名> 渲染归档件逐文件 +N/-M 与 totals（含 verdict 列），--json 输出同构结构
2. flow diff --change <活跃名> 实时计算：已提交交付面（baseline..HEAD 经 filterCommittedFace 冻结面口径）+ 未提交交付面（工作树 vs HEAD，untracked 按行数、二进制 null）+ 合计
3. 变更不存在 → exit 1 且修复路径一次给全；无 git 基线 → 显式提示 exit 0；变更名走既有白名单校验
4. 只读零副作用：不 pull/不写盘/不改 flow-state（与 scan diff 同纪律）
5. 既有回归零改动全绿；flow 族 usage 行补 diff
