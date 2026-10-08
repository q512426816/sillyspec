---
author: flow-machine-draft
created_at: 2026-10-08T17:29:00.160Z
---
# 提案书（Proposal）— 2026-10-09-explore-arsenal-map

## 动机

任务原话转写：explore prompt 重组织为「话题→兵器映射」：补齐 search/status 两兵器且比现状更短。

动机与背景：
2026-10-08-explore-knowledge-graph 把图查询以 8 行罗列插进操作清单，清单已 7 项——继续逐条堆会稀释注意力。评审建议（用户采纳）：重组织为话题→兵器映射一小节，四类兵器各一行带场景：文本考古 rg / 坑史检索 knowledge search（新增兵器——四层召回防坑考古）/ 关系面 graph（既有）/ 在途面 status（新增兵器——方向建议前查活跃变更防撞车）。prompt 净变短更可扫；技能卡同步同形态；description 触发词面不动。

成功标准：
- src/stages/explore.js：操作清单原第 3/4 项（rg 一行+图谱 8 行）合并重组织为「话题→兵器映射」小节（四兵器各一行带场景），总行数少于现状；铁律节与只读姿态零变化
- 新增兵器落地：knowledge search --query（坑史检索）与 sillyspec status（在途面）进映射；graph 四命令/防复潮提示/全只读声明保留（钉子测试 explore-graph-guidance 既有断言不红）
- docs/prompt/_extract.mjs 重跑 + explore.md 逐字镜像
- 技能卡同步：调查类能力段合并为同形态映射块，frontmatter 逐字不变
- 钉子测试扩展：新兵器两断言（search/status 在场）；全量测试与 lint 零回归

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. src/stages/explore.js：操作清单原第 3/4 项（rg 一行+图谱 8 行）合并重组织为「话题→兵器映射」小节（四兵器各一行带场景），总行数少于现状；铁律节与只读姿态零变化
2. 新增兵器落地：knowledge search --query（坑史检索）与 sillyspec status（在途面）进映射；graph 四命令/防复潮提示/全只读声明保留（钉子测试 explore-graph-guidance 既有断言不红）
3. docs/prompt/_extract.mjs 重跑 + explore.md 逐字镜像
4. 技能卡同步：调查类能力段合并为同形态映射块，frontmatter 逐字不变
5. 钉子测试扩展：新兵器两断言（search/status 在场）；全量测试与 lint 零回归

## 成功标准（可验证）

1. src/stages/explore.js：操作清单原第 3/4 项（rg 一行+图谱 8 行）合并重组织为「话题→兵器映射」小节（四兵器各一行带场景），总行数少于现状；铁律节与只读姿态零变化
2. 新增兵器落地：knowledge search --query（坑史检索）与 sillyspec status（在途面）进映射；graph 四命令/防复潮提示/全只读声明保留（钉子测试 explore-graph-guidance 既有断言不红）
3. docs/prompt/_extract.mjs 重跑 + explore.md 逐字镜像
4. 技能卡同步：调查类能力段合并为同形态映射块，frontmatter 逐字不变
5. 钉子测试扩展：新兵器两断言（search/status 在场）；全量测试与 lint 零回归
