---
id: task-04
title: 'quick 埋点与 consume + pruneArchivedChangeRuntime 清单'
title_zh: 'quick 埋点与 consume + pruneArchivedChangeRuntime 清单'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 10:19:06
priority: P1
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01, FR-02, FR-05]
decision_ids: [D-001@v1, D-003@v1, D-006@v1]
expects_from:
  task-01:
    friction-api:
      recordFrictionEvent: '埋点调用签名（quick 失败分支，changeName=sessionId）'
      consumeFrictionHint: '收尾调用签名（QUICKLOG 完成打印后、session 清理前）'
allowed_paths:
  - src/run/complete-handlers.js
target_files: [src/run/complete-handlers.js]  # 对账用精确路径清单
related_tests: [test/archive-runtime-prune.test.mjs]
goal: >
  quick 侧埋点/收尾/归档清理：audit blocked 与 test-lint gate fail 两处 exit(1) 前 record；handleQuickStageCompletion 收尾 consume（session 清理前）；pruneArchivedChangeRuntime 清单补 friction-tally。
implementation:
  - review.status === 'blocked' 分支（~1055）exit(1) 前 record { type:'gate_rollback', detail:'quick-audit' }
  - gate.action === 'fail' 分支（~1075）exit(1) 前 record { type:'gate_rollback', detail:'quick-test-lint' }
  - handleQuickStageCompletion：QUICKLOG 完成打印（~1268「📝 QUICKLOG 条目 … 已标记完成」）后、session 目录 rmSync（~1294）前 consume → 非零 console.log 一行
  - pruneArchivedChangeRuntime（157）：新增 try 块清理 join(runtimeRoot, `friction-tally-${changeName}.json`)（与 apply-pathspec 同款单文件清理）
acceptance:
  - quick --done 被 blocked/test-fail 拦下 → session 目录 friction-tally.json 对应计数 +1
  - quick --done 成功且计数非零 → 一行提示后 session 目录（含 tally）整体删除
  - 归档/删变更 → friction-tally-<change>.json 随 prune 删除；他变更文件保留
verify:
  - npm test -- test/friction-tally.test.mjs test/archive-runtime-prune.test.mjs
constraints:
  - 不改 audit/gate 判定与 exit 语义；consume 位置必须在 session 清理前（清理后读不到）
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
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
