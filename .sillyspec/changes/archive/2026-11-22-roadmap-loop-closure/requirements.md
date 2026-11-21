---
author: flow-machine-draft
created_at: 2026-11-21T23:14:17.997Z
---
# 需求规格（Requirements）— 2026-11-22-roadmap-loop-closure

## 功能需求

### FR-01: 不抄清单与拒绝概念沉淀为 knowledge 可检索条目（decision/gotcha 域，INDEX 路由行齐），sillyspec knowledge search "<关键词>" 可命中

- 拒绝概念必须通过变更内 decisions.md 记 D 条目（D-001 拒绝 mattpocock 全量照搬流程形态、D-002 路线资产位置裁决：归 .sillyspec/ 工具工作区），收口 distill 必须自动蒸馏进 knowledge decisions 域；收口后 `sillyspec knowledge search "<mattpocock/全量照搬/ROADMAP 位置>"` 类关键词必须可命中否决记录（防复潮闭环=机器检索注入，不再依赖死文档）。

#### 场景：主路径

- Given 后续会话提议全量照搬 mattpocock 流程形态或把路线文件放项目 docs/
- When knowledge 命中注入
- Then D-001/D-002 否决记录自动进 prompt，一句引用关掉

### FR-02: ROADMAP 迁移至 .sillyspec/docs/sillyspec/ROADMAP.md 并新增「状态」列，批 0-3a 如实回写「已归档（提交号）」

- ROADMAP 必须从 docs/ROADMAP.md 迁移至 `.sillyspec/docs/sillyspec/ROADMAP.md`（工具工作区，与 scan 文档同域）；批次表必须新增「状态」列，批 0/1/2/3a 必须如实回写「已归档」与归档提交号；后续批次保持「待立项」原状。

#### 场景：主路径

- Given 读者查看路线
- When 读批次表状态列
- Then 已完成批次与待立项批次一目了然，路线与事实一致

### FR-03: 删除 docs/ROADMAP.md 与 docs/sillyspec/out-of-scope/（内容已 knowledge 化，不留死文档）

- 迁移与 knowledge 化完成后，必须删除 `docs/ROADMAP.md` 与 `docs/sillyspec/out-of-scope/`（README+首个被拒概念文件）——内容已由 knowledge 决策条目与工作区 ROADMAP 承载，禁止留双源死文档。

#### 场景：主路径

- Given knowledge 化与迁移完成
- When 检索项目 docs/
- Then 不存在无人消费的路线/拒绝概念副本

### FR-04: CLAUDE.md 中「记录到 docs/（troubleshooting.md / ROADMAP / quicklog）」指引句修正为工作区路径与 knowledge 通道

- 根 `CLAUDE.md` 与 `.claude/CLAUDE.md` 两份指引中的第 18 条（「记录到 `docs/`（troubleshooting.md / ROADMAP / quicklog）」）必须修正为：缺陷/改进点记 `docs/troubleshooting.md`（人读故障排查）或 knowledge（decisions/gotcha，机器检索防复潮）；路线/规划类资产归 `.sillyspec/docs/sillyspec/ROADMAP.md`（工具工作区）；quicklog 通道已退役不再列名。

#### 场景：主路径

- Given 未来 agent 要落盘路线或否决概念
- When 读指引
- Then 直接走向 knowledge/工作区通道，不再产生项目 docs/ 死文档

### FR-05: 归档件（审计事实）不追改

- 已归档变更（批 0/批 1 等）的归档件中对 docs/ROADMAP.md 的历史引用必须保持原状（归档件是审计事实，仓则不追改）；仅活文档与指引修正。

#### 场景：主路径

- Given 归档件内出现旧路径引用
- When 审计查阅
- Then 历史事实未被改写（路径漂移由本变更 D-002 留痕解释）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：knowledge 蒸馏由收口 distill 机器承担，验收靠收口后 knowledge search 实测命中
FR-02: 不适用：纯文档迁移与状态回写，验收靠收口 diff 核对状态列与提交号
FR-03: 不适用：纯文档删除，验收靠收口 diff 核对删除面
FR-04: 不适用：纯指引文案修正，验收靠收口 diff 核对两份 CLAUDE.md 同步
FR-05: 不适用：约束性条款（零改动），验收靠收口 diff 核对无归档件变更
