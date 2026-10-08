---
author: flow-machine-draft
created_at: 2026-10-08T17:29:00.160Z
---
# 需求规格（Requirements）— 2026-10-09-explore-arsenal-map

## 功能需求

### FR-01: src/stages/explore.js：操作清单原第 3/4 项（rg 一行+图谱 8 行）合并重组织为「话题→兵器映射」小节（四兵器各一行带场景），总行数少于现状；铁律节与只读姿态零变化

- 操作清单必须以「话题→兵器映射」小节承载调查兵器（四行：词面考古 rg / 坑史检索 search / 关系面 graph / 在途面 status），映射节行数必须少于被替换的原第 3/4 项合计；铁律节必须逐字零变化。

#### 场景：映射面

- Given 修改后的 prompt；When 渲染；Then 映射节在场（含节标题「话题→兵器映射」与全只读声明），铁律四条逐字在场。

### FR-02: 新增兵器落地：knowledge search --query（坑史检索）与 sillyspec status（在途面）进映射；graph 四命令/防复潮提示/全只读声明保留（钉子测试 explore-graph-guidance 既有断言不红）

- knowledge search --query 与 sillyspec status 必须进映射（各带一句场景）；graph 四命令（impact/neighbors/path/summary）、防复潮提示（rejected/⚰️死路不重新兜售）、全只读声明必须保留。

#### 场景：兵器齐备

- Given prompt 全文；Then 六兵器锚串全部在场（钉子测试断言口径）。

### FR-03: docs/prompt/_extract.mjs 重跑 + explore.md 逐字镜像

- explore.md prompt 正文块必须与 _extract.mjs 产物逐字一致（机械镜像纪律）。

#### 场景：镜像对账

- Given 重跑提取；Then 围栏内文本 === _extracted.json 的 explore.steps[0].prompt。

### FR-04: 技能卡同步：调查类能力段合并为同形态映射块，frontmatter 逐字不变

- 技能卡调查类能力段必须合并为同形态映射块；frontmatter name/description 必须逐字不变（触发词面零变化）。

#### 场景：技能卡

- Given 更新后 SKILL.md；Then 映射块在场且 frontmatter 与更新前一致。

### FR-05: 钉子测试扩展：新兵器两断言（search/status 在场）；全量测试与 lint 零回归

- 钉子测试必须扩至断言 search/status 两新兵器在场；全量测试必须绿、lint 必须零告警。

#### 场景：回归面

- Given 全部落盘；When 全量测试与 lint；Then 零失败零新告警。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/explore-graph-guidance.test.mjs「explore 话题→兵器映射：graph 四命令 + search/status 新兵器 + 防复潮提示在场」（节标题/全只读断言）
FR-02: test/explore-graph-guidance.test.mjs「explore 话题→兵器映射：graph 四命令 + search/status 新兵器 + 防复潮提示在场」
FR-03: 不适用：镜像文档由 docs/prompt/_extract.mjs 机械生成（脚本回验断言逐字一致），无独立测试文件面
FR-04: 不适用：技能卡为 init 拷贝源静态文档，frontmatter 不变由本变更 diff 自证（正文块替换不触 frontmatter）
FR-05: test/explore-graph-guidance.test.mjs「explore 只读铁律零漂移（兵器扩展不破界）」+ test:core 325 全绿与 lint 零告警（verify-runs 留档）
