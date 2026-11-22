---
author: flow-machine-draft
created_at: 2026-11-21T58:13.036Z
---
# 需求规格（Requirements）— 2026-11-22-knowledge-vocab-channel

> spec 源：吸收工作树 to-spec 产出（.claude/worktrees/matt-absorb/.scratch/mattpocock-absorb/spec.md，用户已确认接缝）；差距矩阵 T1（ROADMAP 批 4）。

## 功能需求

### FR-01: 词汇文件存在时阶段级与 Wave 级注入均恒带词汇基准段（旁路：不进三层匹配/不占 top-3 名额/不进命中分母）

- knowledge 目录存在词汇文件（约定名 `knowledge/glossary.md`）时，阶段级注入（buildKnowledgeInjection）与 Wave 级注入（buildWaveKnowledgeSection）的输出段**必须**恒含词汇基准段——**必须**不依赖任何 query 匹配（不进路由 tag/词片/停车场三层），**禁止**挤占既有 top-3 命中名额或进入命中分母统计。
- 词汇段形态：独立小节（与「📚 命中知识」段并列），含术语+定义行，置于注入 section 内固定位置。
- 词汇文件格式**必须**简单可维护：markdown 术语行式（`## 术语`/`定义` 或行式 `术语：定义`，实现时定一种并写入模块文档），单文件单一源。

#### 场景：主路径（词汇在场恒注入）
Given knowledge/glossary.md 存在且含 ≥1 条术语 / When 分别调用阶段级与 Wave 级注入（query 零命中词汇的任意串） / Then 两个输出段均含词汇基准段，且既有命中知识段（如有）内容不变。

#### 场景：旁路不占名额
Given 词汇文件存在且既有匹配命中 top-3 / When 注入 / Then 命中文件清单与无词汇文件时逐字一致（词汇段为纯新增，不改写命中面）。

### FR-02: 词汇文件缺失静默跳过（零告警零注入），既有注入行为零回归（既有测试零修改即绿）

- 词汇文件不存在时**必须**静默跳过：零告警、零注入、注入输出与改动前逐字一致（proceed silently——消费端纪律，绿地/轻量仓零仪式成本）。
- 既有知识注入行为**必须**零回归：既有测试（knowledge-inject/knowledge-match 相关族）**必须**零修改即绿。

#### 场景：缺失静默
Given knowledge 目录无 glossary.md / When 阶段级/Wave 级注入 / Then 输出与基线（本次改动前）逐字一致，无 console.warn。

### FR-03: 词汇段行数上限截断+超限一次留痕；遥测词汇注入独立 type 与检索命中可区分

- 词汇段**必须**有行数上限（缺省值实现时定，写入模块文档）：超限**必须**截断并以一次性留痕提示（console.warn 一次，非每步重复刷屏）。
- 遥测（hits.jsonl）中词汇注入**必须**记独立 type（如 `vocab-inject`），与既有检索命中 type **必须**可区分；词汇注入**禁止**计入 matched 分母。

#### 场景：截断与留痕
Given 词汇文件超出上限行数 / When 注入 / Then 词汇段恰为上限行数，console.warn 出现一次且含「截断」提示。

### FR-04: 决策记录提示面含 ADR 三条件（难逆+无上下文会惊讶+真权衡，缺一跳过）

- 执行期决策记录提示段（stages 内 decisions add 指引段）**必须**含 ADR 三条件提示：难逆（改主意成本高）+无上下文会惊讶+真权衡（有真替代品），缺一**建议**跳过记录——提示词纪律，不设机器硬拦（三条件是语义判断，机器判不了）。

#### 场景：提示在场
Given 渲染决策指引段 / When prompt 组装 / Then 段内含三条件关键措辞（难逆/惊讶/权衡），金档再生后 docs/prompt 镜像一致。

### FR-05: 新增单测覆盖旁路行为（在场/缺失/截断/不挤占 top-3）跑绿

- 新增 `test/knowledge-vocab-channel.test.mjs` **必须**覆盖：词汇在场恒注入（阶段级+Wave 级）、缺失静默零回归、行数上限截断+一次留痕、不挤占 top-3、遥测独立 type；**必须**全部跑绿。

#### 场景：单测全绿
Given 全部新用例 / When 运行测试 / Then 全部通过 exit 0；既有 knowledge 注入相关测试零修改即绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-vocab-channel.test.mjs「词汇在场恒注入（阶段级+Wave 级）+不挤占 top-3」
FR-02: test/knowledge-vocab-channel.test.mjs「缺失静默零回归」+ 既有 test/knowledge-inject.test.mjs 零修改即绿（回归线）
FR-03: test/knowledge-vocab-channel.test.mjs「行数上限截断+一次留痕+遥测独立 type」
FR-04: docs/prompt 金档再生一致性（命令面验收）——不适用单测：提示词文本改动，验收靠金档镜像与 _extracted.json 对比
FR-05: test/knowledge-vocab-channel.test.mjs「全量用例跑绿 exit 0」
