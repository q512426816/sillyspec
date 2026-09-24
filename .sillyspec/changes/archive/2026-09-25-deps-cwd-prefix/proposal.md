---
author: flow-machine-draft
created_at: 2026-09-24T23:34:04.421Z
---
# 提案书（Proposal）— 2026-09-25-deps-cwd-prefix

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:96f50a1ed18f6472b53b35f83eeebaeea1efd8b41e5298655d9047281189409b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
任务原话转写：动机：deps(auto-py) cwd 口径缺陷（R15/R16 两轮 known_failures 豁免顶着）——.py 依赖批次的运行器推断把模块命令的 cd backend && 前缀剥掉，从 worktree 根跑 uv run pytest，根上无 pyproject.toml 解析到错环境，aiobotocore 假红。
成功标准：
- buildDepsBatches 的 py 运行器推断保留 cd <dir> && 前缀（首个 pytest 段含链前缀整体提取），且批次内文件路径按该 dir 重定基（剥前导目录）
- 无 cd 前缀的模块命令行为不变（裸 pytest 段提取）；无命中模块兜底 python -m pytest 不变
- buildDepsBatches 导出并新增单测：带 cd 前缀的命令与路径重定基/裸命令不变/兜底三态
- flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:b9bff54dea2224a42720935f5bd6324d516f18b5b426a73b9b496b34eb9501b7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. buildDepsBatches 的 py 运行器推断保留 cd <dir> && 前缀（首个 pytest 段含链前缀整体提取），且批次内文件路径按该 dir 重定基（剥前导目录）
2. 无 cd 前缀的模块命令行为不变（裸 pytest 段提取）；无命中模块兜底 python -m pytest 不变
3. buildDepsBatches 导出并新增单测：带 cd 前缀的命令与路径重定基/裸命令不变/兜底三态
4. flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:1b0dcb235ea1d8f4f99bd8e9c0ce5d32b7bf2788a1a070cae5dfd152c0e1807d:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-deps-cwd-prefix 留痕重锚 -->
1. buildDepsBatches 的 py 运行器推断保留 cd <dir> && 前缀（首个 pytest 段含链前缀整体提取），且批次内文件路径按该 dir 重定基（剥前导目录）
2. 无 cd 前缀的模块命令行为不变（裸 pytest 段提取）；无命中模块兜底 python -m pytest 不变
3. buildDepsBatches 导出并新增单测：带 cd 前缀的命令与路径重定基/裸命令不变/兜底三态
4. flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
