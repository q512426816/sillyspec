---
id: task-04
title: 'fix.sql 双门——worktree-apply 尾声 + archive --confirm 前置兜底 + db-script 互斥 + archive Step3 handover 清单注入'
title_zh: 'fix.sql 双门——worktree-apply 尾声 + archive --confirm 前置兜底 + db-script 互斥 + archive Step3 handover 清单注入'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 12:09:11
priority: P0
depends_on: ['task-01']
blocks: ['task-07']
requirement_ids: [FR-05, FR-06]
decision_ids: ['D-005@v2', 'D-007@v1', 'D-012@v1']
allowed_paths:
  - src/worktree-apply.js
  - src/stages/archive.js
  - src/run/complete-handlers.js
  - src/run/prompt.js
target_files:
  - src/worktree-apply.js
  - src/stages/archive.js
  - src/run/complete-handlers.js
  - src/run/prompt.js
expects_from:
  task-01:
    - contract: verify-facts-producer
      needs: ['facts.dbScriptDeclarations', 'parseDbScriptDeclarations', 'facts.handover[].severity']
goal: >
  落地 fix.sql 双门的兜底侧（D-007/D-012）：worktree-apply apply 尾声与 archive --confirm 前置
  同款 db/*.sql 声明门（apply 文件集 ∩ db/*.sql ⊆ parseDbScriptDeclarations(verifyMd)，缺失阻断，
  覆盖 verify 后新增 sql 的时序窗口 R-06），db-script 类 handover 与声明门互斥校验，并在 archive
  Step 3 确认 prompt 注入 facts.handover 清单（severity 标注、blocking 置顶、封顶渲染、不阻断）——
  前置脚本从「口头契约」变「双门对账」，移交项在用户裁决点全貌可见。
implementation:
  - '依据 design.md §4（D-005@v2/D-007/D-012、X-03 文法）与 requirements FR-05/FR-06，先读 src/worktree-apply.js 的 applyWorktree（:1175）与三条主仓成功出口的 manifestFace（空 patch 出口 :1862-1872 / patch 主路径 :1925-1948 / merge 路径 :2446-2466）、跨仓 apply 成功面（applyCrossRepoWorktrees :1161 out.applied[].changedFiles）；src/run/complete-handlers.js 的 handleArchiveConfirmStep（:778-787，--confirm 门控 + !confirm 早退形态）；src/run/prompt.js 的 {SCOPE_AUDIT_TABLE} 注入先例（:1292-1313）'
  - 'worktree-apply.js 新增 db 声明门共享函数：入参文件集 ∩ db/*.sql（路径比对统一正斜杠）逐文件对账 parseDbScriptDeclarations(verifyMd)——verifyMd 自 specBase/changes/<变更名>/verify-result.md 读取，parseDbScriptDeclarations 一律 import task-01 导出的同一文法实现（禁二份副本；task-01 若按接口注释落为私有需补 export）；verify-result.md 缺失 = 空声明集；缺失声明 → 返回 error（文案列缺失 db 文件 + 修复指引「verify-result.md 补『已对目标库执行：db/<file>.sql』声明行，或集成验证回执条目 command 含 db/<file>.sql（X-03 双形态），补后重跑」）'
  - '门函数内置互斥分支（D-005@v2：db-script 恒 blocking）：声明集命中 db 文件 × handover 存在 db-script 类型行（数据源 facts.handover 优先，缺 facts 时 parseHandoverRows(verifyMd) 兜底，两源任一命中即拦）→ error（两面矛盾：声明已执行 vs 移交待执行，二选一以真实状态为准）'
  - 'apply 侧接线：三条主仓成功出口（manifestFace 各出口现成）与跨仓 apply 成功面（out.applied[].changedFiles）统一过门——缺失/互斥 → result.errors.push（result.ok 不置 true，走既有 apply error 通道阻断，不抛异常）；无 db/*.sql 交集 → 零行为变化（manifest/pathspec 落盘照旧）'
  - 'archive 侧接线（实证调整：src/stages/archive.js 为纯 definition（prompt 模板 + requiresConfirm 标志）无逻辑可挂，--confirm 门控实证在 complete-handlers.js:778-787——design 自审存疑点据此落定）：handleArchiveConfirmStep 在 confirm 通过后、archiveChangeDirectory 目录移动前，读 changes/<变更名>/apply-manifest.json 的 files 过同一门函数；缺失/互斥 → 复用 !confirm 早退形态（steps[currentIdx].status 置 pending + pm._write + return early），变更目录不动、输出修复指引；apply-manifest.json 缺失 → 门空转不阻断（无 apply 面，主门在 verify 侧事实③/task-02）'
  - 'handover 清单注入（FR-06 注入态）：src/stages/archive.js Step 3「确认归档」prompt 增占位符（如 {HANDOVER_SUMMARY}）+ 小节说明「CLI 机械注入勿手改」；src/run/prompt.js 仿 {SCOPE_AUDIT_TABLE} 先例注入——读 changeDir/verify-facts.json 的 facts.handover，渲染 severity 标注、blocking 置顶、条目封顶渲染（封顶条数实现时定，对齐 scope-audit maxRows 先例量级），表尾指路 facts.json 看全量；fail-soft：facts 缺失/读取失败降级单行指引，不阻断归档 prompt 输出'
  - 'npm test 与 npm run lint 全绿后收尾（AGENTS.md 规则 8 实证口径）'
acceptance:
  - 'apply 文件集（主仓任一成功出口或跨仓 apply 面）含 db/*.sql 且 verify-result.md 无对应声明 → apply 结果 error 阻断（result.ok=false）且文案含补声明修复指引；补声明行后重跑放行（FR-05 兜底门第一态）'
  - 'archive --confirm 时 apply-manifest.json 的 files 含 db/*.sql 且无对应声明 → 步骤回退 pending、变更目录不移动、输出修复指引（FR-05 兜底门第二态）'
  - '声明在场 × db-script 类型 handover 行在场 → 互斥 error 阻断（FR-06 互斥态）'
  - '无 db/*.sql 交集的 apply 与归档全流程行为零变化（存量兼容）；apply-manifest.json 缺失时 archive 门空转不阻断'
  - 'archive Step 3 prompt 渲染含 handover 清单：severity 标注、blocking 置顶、超封顶截断并指路 facts.json；facts 缺失时降级单行指引不阻断（FR-06 注入态）'
  - 'npm test 全量通过且 npm run lint 通过'
verify:
  - 'npm test'
  - 'npm run lint'
constraints:
  - '零连库：纯文件集 + 文本声明对账（design 非目标——不做 information_schema 对账）；不解析日志内容猜测'
  - 'verify 侧事实③（design 清单 ∪ worktree changed files 时点判定）归 task-02 已落，本任务不重复实现 verify 门；apply/archive 为兜底门（D-012 双门互补，覆盖 R-06 时序窗口）'
  - 'parseDbScriptDeclarations / parseHandoverRows 一律 import 复用（task-01 导出 / verify-probes.js 既有导出 :1569），禁二份文法副本；task-01 provides 若未声明 parseDbScriptDeclarations 字段，plan-postcheck 契约对账会拦（expects_from 已列该 needs）'
  - '不做归档侧闭环对账（handover resolved/豁免/转结构化负债语义属批次 E）；清单注入与门阻断语义分离——注入永不阻断'
  - 'apply 门阻断走既有 result.errors 通道不抛异常；archive 门复用 !confirm 早退形态；两门各自独立可回退（回退 = 移除调用点）'
  - 'prompt 注入 fail-soft 对齐 {SCOPE_AUDIT_TABLE} 先例（:1292-1313）；纯 JavaScript（ESM）零新依赖；Windows/Linux/macOS 兼容（路径统一正斜杠比对，CRLF/LF 容忍）'
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
