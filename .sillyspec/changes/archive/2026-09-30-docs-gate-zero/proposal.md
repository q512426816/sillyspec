---
author: flow-machine-draft
created_at: 2026-09-30T02:10:52.594Z
---
# 提案书（Proposal）— 2026-09-30-docs-gate-zero

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:fc2cc0aa0b25fd5d325aab6b76fb6803f89fb2745eef5921e83064f28163e074:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-docs-gate-zero 留痕重锚 -->
任务原话转写：动机：docs gate 现报 279 处失效（基线 372，已清偿 93），用户要求归零。构成：本仓漂移 55 处（53 可 --fix 自动重锚 + prompt-control-debt 两处 complete.js:579 调用点已随 2026-09-26-task-review-retire 退役）；跨仓引用 211 处（spec 归位主仓带来的外部项目文档裸路径，本仓解析必失败——按 2026-09-04 既定先例改 repo://sillyhub 前缀，本机 cross_repo_roots 已配映射，197 处直转全过 + 14 处行号重锚 token 已在目标仓验证）；人工消歧 12 处（hub daemon 路由已拆 router/ 子目录等，逐条定位）；sdk.d.ts 死锚（node_modules 依赖文件，原锚 1092 行）去行号留提及。
成功标准：
- docs check 全量 0 失效（total 扫描面不变：docs/ + .sillyspec/docs/ + .sillyspec/changes/ + .sillyspec/knowledge/）
- docs gate --init-baseline 落 0 且 gate 通过（279→0，基线文件 .sillyspec/docs-check-baseline 372→0）
- 跨仓引用全部显式 repo://sillyhub 前缀（不靠 skip/豁免藏数），本机映射下层1+层2 实测通过
- pre-push 三道关（lint + 全量测试 + docs gate --against HEAD）全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:60be1ee4b9c63fedd8c12a8a35074c5fde85d03ceb5e280fb91ae5096186b189:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-docs-gate-zero 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. docs check 全量 0 失效（total 扫描面不变：docs/ + .sillyspec/docs/ + .sillyspec/changes/ + .sillyspec/knowledge/）
2. docs gate --init-baseline 落 0 且 gate 通过（279→0，基线文件 .sillyspec/docs-check-baseline 372→0）
3. 跨仓引用全部显式 repo://sillyhub 前缀（不靠 skip/豁免藏数），本机映射下层1+层2 实测通过
4. pre-push 三道关（lint + 全量测试 + docs gate --against HEAD）全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:e6f2ac2c1e0f51dec9f2f25a61db174fd3163b606b727861a734a7f36678aef4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-docs-gate-zero 留痕重锚 -->
1. docs check 全量 0 失效（total 扫描面不变：docs/ + .sillyspec/docs/ + .sillyspec/changes/ + .sillyspec/knowledge/）
2. docs gate --init-baseline 落 0 且 gate 通过（279→0，基线文件 .sillyspec/docs-check-baseline 372→0）
3. 跨仓引用全部显式 repo://sillyhub 前缀（不靠 skip/豁免藏数），本机映射下层1+层2 实测通过
4. pre-push 三道关（lint + 全量测试 + docs gate --against HEAD）全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
