---
author: flow-machine-draft
created_at: 2026-10-19T07:38:24.187Z
---
# 需求规格（Requirements）— 2026-10-19-approve-gate-tick-nudge

## 功能需求

### FR-01: approve 硬校验：v2 轨复用 verifyThinDocsV2（须加 repair 只读开关——现状有 design.md 问题行回填写副作用，approve 不得写文件）、v1 轨复用 verifyDesignRecordFilled；design 四节空/FR 待撰写/绑定待填时 approve exit 1 并给修复指引；作答齐备时照常批准

- flow approve 在批准落盘前必须先跑文档完整性校验：v2 轨（draft-ledger 在场）调 verifyThinDocsV2、v1 轨（存量）调 verifyDesignRecordFilled；校验 violations 非空时必须 exit 1 拒绝批准，输出逐条违规与修复指引（与 flow done 同口径文案）。
- verifyThinDocsV2 必须新增 repair 只读开关（如 { repair: false }）：approve 路径调用时禁止写 design.md（问题行回填等修复副作用关闭），校验只读；done 路径默认行为不变（照常自动修复）。
- 作答齐备时 approve 必须照常写 {spec_approved, spec_approved_at, ...} 并输出既有成功面。

#### 场景：空文档过批被拒

Given v2 变更 design 四节未答（骨架）/requirements FR 仍「（待撰写」，When flow approve，Then exit 1、无 spec_approved 落盘、输出含空槽/待撰写修复指引、design.md 与 requirements.md 字节不变。

#### 场景：齐备放行

Given v2 变更四节已答+FR 行为句+绑定行齐，When flow approve --user-confirmed，Then exit 0、spec_approved_at 落盘、成功输出与现状一致。

### FR-02: 豁免与降级：adopted_from=brainstorm 豁免 design 四节（以 brainstorm design 为准，与 done 门同口径）；draft-ledger 缺失时 fail-open 放行（跨机/存量场景）；verifyThinDocsV2 校验通过但存在 advisory 时不阻断批准

- adopted_from=brainstorm 的变更 approve 时必须跳过 design 四节校验（与 done 门豁免同口径，绑定/FR 校验仍跑）；draft-ledger 缺失（跨机批准、存量变更）时校验必须 fail-open 放行并在输出标注「校验降级放行」；advisory 只警示不阻断。

#### 场景：brainstorm 收编豁免

Given adopted 变更 design 四节为空（以 brainstorm design 为准），When flow approve，Then 不因四节空拒收（绑定槽未答仍拒）。

#### 场景：ledger 缺失降级

Given 变更目录无 draft-ledger（.runtime 机本位不在此机），When flow approve，Then 放行并在输出含降级标注。

### FR-03: 共享判定上移：status 内联的「design 四节已答」判定（v1 槽/v2 节双格式）抽为可复用导出，status 与 tick 同源调用，行为零变化

- 「design 四节已答」判定（v1 AGENT 槽计数 / v2 readV2SectionAnswer 节判定双格式）必须从 flow.js status 内联逻辑抽为可导出的纯函数（建议落 flow-draft.js 或独立模块），status 与 task tick 必须同源调用该函数；status 现有输出必须逐字不变。

#### 场景：重构零变化

Given 同一 fixture，When 重构前后各跑 flow status（人类面与 --json），Then 输出逐字一致。

### FR-04: task tick 提醒：勾选回显在（design 四节未答 或 未批准且非 autopilot）时附一行「先补 spec 面/先过断点①」警示，advisory 不阻断勾选、不改变回显既有行

- task tick 成功勾选的回显必须在（design 四节未答 或 spec 未批准且非 autopilot）时附加一行警示（advisory：不阻断、不改既有行、读取失败静默）；条件不满足时回显必须与现状逐字一致。

#### 场景：未答先勾给警示

Given v2 变更 design 未答、未批准，When task tick --task task-01，Then 勾选成功（exit 0）且回显末尾含 spec 面警示行。

#### 场景：齐备静默

Given 四节已答+已批准，When task tick，Then 回显与现状逐字一致（零新增行）。

### FR-05: 测试：approve 硬拒/放行/brainstorm 豁免/repair 只读（approve 后 design.md 字节不变）/ledger 缺失放行/tick 提醒触发与静默各就位，既有 flow-status/task-tick/approve 相关测试零回归

- 新增 test/approve-gate-tick.test.mjs 覆盖 FR-01~04 全场景；既有 flow-status-json/flow-status-heartbeat/task-tick/check-approval-status 等测试必须零回归。

#### 场景：全量回归

Given 本变更合入，When 跑既有相关测试与新增测试，Then 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/approve-gate-tick.test.mjs「approve 硬拒（空文档/未答绑定）与齐备放行、approve 只读（design.md 字节不变）」
FR-02: test/approve-gate-tick.test.mjs「brainstorm 豁免与 ledger 缺失 fail-open 降级标注」
FR-03: test/approve-gate-tick.test.mjs「status 重构前后输出逐字一致（快照对比）」
FR-04: test/approve-gate-tick.test.mjs「tick 警示触发与齐备静默」
FR-05: 不适用：全量回归面——由 flow done 实测门亲自执行覆盖（动态面含 flow-status/task-tick 既有锚）
