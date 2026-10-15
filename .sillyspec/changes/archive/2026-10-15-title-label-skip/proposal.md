---
author: flow-machine-draft
created_at: 2026-10-15T03:34:08.898Z
---
# 提案书（Proposal）— 2026-10-15-title-label-skip

## 动机

任务原话转写：标题/摘要提取对段头行免疫：标签行跳过取次行+复合词白名单+模块索引摘要同源+模板首行改概括句+存量6行title与1行摘要清偿

成功标准：
- deriveChangeTitle 对「动机与背景：」独立段头行返回次行内容；「动机与背景：xxx」同行形态剥标签取 xxx；既有白名单剥离与成功标准截断行为不变
- flow done 模块变更索引回写摘要与标题同源（复用 deriveChangeTitle 提取链），段头行不再入摘要
- AGENTS.md/templates/SKILL/CLI 用法串的 --input 示例首行改为一句概括（消除段头诱导）
- 进度库 6 个「动机与背景：」title 与 stages.changelog.md 1 行摘要修复为真实概括
- 测试全绿 + lint 绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. deriveChangeTitle 对「动机与背景：」独立段头行返回次行内容；「动机与背景：xxx」同行形态剥标签取 xxx；既有白名单剥离与成功标准截断行为不变
2. flow done 模块变更索引回写摘要与标题同源（复用 deriveChangeTitle 提取链），段头行不再入摘要
3. AGENTS.md/templates/SKILL/CLI 用法串的 --input 示例首行改为一句概括（消除段头诱导）
4. 进度库 6 个「动机与背景：」title 与 stages.changelog.md 1 行摘要修复为真实概括
5. 测试全绿 + lint 绿

## 成功标准（可验证）

1. deriveChangeTitle 对「动机与背景：」独立段头行返回次行内容；「动机与背景：xxx」同行形态剥标签取 xxx；既有白名单剥离与成功标准截断行为不变
2. flow done 模块变更索引回写摘要与标题同源（复用 deriveChangeTitle 提取链），段头行不再入摘要
3. AGENTS.md/templates/SKILL/CLI 用法串的 --input 示例首行改为一句概括（消除段头诱导）
4. 进度库 6 个「动机与背景：」title 与 stages.changelog.md 1 行摘要修复为真实概括
5. 测试全绿 + lint 绿
