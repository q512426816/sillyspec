---
id: task-08
title: '消费面降级清理 27 面（archive-delta 容空/change-risk-profile 消费点删/preview-progress/**flow.js 与 flow-parity.js 升厚文案**/machine-draft/machine-interface/prefill/redlines/scope-audit/ui-visual/green-cache/run-shared/runtime-paths/task-review/taskcard-frontmatter/validate-artifacts/verify-draft/watcher/worktree/worktree-apply/foreign-declared/stages-plan/stages-plan-postcheck/stages-quick/mcp-server/hooks-worktree-guard）+plan/quick 消费回归（mcp-server：stage enum 删 ''verify''、facet verify-test 保留、zod description 中文指路）（依赖 task-02, task-03, task-07, task-09）'
title_zh: '消费面降级清理 27 面（archive-delta 容空/change-risk-profile 消费点删/preview-progress/**flow.js 与 flow-parity.js 升厚文案**/machine-draft/machine-interface/prefill/redlines/scope-audit/ui-visual/green-cache/run-shared/runtime-paths/task-review/taskcard-frontmatter/validate-artifacts/verify-draft/watcher/worktree/worktree-apply/foreign-declared/stages-plan/stages-plan-postcheck/stages-quick/mcp-server/hooks-worktree-guard）+plan/quick 消费回归（mcp-server：stage enum 删 ''verify''、facet verify-test 保留、zod description 中文指路）（依赖 task-02, task-03, task-07, task-09）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:08
priority: P0
depends_on: [task-02, task-03, task-07, task-09]
blocks: [task-10]
requirement_ids: [FR-08]
decision_ids: [D-007@v1]
allowed_paths:
  - src/archive-delta.js
  - src/change-risk-profile.js
  - src/preview-progress.js
  - src/flow.js
  - src/flow-parity.js
  - src/machine-draft.js
  - src/machine-interface.js
  - src/prefill.js
  - src/redlines.js
  - src/scope-audit.js
  - src/ui-visual.js
  - src/run/green-cache.js
  - src/run/shared.js
  - src/runtime-paths.js
  - src/task-review.js
  - src/taskcard-frontmatter.js
  - src/validate-artifacts.js
  - src/verify-draft.js
  - src/watcher.js
  - src/worktree.js
  - src/worktree-apply.js
  - src/foreign-declared.js
  - src/stages/plan.js
  - src/stages/plan-postcheck.js
  - src/stages/quick.js
  - src/mcp-server.js
  - src/hooks/worktree-guard.js
target_files:
  - src/archive-delta.js
  - src/change-risk-profile.js
  - src/preview-progress.js
  - src/flow.js
  - src/flow-parity.js
  - src/machine-draft.js
  - src/machine-interface.js
  - src/prefill.js
  - src/redlines.js
  - src/scope-audit.js
  - src/ui-visual.js
  - src/run/green-cache.js
  - src/run/shared.js
  - src/runtime-paths.js
  - src/task-review.js
  - src/taskcard-frontmatter.js
  - src/validate-artifacts.js
  - src/verify-draft.js
  - src/watcher.js
  - src/worktree.js
  - src/worktree-apply.js
  - src/foreign-declared.js
  - src/stages/plan.js
  - src/stages/plan-postcheck.js
  - src/stages/quick.js
  - src/mcp-server.js
  - src/hooks/worktree-guard.js
goal: >
  27 个消费面降级清理（fail-soft/文案/分支删除），护栏盲区由本卡枚举兜底；plan/quick/machine-interface 等共享消费回归绿。
implementation:
  - src/archive-delta.js verify-facts 读取移除、探针指标段容空（:44-47/:116-119 null-safe 保持）
  - src/change-risk-profile.js verify 收尾消费点与回执槽解析删（design 阶段风险提示保留）
  - src/preview-progress.js 产物清单删 verify 行
  - src/flow.js 与 src/flow-parity.js 升厚/thick 指路文案改四阶段语义（run verify 改 run archive）——护栏对不带引号的模板文案是盲的，本卡枚举兜底
  - src/runtime-paths.js:43 产物前缀键更名 archive-quality-scan-（task-02 已在文件内声明新常量，本卡改注册键并核对消费）
  - src/validate-artifacts.js:44 删对 verify-facts-schema 的动态 import
  - src/mcp-server.js:38 stage enum 删 verify、:47/51 facet verify-test 保留（消费保留签名）、zod description 补中文指路文案（不改造 enum 拒绝行为）
  - 其余面（machine-draft/machine-interface/prefill/redlines/scope-audit/ui-visual/green-cache/run-shared/task-review/taskcard-frontmatter/verify-draft/watcher/worktree/worktree-apply/foreign-declared/stages-plan/stages-plan-postcheck/stages-quick/hooks-worktree-guard）：逐面核对——注释/文案更新或 verify 分支删除，plan/quick 共享工具保留
acceptance:
  - grep -rn "verify-result\|verify-probes\|verify-facts\|verify-mode\|'verify'" src --include=*.js 按白名单清零（白名单=归档区历史读取+archive-quality-scan- 新前缀+历史注释，逐条显式登记在收口输出）
  - plan/quick 消费回归：node --test test/next-command.test.mjs test/config-schema.test.mjs 绿
  - mcp-server：stage enum 拒绝 verify 且 description 含中文指路
verify:
  - node test/check-syntax.mjs
  - node --test test/next-command.test.mjs test/config-schema.test.mjs
constraints:
  - 保留十签名消费零改动（machine-interface 的 runVerifyLintCheck/triageLintOwnership/runVerifyTestCheck/reconcileTargetFiles 调用保留）
  - 跨仓路径兼容（worktree*.js 的 Windows/WSL 路径语义零变化——crossrepo-path-compat 探针）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（形如 src/foo.js:<行号>——行号写实际数字）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
