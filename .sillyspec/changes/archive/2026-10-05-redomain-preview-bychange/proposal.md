---
author: flow-machine-draft
created_at: 2026-10-05T13:03:31.030Z
---
# 提案书（Proposal）— 2026-10-05-redomain-preview-bychange

## 动机

任务原话转写：坑 redomain-plan-preview-by-change-ignored（2026-10-02 实证，76338b4d 收编在途工作时此行漏透传）倒推收尾——在途代码已写好，本会话接手收编：tests --redomain 预览路径不透传 byChange，预览列整域条目而 --write 只迁分批子集，用户按预览理解会误判整域迁移。修法：index.js 预览调用补 byChange 透传（planRedomain 侧过滤本就在场）+ 预览计数带「仅变更」标注 + CLI 级单测锁定。
成功标准：
- tests --redomain --by-change 预览与落盘同口径：只列该变更条目，计数带「（仅「变更：X」）」标注
- 他变更条目不进预览清单
- CLI 级单测锁定（execFileSync 走真实 CLI 预览路径断言子集计数与排除项）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. tests --redomain --by-change 预览与落盘同口径：只列该变更条目，计数带「（仅「变更：X」）」标注
2. 他变更条目不进预览清单
3. CLI 级单测锁定（execFileSync 走真实 CLI 预览路径断言子集计数与排除项）

## 成功标准（可验证）

1. tests --redomain --by-change 预览与落盘同口径：只列该变更条目，计数带「（仅「变更：X」）」标注
2. 他变更条目不进预览清单
3. CLI 级单测锁定（execFileSync 走真实 CLI 预览路径断言子集计数与排除项）
