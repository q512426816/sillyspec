---
id: task-03
title: 'CLI 编排接线（flags/启动探测+guard 握手/统一 bump/.gitignore）'
title_zh: 'CLI 编排接线（flags/启动探测+guard 握手/统一 bump/.gitignore）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-14 22:24:55
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-01, FR-05, FR-07]
decision_ids: ['D-002@v1', 'D-006@v1', 'D-007@v1', 'D-008@v1']
allowed_paths:
  - src/run/command.js
  - src/run/stage.js
  - src/hooks/worktree-guard.js
  - src/run/scan-profile.js
  - .gitignore
  - test/scan-incremental-wiring.test.mjs
target_files:
  - src/run/command.js
  - src/run/stage.js
  - src/hooks/worktree-guard.js
  - src/run/scan-profile.js
  - .gitignore
  - NEW:test/scan-incremental-wiring.test.mjs
expects_from:
  task-01:
    - contract: probeCodegraph
      needs: [available, reason, status]
  task-02:
    - contract: computeIncrementalPlan
      needs: [mode, guardDocs, warnings, docsToRegenerate, docsToSkip, affectedModules]
related_tests:
  - test/worktree-guard.test.mjs
  - test/scan-profile.test.mjs
goal: >
  scan 命令启动层接线增量路径：flag 登记、启动段探测+计划落盘+路径判定输出、
  guard 握手（mode='scan-incremental' 白名单）、finalize 统一 bump、
  本仓 .gitignore 登记索引目录——增量主路径端到端物理可用。
implementation:
  - src/run/command.js：--incremental/--force-incremental 进 flag 白名单（src/run/command.js:749 一带）与帮助文本（:261 一带）；未知 flag 报错指引包含新 flag（防 known-issue 死路）
  - src/run/stage.js scan 启动段（写 scan-guard 同段，src/run/stage.js:322-344 一带）——--force-rescan 存在时跳过探测走现行路径；否则跑探测与计划，增量可行时写 guard 握手（mode 取 scan-incremental、incrementalDocs 取计划 guardDocs、docHashes 为白名单内现存文件 sha256 而新文件无哈希视作计划内新建放行即 Review Focus #2、sourceCommit 记 headShort、forceRescan 恒 false）；计划判全量时按现行行为写 guard 并输出回退原因一行；计划原子写 .sillyspec/.runtime/scan-incremental-plan.json（writeAtomicSync，Review Focus #5）；输出本次路径判定（增量含 N 模块受影响/M 篇章跳过/X 未归属，或全量附原因）三档 quick/standard/deep 统一在启动层（D-007）
  - src/hooks/worktree-guard.js：白名单新增 mode='scan-incremental' 分支（仿 :223-226 scan-refresh 先例）——incrementalDocs 内放行、外照常拦截；mode='scan-refresh' 分支与非 scan 面逻辑零改动
  - src/run/scan-profile.js executeScanFinalize（:356-381）：检测 .runtime/scan-incremental-plan.json 存在且本会话增量 → stampScanDocHeaders 后接 bumpScanDocBaselines（docs=SCAN_REQUIRED_DOCS 全部基线载体，headShort=当前 HEAD）统一推进，generator 标 sillyspec-scan-incremental；非增量路径行为逐字不变
  - .gitignore：补 '.sillyspec-codegraph/' 一行（D-008 本仓 dogfood）
  - 新建 test/scan-incremental-wiring.test.mjs：guard 握手写入断言（mode/incrementalDocs/docHashes 含新文件路径）、worktree-guard 白名单内放行/外拦截（mode='scan-incremental' 样本）、finalize 增量分支 bump 调用（mock bumpScanDocBaselines）、--force-rescan 跳过探测、flag 白名单命中
acceptance:
  - mode:'incremental' 时 guard 文件含 mode/incrementalDocs/docHashes/sourceCommit，白名单内子代理编辑放行、白名单外仍拦（单测：worktree-guard 分支双样本）
  - 白名单含计划内新建文件（无旧哈希）时不因缺哈希拒绝（Review Focus #2 单测）
  - 探测不可用/计划 mode:'full' 时输出回退原因一行且后续流程与现行一致（单测 + 既有测试面回归）
  - executeScanFinalize 增量分支后全部基线载体 source_commit=HEAD、generator=sillyspec-scan-incremental；非增量路径 stampScanDocHeaders 原行为不变（单测）
  - --incremental/--force-incremental 在帮助文本与白名单可见，未知 flag 指引不含死路（单测 grep 帮助文本）
verify:
  - node --test test/scan-incremental-wiring.test.mjs（按 test/ 目录既有 runner 形态）
  - node --test test/worktree-guard.test.mjs test/scan-profile.test.mjs（既有面回归——related_tests）
constraints:
  - 探测/计划/落盘全在启动层完成，秒级预算（探测+计划 <5s 超时降级全量）；三档 profile 统一生效（D-007）
  - worktree-guard 的 mode='scan-refresh' 分支与非 scan 面拦截逻辑零改动（D-001/C8）
  - scan-incremental-plan.json 与 guard 均原子写；后写覆盖前写（同变更并发未定义，不损坏文件）
  - --force-rescan/--quick/--standard/--deep 语义不变；非增量路径行为与改动前逐字一致（C1 零回归）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
