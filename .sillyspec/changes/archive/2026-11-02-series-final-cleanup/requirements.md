---
author: flow-machine-draft
created_at: 2026-11-02T15:00:00.000Z
---
# 需求规格（Requirements）— 2026-11-02-series-final-cleanup

## 功能需求

### FR-01: 底稿资格门：knowledge-match.js 的 deathPath 判定跳过模板标题条目（设计期风险与放弃方案/风险与死路/底稿特征词——它们是 process 级流程取舍非真否决，标 deathPath 会占防复潮席位且使 4D 模板清零条件永不可满足）；测试锁「模板标题不获 deathPath，真否决仍正常获得」

knowledge-match.js 的 deathPath 判定必须跳过模板标题条目（标题或理由匹配底稿特征词：设计期风险与放弃方案/风险与死路/design 槽4 收割/底稿）；真否决条目（标题不含模板特征词）的 deathPath 赋值必须不受影响。测试必须锁「模板标题+死路理由 → 不获 deathPath；非模板标题+死路理由 → 正常获得」。

#### 场景：模板不占席位

Given 条目标题为「设计期风险与放弃方案（底稿）」且理由含「死路：」
When parseDecisionEntries
Then deathPath 为 false（不占防复潮席位）

#### 场景：真否决不受影响

Given 条目标题为「方案 B 否决」且理由含「死路：某工具不兼容」
When parseDecisionEntries
Then deathPath 为 true（正常进入防复潮可达集）

### FR-02: 存量红修复入库：AGENTS.md 规则4 与模板逐字一致 + brainstorm-auto-retire maxBuffer 8MB

AGENTS.md 规则 4 必须与 templates/agents-instruction.md 逐字一致（同步 metrics/metrics_routes 句）；brainstorm-auto-retire.test.mjs 的 git 命令必须显式设 maxBuffer ≥ 8MB。

#### 场景：两文件逐字一致

Given test-runner-failed-face ③ 断言规则 4 两文件逐字一致
When 跑测试
Then 全绿

### FR-03: 4D 推迟决策补录：decisions add D-001 记「unmapped 降权参与推迟——模板底稿不清零不解禁；复潮条件：底稿资格门落地且停车场真实残量 ≤5/条」

必须以 decisions add 记录 4D 推迟决策（含复潮条件字段），禁止只活在 proposal 叙事里。

#### 场景：决策在场

Given 变更完成
When 读 decisions.md
Then D-001 含推迟理由与复潮条件

### FR-04: parseFlowArchiveEntries 注记：文件头注记「归档检索源已由 scope 两跳（knowledge-graph）替代——本函数仅缓存测试消费，非活检索面接线点」

src/knowledge-quicklog.js 的 parseFlowArchiveEntries 头注必须注记替代关系（scope 两跳已覆盖归档变更可达性，本函数仅 hotpath 测试消费）。

#### 场景：注记在场

Given 变更完成
When 读 knowledge-quicklog.js parseFlowArchiveEntries JSDoc
Then 含替代注记

### FR-05: 验收：全量 npm test 零红（含两个存量红修复）+ eval 六探针 GREEN + lint 绿

验收必须全绿：全量 npm test 零红、eval 六探针 GREEN、lint 通过。

#### 场景：全量零红

Given 两个存量红已修
When npm test
Then 零 fail

## 测试绑定（每条 FR 至少一行——「FR-NN: test/路径「用例名」」；空行/待填在 flow done 拒收）

FR-01: test/knowledge-rank-denoise.test.mjs「底稿资格门（模板标题不获 deathPath）」
FR-02: test/test-runner-failed-face.test.mjs「③ AGENTS 双文件自验口径句逐字一致」+ test/brainstorm-auto-retire.test.mjs「③ 现行文件零悬挂引用」
FR-03: 不适用：决策文档补录（无代码行为面）
FR-04: 不适用：JSDoc 注记（无代码行为面）
FR-05: test/test-runner-failed-face.test.mjs + test/brainstorm-auto-retire.test.mjs 回归
