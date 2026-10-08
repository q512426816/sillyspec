---
author: flow-machine-draft
created_at: 2026-10-08T08:12:53.293Z
---
# 需求规格（Requirements）— 2026-10-08-batch-tick-false-positive

## 功能需求

### FR-01: watcher.inferEvents：非 tasks 阶段文件（design.md 形态）首现带预勾框不再发 task-done；tasks.md 首现带已勾格仍发（保住「tasks.md 整卡预勾创建」的真实捕捉面）

- 文件首现（`!p && n`）的 task-done 事件必须只对任务队列面（stage='tasks'：tasks.md 与 tasks/*.md）发射；其余阶段文件（design.md 自审清单等 authored-whole 预勾形态）首现只报 `file` 事件，禁止发 task-done。

#### 场景：design.md 整体写盘

- Given watcher 快照无 design.md；When 下一拍 design.md 出现且含 8 个预勾 `- [x]`（自审 authored-whole）；Then 只产 1 条 `file`（stage=design）事件，零 task-done。

#### 场景：tasks.md 整卡预勾创建

- Given 快照无 tasks.md；When tasks.md 出现且已勾 3 格；Then 产 `file` + `task-done（checked 0→3）`——捕捉面保留。

### FR-02: detectBatchCheckCadence 只消费 stage='tasks' 事件（纵深防御）；混流（design 0→8 + 六次独立 tick）判无单拍跳；tasks 段无 CLI 覆盖的单拍大跳仍可检出

- 节奏检测域必须限定 stage='tasks'（缺省 stage 视同 tasks 兼容 legacy 流）；其他阶段的 task-done 事件必须出域。既有能力不回归：tasks 段单拍 0→8（无 CLI 覆盖）仍检出、CLI 精确事件去重行为不变、resolveBatchTickAction 四态不变。

#### 场景：误伤回归（真实事故流）

- Given 2026-10-08-knowledge-graph 归档事件流（47 条，含 stage=design 的 checked 0→8 幻影 + 六次独立 source=task-tick 事件）；When detectBatchCheckCadence 执行；Then 返回 null。

#### 场景：真实单拍仍可检出

- Given 仅一条 stage=tasks 的 checked 0→8（无 CLI 事件）；When 检测；Then 返回 {from:0,to:8} 证据记录。

### FR-03: 既有 watcher/sentinel 相关测试全绿 + 新增误伤场景回归测试

- watcher/sentinel-rules/batch-tick-gate/task-tick 四测试文件必须全绿；test:core 全量与 lint 零回归。旧契约「design 阶段同判（STAGE_FILES 双工件面）」随本变更退役——前提被实证证伪（自研清单按模板即 authored-whole 预勾，非逐格勾选面）。

#### 场景：回归面

- Given 修复落盘；When `node --test test/watcher.test.mjs test/sentinel-rules.test.mjs test/batch-tick-gate.test.mjs test/task-tick.test.mjs` 与 `npm run test:core` + `npm run lint`；Then 全绿零新告警。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/watcher.test.mjs「inferEvents: 非任务面首现预勾不发 task-done；tasks.md 首现带勾仍发（2026-10-08-batch-tick-false-positive）」
FR-02: test/sentinel-rules.test.mjs「节奏 误伤回归：design 首现 0→8 + 六次独立 tick 混流 → null（2026-10-08 实证流）」
FR-02: test/sentinel-rules.test.mjs「节奏 正例：单拍 0→8 返回证据记录（字段完整）」
FR-02: test/sentinel-rules.test.mjs「节奏 单任务变更 0→1 不判；design 阶段出域（契约刷新 2026-10-08-batch-tick-false-positive）」
FR-03: test/batch-tick-gate.test.mjs「② 硬门接线钉：拒收出口 + 旁路旗标 + 降级面」
FR-03: test/task-tick.test.mjs「（CLI 精确事件生成面回归——detectBatchCheckCadence 消费契约不变）」
