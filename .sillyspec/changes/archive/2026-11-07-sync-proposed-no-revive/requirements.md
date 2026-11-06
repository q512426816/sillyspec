---
author: flow-machine-draft
created_at: 2026-11-06T16:41:53.102Z
---
# 需求规格（Requirements）— 2026-11-07-sync-proposed-no-revive

## 功能需求

### FR-01: 服务器 manifest exists=false 的 knowledge/proposed/ 本地残留文件：computeSpecOps 不生成 add（不复活）
- 必须在 computeSpecOps 的 add 生成处拦截：路径以 `knowledge/proposed/` 为前缀、且服务器 manifest 该行 `exists === false`（平台 merge/reject 处置过的软删行）的本地文件，禁止生成 add op（静默跳过，复活通道关闭）。

#### 场景：平台已审候选不复活
- Given：本地 `knowledge/proposed/foo.md` 存在；服务器 manifest 含该行且 exists=false（平台已 merge/reject）
- When：computeSpecOps(manifest, localFiles)
- Then：产物 ops 中无 path 为该文件的 add（也无声称新增的任何 op）

### FR-02: syncSpecTree 检测到此类残留时自动删除本地文件并输出一行提示（注明平台已审核合并/拒绝）
- syncSpecTree 必须在 ops 计算后清理「本地 proposed 文件 ∩ manifest exists=false 行」：逐个删除本地文件并输出一行中文提示（含被清路径与「平台已审核（合并/拒绝）」语义）；无残留时必须零输出零副作用。

#### 场景：残留清理
- Given：同 FR-01 场景的残留文件
- When：syncSpecTree 执行同步
- Then：本地该文件被删除；控制台输出含该路径的清理提示行；下次 sync 无该文件零提示（幂等）

### FR-03: 从未同步的新 proposed 文件（manifest 无该行）照常生成 add（新提议上行通道不受影响）
- 必须保持新提议上行通道：manifest 中完全没有该路径行（从未推送过）的 knowledge/proposed/ 文件，必须照常生成 add——判定只认 exists=false 软删行，禁止把「manifest 无行」也当已处置。

#### 场景：新提议正常上行
- Given：本地新 propose 的 `knowledge/proposed/bar.md`；manifest 无该路径行
- When：computeSpecOps
- Then：产物含该文件的 add op（与改动前行为逐字段一致）

### FR-04: 非 proposed 路径的 exists=false 场景行为零变化（既有语义不动）+ 既有测试面全绿
- 必须窄化拦截面：非 `knowledge/proposed/` 前缀路径的一切行为（含 exists=false 软删行不生成 delete 的既有语义、add/update/rename/delete 全规则）与改动前逐字段一致；既有 spec-sync 测试面必须全绿。

#### 场景：非 proposed 软删行为不变
- Given：本地存在 `docs/foo.md`，manifest 该行 exists=false
- When：computeSpecOps
- Then：生成该文件的 add op（既有「本地为真相源」行为保持，不被本修复波及）

## 测试绑定（每条 FR 至少一行：`FR-NN: test/路径「用例名」`）

FR-01: test/spec-sync-proposed-no-revive.test.mjs「T1: exists=false 残留不生成 add」
FR-02: test/spec-sync-proposed-no-revive.test.mjs「T2: 清理段删除本地残留+提示+幂等」
FR-03: test/spec-sync-proposed-no-revive.test.mjs「T3: 新提议照常 add」
FR-04: test/spec-sync-proposed-no-revive.test.mjs「T4: 非 proposed exists=false 行为不变」
