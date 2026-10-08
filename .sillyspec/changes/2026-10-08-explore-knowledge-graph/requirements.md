---
author: flow-machine-draft
created_at: 2026-10-08T16:24:25.004Z
---
# 需求规格（Requirements）— 2026-10-08-explore-knowledge-graph

## 功能需求

### FR-01: src/stages/explore.js 操作清单含知识图谱查询项：影响面/历史决策/需求谱系类话题优先 graph 命令（impact/neighbors/path/summary 用例与场景各一句），并声明只读姿态不变（graph 命令全只读）

- explore 阶段 prompt 操作清单必须包含知识图谱查询项（impact/neighbors/path/summary 四命令与典型场景各一句、声明全只读、比较方案前先查 rejected/死路条目）；铁律节必须保持只读姿态（不新增任何写面）。

#### 场景：渲染面

- Given 修改后的 stages/explore.js；When `sillyspec run explore` 渲染 prompt；Then 操作清单含四命令指引与防复潮提示，铁律节零变化。

### FR-02: docs/prompt/_extract.mjs 重跑后 explore.md prompt 正文与 _extracted.json 逐字一致（机械提取保真纪律）

- docs/prompt/explore.md 的 prompt 正文块必须与 `node docs/prompt/_extract.mjs` 产出的 _extracted.json 中 explore step prompt 逐字一致（机械镜像，禁止人工改写）。

#### 场景：镜像对账

- Given 重跑提取脚本；Then explore.md 围栏内文本 === _extracted.json 的 explore.steps[0].prompt（脚本回验断言通过）。

### FR-03: .claude/skills/sillyspec-explore/SKILL.md 补「知识图谱查询」能力段（何时用/用哪些命令/防复潮提示）

- 技能卡必须在「你可以做的事」节补知识图谱查询能力段：何时用（影响面/历史决策/需求谱系话题）、四命令一览、防复潮提示（已否决的路不重新兜售）；description 触发词面禁止变化（不改变技能触发行为）。

#### 场景：技能卡

- Given 更新后的 SKILL.md；Then 能力段在场且 frontmatter name/description 与更新前逐字一致。

### FR-04: 全量测试与 lint 零回归（output-step-render 等钉 explore prompt 的测试面核对）

- 既有测试必须全绿（output-step-render / cli-top-level-aliases 等钉 explore 面）、test:core 全量绿、lint 零告警。

#### 场景：回归面

- Given 全部落盘；When 全量测试与 lint；Then 零失败零新告警。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/output-step-render.test.mjs「explore 阶段渲染回归（prompt 结构与铁律面零变化）」+ `node src/index.js run explore` 渲染冒烟（graph 指引四命令在场）
FR-02: 不适用：镜像文档由 docs/prompt/_extract.mjs 机械生成并对账（脚本回验断言），无独立测试文件面
FR-03: 不适用：技能卡是 init 拷贝源的静态文档（无运行时消费面），description 不变由本变更 diff 自证
FR-04: test:core 321 全绿 + npm run lint 零告警（verify-runs 留档）
