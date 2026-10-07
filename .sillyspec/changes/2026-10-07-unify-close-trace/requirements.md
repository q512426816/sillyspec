---
author: flow-machine-draft
created_at: 2026-10-07T15:27:48.775Z
---
# 需求规格（Requirements）— 2026-10-07-unify-close-trace

## 功能需求

### FR-01: flow done（thin）收尾后变更目录四件齐备：change.patch/change-patch.json（既有语义不变——files 含治理工件目录、totals 口径不变）+ scope-audit.json/scope-audit.patch（新增：三态行含 verdict、baseAnchor=baseline、closedBy=flow done）

- flow done 的 patch 留档子步**必须**经共用写函数一次落齐四件：既有沉淀资产面 change.patch + change-patch.json 的键结构与口径（files=ownFiles 含治理工件目录、totals、moduleScope 三键、note、baseline/head）**禁止**变化；新增对账快照面 scope-audit.json（mode/ok/baseAnchor=st.baseline_commit/totals/rows/excluded/note/closedBy='flow done'/patchSha256/patchStatus/savedAt）与 scope-audit.patch（与 change.patch 同文）。三态行**必须**由 ownFiles 过 filterDeliverableFiles × design 清单 pathMatches 判定（planned/unplanned/untouched 补行，与 scope-audit 主链路同款语义）。

#### 场景：thin 收尾四件齐备

- Given：thin 变更走 flow done 至 patch 留档子步
- When：留档完成
- Then：变更目录有 change.patch、change-patch.json、scope-audit.json、scope-audit.patch 四件；快照 rows 含 verdict 三态且治理工件目录文件不在 rows；两 patch 字节一致

### FR-02: execute --done（heavy）收尾后同样四件齐备：scope-audit.json/patch（既有语义不变）+ change-patch.json/change.patch（新增：files=主仓实改行投影、baseline=快照锚、head=当点 HEAD）

- printExecuteScopeAudit **必须**经同一共用写函数落盘：既有 scope-audit.json/scope-audit.patch 形态（快照结构、note、fail-soft 不阻断、归档竞态目录判定）**禁止**变化；新增 change-patch.json（change/baseline=snap.baseAnchor/head=当点 HEAD/files/totals/savedAt/patchSha256/patchStatus）与 change.patch（与 scope-audit.patch 同文）。files 与 totals **必须**是主仓实改行投影（planned+unplanned 行；untouched 0/0 声明行与 crossRepo 行不入）。

#### 场景：heavy 收尾四件齐备

- Given：full-flow 变更 execute --done 完成
- When：范围快照落盘
- Then：变更目录四件齐备；change-patch.json.files ⊆ 快照主仓实改行路径，totals 与该行集合计一致

### FR-03: 同一次收尾的四件 sha256 同锚：change.patch 与 scope-audit.patch 字节一致，两份 json 的 patchSha256 相同

- 共用写函数**必须**对同一 patchText 只算一次 sha256 并写进两份 json（LF 归一口径，与既有 sha256PatchNormalized 同式）；patchText 为空/null 时**必须**双套同标 patchStatus=failed 且不落 patch 文件（heavy 旧「空串当 ok」形态收口为 failed）。

#### 场景：同锚与失败留痕

- Given：任一通道收尾，patch 采集成功/失败两态
- When：写函数执行
- Then：成功态两 patch 同字节、两 json 同 hash；失败态两 json 同标 failed、无 patch 文件

### FR-04: 读面双路径验证：新 thin 归档查 scope-audit 走快照记录态（note 标 flow done 时点，不再误标 execute --done）；重跑 flow done（漂移重冻结）不自嵌入（scope-audit.json/patch 进排除面）

- 快照回放 note **必须**按快照 closedBy 标注收尾通道（缺省 'execute --done' 兼容旧快照）；flow done 的冻结面收集（ownFiles 过滤与治理工件目录切分）**必须**排除 scope-audit.json/scope-audit.patch（与 change.patch/change-patch.json 同档），防重跑自嵌入。

#### 场景：新 thin 归档查询与重跑

- Given：thin 变更归档后（含快照）查询 scope-audit；此后处置重入重跑 flow done 触发重冻结
- When：查询 / 重冻结
- Then：出快照记录态表（note 含「flow done 时点冻结快照」）真实三态；重冻结后 change.patch 不含 scope-audit.json/scope-audit.patch 段、meta.files 不含这两件

### FR-05: 全量测试绿（含新增 writer 单测/round-trip/双通道 CLI 夹具）；既有断言零改动（flow-protocol 归档双件断言原样）

- 本变更**必须**新增测试覆盖：writeCloseTraceArtifacts 单测（ok/failed 两态）、写读 round-trip（writer 产物 → computeChangeScopeAudit 快照回放）、thin CLI e2e（flow done 后四件齐备 + 查询走快照态）；既有测试断言**禁止**改动（flow-protocol 归档双件与「变更 patch 留档」字样断言原样绿）。

#### 场景：全量门

- Given：新增 test/close-trace-unified.test.mjs 入套
- When：npm test
- Then：全量绿，既有断言零改动

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/close-trace-unified.test.mjs「writer 单测：四件齐备/同锚/失败留痕 + buildThinSnapshotRows 三态行」
FR-01: test/close-trace-unified.test.mjs「thin CLI e2e：flow done 后四件齐备，快照 rows 三态、治理工件不进 rows」
FR-02: test/close-trace-unified.test.mjs「heavy 夹具：printExecuteScopeAudit 通道 change-patch.json=主仓实改行投影（经 CLI execute --done 或等价驱动）」
FR-03: test/close-trace-unified.test.mjs「同锚断言：change.patch≡scope-audit.patch、两 json patchSha256 相等；failed 双标」
FR-04: test/close-trace-unified.test.mjs「round-trip：writer 产物 → computeChangeScopeAudit 快照回放 note=closedBy；重冻结不自嵌入」
FR-05: test/run-tests.mjs「全量套件跑绿，既有断言零改动」
