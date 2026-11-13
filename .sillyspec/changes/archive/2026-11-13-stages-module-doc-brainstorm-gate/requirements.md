---
author: flow-machine-draft
created_at: 2026-11-13T14:00:11.631Z
---
# 需求规格（Requirements）— 2026-11-13-stages-module-doc-brainstorm-gate

## 功能需求

### FR-01: stages 模块卡含 2026-11-13-brainstorm-solution-constraint-gate 注记节，内容与 src/stages/brainstorm.js「提出 2-3 种方案」prompt 一致

- 模块卡 `.sillyspec/docs/sillyspec/modules/stages.md` 必须包含 `2026-11-13-brainstorm-solution-constraint-gate` 注记节，且其中硬约束准入、单方案如实上报、冲突处理、自检表四条规则必须与 `src/stages/brainstorm.js` 方案步 prompt 的实际文案一致。

#### 场景：模块卡与源码对表

- Given 方案步 prompt 已含 C1..Cn 准入与禁凑数规则
- When 阅读 stages 模块卡注记节
- Then 四条规则描述与源码逐条对应，无缺项、无相反描述

### FR-02: 模块卡头部 updated_at 更新为 2026-11-13

- 模块卡头部 frontmatter 的 `updated_at` 必须更新为 `2026-11-13` 日期值。

#### 场景：时间戳

- Given 模块卡内容有变更
- When 检查 frontmatter
- Then `updated_at` 为 `2026-11-13T00:00:00+08:00`

### FR-03: 文档改动随变更提交入库（显式 pathspec）

- 文档改动必须用显式 pathspec 提交（禁止目录级 add / 裸 commit），且提交消息带本变更任务 token。

#### 场景：提交面核对

- Given 文档改动已完成
- When 提交
- Then `git diff --cached --name-only` 仅含本变更声明文件，无并行会话残留

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯模块文档改动，验收靠与 src/stages/brainstorm.js 方案步 prompt 逐条对表
FR-02: 不适用：纯 frontmatter 时间戳改动，验收靠文件头检查
FR-03: 不适用：提交纪律由收口提交面核对与 docs-check 门覆盖
