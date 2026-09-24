---
author: flow-machine-draft
created_at: 2026-09-24T17:20:40.226Z
---
# 需求规格（Requirements）— 2026-09-25-thin-review-slice

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:6b54cd504985f4a9e674c0fa7648b7d4181e6b7bce658739443b4e9fad3417cd:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
### FR-01: flow done 新增 review 子步（patch 后）：定档→需评审且 
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done 新增 review 子步（patch 后）：定档→需评审且 review.json 缺失则打印评审任务书（材料包+盲维检查单+预算帽+只读纪律+schema 契约）exit 1 断点续；review.json 在场则校验，FAIL 或 P1 发现拦截并列明细，修复后删件重评

### FR-02: 定档函数三态：承诺词命中/盲维实质作答/diff 原语/editRatio 超阈
Given flow 薄跑道在跑
When flow done 裁决执行
Then 定档函数三态：承诺词命中/盲维实质作答/diff 原语/editRatio 超阈任一即需评审；全部不命中且无声明才豁免；豁免变更 1/4 定额抽查采样

### FR-03: flow start 支持 --review/--no-review 声明通道（
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 支持 --review/--no-review 声明通道（落 flow-state），简报预告定档机制

### FR-04: 评审结果进 flow-telemetry（required/sampled/ve
Given flow 薄跑道在跑
When flow done 裁决执行
Then 评审结果进 flow-telemetry（required/sampled/verdict/发现数）

### FR-05: 新增测试：定档矩阵/任务书渲染/schema 校验/P1 拦截/豁免路径；flo
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试：定档矩阵/任务书渲染/schema 校验/P1 拦截/豁免路径；flow 系全绿且既有夹具零采样碰撞
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-review.test.mjs ①②③ 用例 + test/flow-protocol.test.mjs ⑮⑯（任务书/回收/P1 拦截全链）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-review.test.mjs ①（五路信号矩阵与采样桶断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑰（--review 一票）与 ③/--no-review 夹具（豁免一票复用）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑮（遥测 review.verdict 断言）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + test/stage-burst.test.mjs 43 例 + test:core 176 例
