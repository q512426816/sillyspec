---
author: flow-machine-draft
created_at: 2026-10-22T16:53:52.764Z
---
# 需求规格（Requirements）— 2026-10-23-flow-verify-drafts

## 功能需求

### FR-01: flow verify-drafts 只读自查（与批准门同判定同源）

- `sillyspec flow verify-drafts --change <名>` 必须以只读方式运行 spec 面完整性校验（verifyFlowDrafts `repair:false` 双轨：v2 文档↔锚对比 / v1 指纹+空槽兜底——与 flow approve 批准门同判定同源单一源），禁止写入任何变更文件（design.md/requirements.md/flow-state.yaml 等字节不变）；violations 非空时必须 exit 1 且一次列出全部违规与修复指引；全部通过必须 exit 0。

#### 场景：骨架未答自查

Given flow start 后 v2 骨架未作答（design 四节空、FR 待撰写、绑定待填）；When 运行 `flow verify-drafts --change <名>`；Then exit 1、输出一次列出全部违规与修复指引、变更目录内文件字节不变。

#### 场景：答齐通过

Given 四节/FR 行为句/绑定行全部答齐；When 运行同命令；Then exit 0、输出通过行与批准指引、零写盘。

### FR-02: --json 结构化输出与人类渲染同判定同退出码

- `--json` 必须输出结构化单对象 `{change, applicable, schema, violations, advisories, skipDesign, degraded, v1EmptySlots, passed}`，与人类渲染路径同判定、同退出码（通过 0 / violations 1 / 用法错与变更缺失 2）——对齐 flow status --json 的双态同源先例。

#### 场景：fail 态 JSON

Given 骨架未答；When 运行 `flow verify-drafts --change <名> --json`；Then stdout 为可解析单对象、violations 非空、passed 为 false、exit 1。

### FR-03: 错误路径与 approve 零变化

- 变更目录不存在或变更名非法必须 exit 2 且文案给出去路（先 flow start）；flow approve 既有输出与退出码必须零变化——批准门校验块抽为共享单一源后，approve-channel-attest / approve-gate-tick 既有测试必须零改动全绿（作为回归锚）。

#### 场景：变更缺失

Given 指定变更目录不存在；When 运行 verify-drafts；Then exit 2、文案指向 flow start。

### FR-04: flow start 横幅断点① 增起草自查指引

- flow start 全新横幅「三断点纪律① spec 断点」块必须包含一行起草自查指引：起草完先 `sillyspec flow verify-drafts --change <名>` 自查、通过再请用户批准（agent 零撞门学习）。

#### 场景：横幅指引行

Given 全新 flow start 渲染；Then 断点① 块输出含 `flow verify-drafts` 字样的自查指引行。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-verify-drafts.test.mjs「①骨架未答 exit1 全列+零写盘」「②答齐 exit0 通过行」
FR-02: test/flow-verify-drafts.test.mjs「③--json 同判定同退出码」
FR-03: test/flow-verify-drafts.test.mjs「④missing/非法 exit2」＋test/approve-gate-tick.test.mjs「①-③ approve 回归锚零改动全绿」
FR-04: test/flow-verify-drafts.test.mjs「⑤start 横幅断点①含自查指引行」
