---
author: flow-machine-draft
created_at: 2026-09-24T23:43:30.368Z
---
# 需求规格（Requirements）— 2026-09-25-sentinel-wiring

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:ee856abf83916fc57df9aafd333fe6468cde42a9413303215af785d3f4328f3d:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
### FR-01: run/complete.js 的 --done 链接入 detectFakeC
Given flow 轻量跑道在跑
When flow done 裁决执行
Then run/complete.js 的 --done 链接入 detectFakeCheckCompletion：tasks.md 全勾但零完成证据（区间提交 subject 无 task-NN token 且无对应 review.json）→ 拒收 exit 1 点名缺失任务；非全勾/零勾选行放行不变

### FR-02: 轻量变更 flow done 的 artifacts 子步同判接入（change
Given flow 轻量跑道在跑
When flow done 裁决执行
Then 轻量变更 flow done 的 artifacts 子步同判接入（changeDir 内 tasks.md 全勾零证据同拒）——两道收口同一哨兵

### FR-03: 提交区间口径：quick 用 quick 基线区间提交、flow 用 basel
Given flow 轻量跑道在跑
When flow done 裁决执行
Then 提交区间口径：quick 用 quick 基线区间提交、flow 用 baseline..HEAD（与既有归属收窄单源一致）

### FR-04: 新增集成测试：全勾零证据拒/全勾有提交证据放/非全勾放 三态（run 侧或 fl
Given flow 轻量跑道在跑
When flow done 裁决执行
Then 新增集成测试：全勾零证据拒/全勾有提交证据放/非全勾放 三态（run 侧或 flow 侧至少一道 e2e）

### FR-05: flow 系与 test:core 全绿
Given flow 轻量跑道在跑
When flow done 裁决执行
Then flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-wiring.test.mjs ① 形态 A/B（全勾零证据拒收/全勾 token 放行）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-wiring.test.mjs ① 形态 B（--no-review 下去全链收口）+ ② 接线钉（两侧 import）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-wiring.test.mjs ① 形态 C（非全勾放行）+ 既有 55 例全套隐式回归（所有 e2e 均走非全勾路径零假拦）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-wiring.test.mjs ①② + flow 系 + deps-cwd 55 例 + test:core 176 例

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：缺号
