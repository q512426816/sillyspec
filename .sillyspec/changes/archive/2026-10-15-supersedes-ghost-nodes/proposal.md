---
author: flow-machine-draft
created_at: 2026-10-15T02:08:32.208Z
---
# 提案书（Proposal）— 2026-10-15-supersedes-ghost-nodes

## 动机

任务原话转写：效果评估实证：全图 703 决策节点 supersedes 边仅 1 条（边体系实质闲置）。根因：同号版本取代是蒸馏就地替换（applyEntryToSections 同变更同段旧版清除、跨文件同谓词同删），supersedes 引用的目标版本从不在场——真实库 39 条 supersedes 引用 0 条可解析。修法：图构建时为「自身版本链」的缺失目标合成 superseded 幽灵节点承接边（口径严格限定 sid 基号===条目 id 基号或 originId 基号，即自己引用自己的旧版本；跨号/跨变更缺失引用不合成——2026-10-14-supersedes-mislink 跨变更误连防护不因幽灵形态复活，首版实现踩过此坑被既有测试②拦下后收紧）。真图 supersedes 1→37（36 幽灵全为自身版本链，零跨号铸造），知识文件零触碰。

成功标准：
- 同号自链缺失目标合成幽灵节点（ghost/status=superseded/supersededBy 回指），supersedes 边在场
- 在场目标走真实边零变化；跨号缺失引用零铸造（误连防护测试②既有断言零回归）
- 幽灵有入边非孤儿；真图 supersedes 1→37 且 nodes 只增幽灵（知识文件零 diff）
- 全图测试 13 文件零回归 + 新增 ghost 测试 3 组全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 同号自链缺失目标合成幽灵节点（ghost/status=superseded/supersededBy 回指），supersedes 边在场
2. 在场目标走真实边零变化；跨号缺失引用零铸造（误连防护测试②既有断言零回归）
3. 幽灵有入边非孤儿；真图 supersedes 1→37 且 nodes 只增幽灵（知识文件零 diff）
4. 全图测试 13 文件零回归 + 新增 ghost 测试 3 组全绿

## 成功标准（可验证）

1. 同号自链缺失目标合成幽灵节点（ghost/status=superseded/supersededBy 回指），supersedes 边在场
2. 在场目标走真实边零变化；跨号缺失引用零铸造（误连防护测试②既有断言零回归）
3. 幽灵有入边非孤儿；真图 supersedes 1→37 且 nodes 只增幽灵（知识文件零 diff）
4. 全图测试 13 文件零回归 + 新增 ghost 测试 3 组全绿
