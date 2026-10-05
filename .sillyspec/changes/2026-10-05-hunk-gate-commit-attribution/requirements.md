---
author: flow-machine-draft
created_at: 2026-10-05T15:02:23.631Z
---
# 需求规格（Requirements）— 2026-10-05-hunk-gate-commit-attribution

## 功能需求

### FR-01: 已归档他侧交付（窗口内全部提交属他侧变更名）不再报未归因，改报「他侧归因（提交事实）」信息行并注明 patch 冻结面同口径剔除

- hunk 归属门的未归因判定必须补提交事实归属切分（commitAttributionForChange+isForeignByCommit，与 patch 冻结 filterCommittedFace 同源）：窗口内全部提交均属他侧变更名的文件必须改判「他侧归因（提交事实）」ℹ️ 信息行（含归属变更名与「patch 冻结面同口径剔除」注明）；禁止再对该形态报未归因警告（指引「pathspec 隔离/补 design 自声明」双误导）。

#### 场景：主路径

- Given: baseline..HEAD 窗口含他侧变更名后缀提交（该变更已归档，声明面不可见），文件不在本变更声明面
- When: runHunkAttributionGate 判定
- Then: 该文件进 foreignByCommit（ℹ️ 信息行、归属他侧变更名），不出现在未归因警告行

### FR-02: 他侧归因文件不计入 ok 阻断面（gate=error 不再因此拦）；裸提交/本变更名提交的文件维持未归因原判定

- 他侧归因（提交事实）文件必须不计入 ok 阻断面（ok=未归因×0 且 竞争×0——foreignByCommit 不参与）；被裸提交（无后缀）或本变更名提交触碰过的文件必须维持未归因原判定（fail-closed 不因改判放宽）。

#### 场景：主路径

- Given: 窗口仅含他侧后缀交付（无裸提交/本变更名提交触碰未声明文件）
- When: gate=error 档判定
- Then: ok=true 不拦，清零行与他侧归因信息行并存

### FR-03: 归属切分不可得（非 git/无基线/git 失败）时保持原口径全量未归因（fail-closed 不放宽）

- commitAttributionForChange 不可得（返回 null）时必须保持原口径：未声明文件全量计未归因，不做改判——切分失败不成为放宽面。

#### 场景：主路径

- Given: baselineCommit 非法（git log 失败 → 切分 null）
- When: 未归因判定
- Then: 他侧后缀文件仍计未归因（原口径），foreignByCommit 空

### FR-04: 单测覆盖：他侧归因改判/裸提交维持/切分不可得退化三形态

- 必须有单测锁定三形态：他侧归因改判（含渲染行与汇总三计数）、裸提交维持未归因、切分不可得退化全量未归因；含他侧归因不阻 ok 的 error 档断言。

#### 场景：主路径

- Given: 真实临时 git 仓三形态 fixture
- When: runHunkAttributionGate + renderHunkAttributionLines
- Then: 三形态断言各自成立

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/hunk-gate-commit-attribution.test.mjs「① 他侧归因改判：他侧后缀交付不报未归因（信息行 + 不计 ok 面）；② 裸提交维持」
FR-02: test/hunk-gate-commit-attribution.test.mjs「③ 他侧归因不阻 ok（清零行与他侧归因并存）」
FR-03: test/hunk-gate-commit-attribution.test.mjs「④ 切分不可得退化：归属失败（非法基线 → null）保持全量未归因不放宽」
FR-04: test/hunk-gate-commit-attribution.test.mjs「① + ③ + ④ 三形态齐备」
