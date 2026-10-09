---
author: flow-machine-draft
created_at: 2026-10-09T15:28:35.294Z
---
# 提案书（Proposal）— 2026-10-09-release-3-32-3

## 动机

任务原话转写：发版 3.32.3（patch+1，线上 latest 与本地均为 3.32.2）——载 2026-10-09-rejected-write-side：防复潮 rejected 通道写侧供料（brainstorm 提出方案步第6条+对账步漏网补记；flow 槽4收割提示行底稿定性+/sillyspec:flow skill 底稿整理 bullet；docs/prompt 镜像同步）。

成功标准：
- package.json version=3.32.3 且 quick-retired 测试 R5 版本锚同步（pkg.version === '3.32.3' 断言绿）
- git push origin main 成功（含本变更归档）
- npm publish 成功且 npm view sillyspec version=3.32.3（latest 核验）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. package.json version=3.32.3 且 quick-retired 测试 R5 版本锚同步（pkg.version === '3.32.3' 断言绿）
2. git push origin main 成功（含本变更归档）
3. npm publish 成功且 npm view sillyspec version=3.32.3（latest 核验）

## 成功标准（可验证）

1. package.json version=3.32.3 且 quick-retired 测试 R5 版本锚同步（pkg.version === '3.32.3' 断言绿）
2. git push origin main 成功（含本变更归档）
3. npm publish 成功且 npm view sillyspec version=3.32.3（latest 核验）
