---
author: flow-machine-draft
created_at: 2026-09-24T23:34:04.422Z
---
# 需求规格（Requirements）— 2026-09-25-deps-cwd-prefix

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:62235e0ec3bfea50ce492f642b97cb593c6d7840f25906b8f5969b2b28feed52:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
### FR-01: buildDepsBatches 的 py 运行器推断保留 cd <dir> &
Given flow 轻量跑道在跑
When flow done 裁决执行
Then buildDepsBatches 的 py 运行器推断保留 cd <dir> && 前缀（首个 pytest 段含链前缀整体提取），且批次内文件路径按该 dir 重定基（剥前导目录）

### FR-02: 无 cd 前缀的模块命令行为不变（裸 pytest 段提取）；无命中模块兜底 p
Given flow 轻量跑道在跑
When flow done 裁决执行
Then 无 cd 前缀的模块命令行为不变（裸 pytest 段提取）；无命中模块兜底 python -m pytest 不变

### FR-03: buildDepsBatches 导出并新增单测：带 cd 前缀的命令与路径重定
Given flow 轻量跑道在跑
When flow done 裁决执行
Then buildDepsBatches 导出并新增单测：带 cd 前缀的命令与路径重定基/裸命令不变/兜底三态

### FR-04: flow 系与 test:core 全绿
Given flow 轻量跑道在跑
When flow done 裁决执行
Then flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/deps-cwd-prefix.test.mjs ①②（前缀保留+重定基+裸命令回归）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/deps-cwd-prefix.test.mjs ②（裸 pytest 段不变）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/deps-cwd-prefix.test.mjs ①③（export 直测）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + stage-burst + verify-deps-auto-default + deps-cwd-prefix 57 例 + test:core 176 例
