---
author: flow-machine-draft
created_at: 2026-10-06T14:07:58.424Z
---
# 需求规格（Requirements）— 2026-10-06-status-multi-active-list

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: 裸 status 在多活跃（≥2）时列出全部活跃变更名并提示 --change 指定查看，不再出现「未找到进度数据」

- 无显式 `--change` 的只读 status 查询在进度库存在 ≥2 个活跃变更时，必须列出全部活跃变更名（按 listChanges 顺序）并以可照抄的命令形态提示用 `--change` 指定查看；同场景禁止输出「未找到进度数据（只读查询不建变更）」——数据存在，歧义在选谁，语义是「点名」不是「无数据」。
- 列表条目对本地不存在变更目录的行必须标注「本地无目录」（DB 真相与目录真相分离展示，幽灵行可辨识）。

#### 场景：多活跃主路径

- Given 已 init 的仓，进度库有 2 个 status='active' 的变更行（目录在场）
- When 裸跑 `sillyspec status`（无 --change）
- Then exit 0；输出含「2 个活跃变更」与两个变更名；含 `--change` 提示行；不含「未找到进度数据」

#### 场景：活跃行含目录缺失的幽灵

- Given 进度库 ≥2 活跃行，其中 1 行的 changes/ 目录已被手工移走
- When 裸跑 `sillyspec status`
- Then 该行名后标注「本地无目录」，其余行为不变

### FR-02: 零活跃或库不存在时维持既有空态引导文案（不回归）

- 进度库 0 个活跃变更、或 `.sillyspec/.runtime/sillyspec.db` 不在场时，status 必须维持既有空态引导（「未找到进度数据」原句 + flow start 可照抄例 + brainstorm 备选）与 exit 0，禁止引入新分支改变该文案形态。

#### 场景：零活跃

- Given 已 init 的仓，进度库无 status='active' 行
- When 裸跑 `sillyspec status`
- Then 输出与既有空态引导同构（含「未找到进度数据」「flow start」「run brainstorm」），exit 0

#### 场景：库不在场

- Given `.sillyspec` 目录在但 `.runtime/sillyspec.db` 文件不在
- When 裸跑 `sillyspec status`
- Then 走空态引导（不因缺库报错），且运行后库文件仍不存在

### FR-03: 只读短路语义不变：不 initChange、不新建 sillyspec.db（库不在场时）、exit 0

- 本变更触及的 status 只读短路路径必须保持既有副作用面：不 initChange、不新建 changes/ 目录、库不在场时不新建 sillyspec.db（活跃清单读取前必须前置库在场检查，禁止经 _ensureDB 的建库副作用）；多活跃分支与空态分支均 exit 0。

#### 场景：库不在场零副作用

- Given `.sillyspec` 在、`.runtime/sillyspec.db` 不在，changes/ 目录条目数记为 N
- When 裸跑 `sillyspec status`
- Then exit 0；运行后 sillyspec.db 仍不存在；changes/ 条目数仍为 N

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/status-multi-active-list.test.mjs「①多活跃列表：计数+全名+--change 提示+无空态误报」
FR-01: test/status-multi-active-list.test.mjs「②幽灵行标注本地无目录」
FR-02: test/status-multi-active-list.test.mjs「③零活跃空态引导不回归」
FR-02: test/status-multi-active-list.test.mjs「④库不在场走空态且不新建库」
FR-02: test/status-multi-active-list.test.mjs「⑥库丢失后写路径可恢复」
FR-03: test/status-multi-active-list.test.mjs「④库不在场走空态且不新建库」
FR-03: test/status-multi-active-list.test.mjs「⑤多活跃分支只读零落盘（不新增 changes 目录）」
