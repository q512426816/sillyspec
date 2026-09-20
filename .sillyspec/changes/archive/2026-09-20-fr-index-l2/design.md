---
author: zcode-fr-l2
created_at: 2026-09-20 07:25:17
generated_by: sillyspec-design-init
scale: small
---

# 设计文档（Design）— 2026-09-20-fr-index-l2

## 背景

fr-index L1（2026-09-18）条目只有 id+标题+场景名——对撞实验实证这是资产轴缺口：OpenSpec 归档 15 分钟出 14 条可验证行为承诺，且其 requirement 可回溯；L1 的行为条目跳不到「依据/否决了哪些决策」，翻案场景（防复潮）断头。

## 设计目标

1. 每条 active FR 机读其依据决策集（D→FR 从决策覆盖矩阵自动提取）。
2. 域文件头显式模块卡指针（同构关系显式化）。
3. 既有解析零破坏（加法式字段），存量条目不回填。

## 非目标

- GWT 正文入库（D-003 缓做，退役判据=消费方证需求）。
- 承接链/取代/D14/软门语义改动。
- 存量条目回填（幂等索引下个归档自然带新字段）。
- D→FR 反向索引文件。

## 拆分判断

三件同属 knowledge/fr 机械解析契约的一次加法式扩展，单变更承载。

## 总体方案

**Phase 1 解析与写入**：src/fr-index.js 的 parseChangeRequirements 增决策覆盖矩阵解析（requirements.md 尾表行 `| D-xxx@vN | FR-01, FR-02 |` 提取 D→FR-NN 映射，按 local 号挂到 FR 块的 decisions 字段）；indexRequirements 条目写「依据决策：D-001@v1、D-002@v1」行（无矩阵/无命中省略该行）；domain 文件头 blockquote 加「模块卡：modules/<域>.md」。

**Phase 2 消费**：readActiveFrDigest 增 decisions 数组；brainstorm step8 注入渲染条目附 D 锚（渲染点按实际代码定位：{FR_INDEX_DIGEST} 的组装处）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/fr-index.js | parse 矩阵（decisions 字段）+ 条目「依据决策：」行 + 文件头模块卡指针 + digest.decisions |
| 修改 | src/run/prompt.js | {FR_INDEX_DIGEST} 渲染条目附 D 锚（每条截前 3 个 D id；渲染点若在 stages/brainstorm.js 则改彼处，以实读为准） |
| 新增 | NEW:test/fr-index-l2.test.mjs | 矩阵解析 / 条目行 / digest.decisions / 指针行 / 无矩阵省略 五组断言 |

## 接口定义

parseChangeRequirements 返回的 frs[i] 增 decisions: string[]（D-xxx@vN 形态，取自决策覆盖矩阵的 FR 列命中）；readActiveFrDigest 条目增 decisions: string[]；knowledge/fr 条目新增行「依据决策：D-001@v1、D-002@v1」——机械解析契约 v1.1（加法式：旧条目无此行照常解析，digest.decisions=[]）。

## 生命周期契约表

本设计不涉及生命周期契约——归档管线 noAI 步的纯函数扩展，无 session/lease/状态转移语义。

## 数据模型

无 schema 变更（不触 db；knowledge/fr 文本契约加法式扩展）。

## 兼容策略（brownfield 必填）

旧条目无「依据决策」行：digest decisions=[]（消费方按空处理）；解析器按前缀读行容忍缺行。矩阵格式漂移解析空 → 降级省略行不阻断归档（fr-inject 遥测可见）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 矩阵格式漂移解析空 | P3 | 降级省略行（不阻断归档）；fr-inject 遥测可见 |
| R-02 | 注入体积膨胀 | P3 | decisions 每条截前 3 个 D id |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 / Phase 1-2 | 已落实 |
| D-002@v1 | FR-02 / Phase 1 | 已落实 |
| D-003@v1 | FR-03 / 非目标 | 已落实 |

## 自审

- [x] 章节齐全
- [x] frontmatter 齐全（scale: small）
- [x] 引用全部 D-xxx@vN（D-001~D-003）
- [x] 生命周期豁免短语在节内
- [x] UI 原型跳过（纯 CLI）
- [x] 无存疑项
