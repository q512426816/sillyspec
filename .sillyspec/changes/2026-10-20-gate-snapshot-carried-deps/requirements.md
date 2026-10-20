---
author: flow-machine-draft
created_at: 2026-10-20T01:21:33.016Z
---
# 需求规格（Requirements）— 2026-10-20-gate-snapshot-carried-deps

## 功能需求

### FR-01: createGateSnapshot 增可选 carriedFiles：与 files 同款 overlay 语义（三态源判定/运行时面跳过/import 冒烟），计数与清单入返回值（carriedFiles），不进判定面

`createGateSnapshot`（src/run/gate-snapshot.js:497）必须（MUST）新增可选参数 `carriedFiles = []`：携带面文件走与 `files` 完全相同的 overlay 语义——worktree/cwd 三态源判定（双写分叉同款）、`.sillyspec/.runtime|quicklog|local.yaml` 运行时面跳过、路径逃逸拒绝对齐、`.py` import 冒烟覆盖；返回值必须（MUST）新增 `carriedFiles`（实际拷贝成功的携带清单）与 `carried`（计数）。缺省不传或空数组时必须（MUST）与既有行为逐字节一致（零回归契约）。

#### 场景：携带文件与判定面文件同款源判定

Given worktree 模式下某他者声明文件在主仓与 worktree 有不同修改
When 以 carriedFiles 携带
Then 走同一三态判定（陈旧取主仓/正常取 worktree/分叉取 worktree 血统并警告）

### FR-02: createVerifyGateSnapshot 的 foreign 剔除改为「判定面剔除+物理携带」，控制台提示携带 N 个他者声明文件；全部被剔仍回退主仓的既有语义不变

`createVerifyGateSnapshot`（src/run/gate-snapshot.js:883）的他者声明过滤必须（MUST）改为：判定面（changeFiles，供 createGateSnapshot files 参数）照旧剔除他者声明文件；被剔除文件必须（MUST）以 `carriedFiles` 传给 createGateSnapshot 物理携带（源=overlayRoot 经三态判定：worktree 模式陈旧取主仓/正常与分叉取 worktree 血统，in-place 取主仓工作区版本；源侧不存在的他者文件跳过不携带）。携带发生时控制台必须（MUST）输出提示（携带 N 个他者声明文件·依赖自洽·不进判定面）。他者声明过滤后判定面为空 → 回退主仓的既有语义与失败原因必须（MUST）不变。

#### 场景：坑文主场景（快照依赖自洽）

Given quick（他者活跃变更）声明并修改 src/util.js 新增导出 stripPathPrefix（主仓工作区在场），本变更（full，worktree）文件 import 该导出且在变更文件集内
When verify 门建快照
Then src/util.js 从判定面剔除（归属语义不变）但物理携带 worktree/工作区版本进快照——快照内本变更测试不再因缺导出 TypeError

#### 场景：全部被剔回退语义不变

Given 本变更 diff 文件全部被他者声明过滤
Then 判定面为空 → 回退主仓（既有 failRef 原因文案不变，不因携带面存在而改变）

### FR-03: 未声明的无主脏文件在 worktree 模式照旧不进快照（隔离核心不动）；in-place 无主文件 fail-closed 保留语义不变

隔离核心必须（MUST）保持：worktree 模式下主仓在途的**未声明**脏文件（不在本变更文件集、未被任何他者变更声明）必须（MUST NOT）物理进快照（test/verify-gate-snapshot.test.mjs:77 的防弄红断言语义保留）；in-place 模式无主文件 fail-closed 保留语义（:106-107）必须（MUST）不变。

#### 场景：未声明脏文件隔离不回退

Given worktree 模式主仓 src/foreign-wip.js 为坏语法脏文件且无任何变更声明它
When 快照建立
Then 该文件不进快照（不进判定面也不进携带面——携带面只收「被剔除的他者声明文件」）

### FR-04: 坑文场景钉测试：本变更文件依赖他者声明文件的新导出 → 快照含他者文件工作区版本（依赖自洽）；既有快照套件语义变化处（他者声明文件物理在场断言）同步改钉

必须（MUST）新增钉测试覆盖坑文场景（依赖自洽端到端断言：快照内他者文件内容=工作区版本）；既有用例中「他者显式声明的文件物理不进快照」断言（test/verify-gate-snapshot.test.mjs:104）必须（MUST）随语义变化改钉为「物理在场（携带）+判定面剔除可观察（carriedFiles 清单含该文件且 files 判定面不含）」。

#### 场景：改钉而非放松

Given in-place 用例的 declared-foreign.js
Then 新断言：快照内存在（携带，内容=主仓工作区版本）且返回值 carriedFiles 含它——判定面语义由 FR-02 场景钉定

### FR-05: 既有 gate-snapshot 全家族测试与 verify 门相关回归全绿

既有 `verify-gate-snapshot` / `quick-gate-snapshot` / `gate-snapshot-*`（lineage/lifecycle/cleanup/monorepo/ancestor-trim/import-smoke/copy/commands 等）与 verify 门相关套件必须（MUST）零回归全绿（quick 门未触携带面——其调用点 createGateSnapshot 不传 carriedFiles，走零回归契约）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/gate-snapshot-carried.test.mjs「carriedFiles 同款 overlay 语义与零回归契约」
FR-02: test/verify-gate-snapshot.test.mjs「坑文主场景：他者声明依赖携带自洽」+「全部被剔回退语义不变」
FR-03: test/verify-gate-snapshot.test.mjs「native worktree：快照含本变更 worktree 版本 + 变更文档，不含主仓他者脏文件」（:77 防弄红断言保留）+「in-place meta：…无主文件保留（fail-closed）」
FR-04: test/verify-gate-snapshot.test.mjs「in-place meta：…他者声明文件物理携带改钉」
FR-05: test/verify-gate-snapshot.test.mjs + test/quick-gate-snapshot.test.mjs + test/gate-snapshot-lineage.test.mjs「全家族回归」
