---
id: task-03
title: 'wiring + bootstrap + hard retirement: five call sites, map span_risk section (9 tokens), config-schema note, known-issues entries, rebuild reinsert pin, QUICK_RISK_PATH_PATTERNS grep-zero'
title_zh: '接线与自举+退役收口——五处装载接线/map 9 token 自举/known-issues 登记/回插钉/旧表清零'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 16:44:50
priority: P0
depends_on: [task-01, task-02]
blocks: [task-04]
requirement_ids: [FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1]
allowed_paths:
  - src/run/gates.js
  - src/review-tier.js
  - src/verify-postcheck.js
  - src/run/shared.js
  - src/scope-audit.js
  - src/config-schema.js
  - src/change-risk-profile.js
  - test/modules-rebuild-preserve.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - .sillyspec/knowledge/known-issues.md
  - .sillyspec/knowledge/INDEX.md
  - test/scope-audit.test.mjs
  - test/audit-quick-completion.test.mjs
target_files:
  - src/run/gates.js
  - src/review-tier.js
  - src/verify-postcheck.js
  - src/run/shared.js
  - src/scope-audit.js
  - src/config-schema.js
  - src/change-risk-profile.js
  - test/modules-rebuild-preserve.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - test/scope-audit.test.mjs
  - test/audit-quick-completion.test.mjs
  # 注：.sillyspec/knowledge/{known-issues.md,INDEX.md} 编辑实际交付（allowed_paths 在位），但
  # classifyToolScaffold 归 platform 档不进对账面——不入 target_files（对账口径，非缩水声明）
expects_from:
  - provider: task-01
    needs: [loadSpanRiskPatterns, loadSpanRiskPatternsAllProjects]
  - provider: task-02
    needs: [spanRiskPatterns-param, factSpanRiskPatterns-param, riskTable-default-empty]
related_tests:
  - test/modules-rebuild-preserve.test.mjs
  - test/scope-audit.test.mjs
  - test/audit-quick-completion.test.mjs
goal: >
  把声明表接到五个调用点、给本仓 map 落 9 token 自举段、登记 known-issues（blast 缺口+六域网退役），
  最后删除 QUICK_RISK_PATH_PATTERNS 并全仓 grep 清零。
implementation:
  - 接线（Edit 前重读最新态——多 agent 共享文件）：src/run/gates.js 定价点 loadSpanRiskPatterns({specBase, project: projectName}) 入 computeCeremonyTier spanRiskPatterns（与 :639 blast 装载同上下文）；src/review-tier.js + src/verify-postcheck.js 用 loadSpanRiskPatternsAllProjects（与各自 blast AllProjects 同口径）——verify-postcheck 双点（:3074 factDetail 披露 + runCeremonyDualRunCheck→reconcileDualRun factSpanRiskPatterns 穿透）；src/run/shared.js quick 审计点装载入 gateOpts.riskTable（与 loadQuickModuleIndex 同 specBase/projectName 上下文）；src/scope-audit.js 仅 :435 注入（:517 唯一消费 unmappedFiles 不接线——Grill X-7）
  - 自举：map 顶层增 span_risk 段——键行后段内首行注释（span 轴风险路径声明、rebuild --force 原样回插——Grill X-10 落点）+ 9 token（migrate/migration/migrations/dispatch/scheduler/scheduling/cron/job/jobs，D-004）；blast 段零触碰（main 本无 blast 段——不新增不恢复）
  - src/config-schema.js ceremony 段 note（:232 附近）span 轴输入源补「_module-map.yaml 顶层 span_risk 段」表述；无新 local 键
  - knowledge/known-issues.md 增两条目：①blast 自举表未落 main（悬空提交 bbe30ab、skip-apply.record.json 在案、恢复路径=独立变更自 bbe30ab 取段文本、main 现状 blast 全 S1 起步——D-002）；②span 六域通用表退役为项目声明（无声明项目维度关闭——R-01 行为面）；INDEX.md 补两条路由行
  - test/modules-rebuild-preserve.test.mjs 增断言：--force 写盘后 span_risk 段（含段内注释）在场且字节不变
  - 退役收口（接线全绿后最后做）：src/change-risk-profile.js 删 QUICK_RISK_PATH_PATTERNS 定义/导出/头注段（:25-43）；全仓 grep QUICK_RISK_PATH_PATTERNS src/ test/ 清零（注释引用一并清）
acceptance:
  - grep -rn QUICK_RISK_PATH_PATTERNS src/ test/ 零命中
  - D-005 连带翻新：test/scope-audit.test.mjs :1042 与 test/audit-quick-completion.test.mjs G-4 夹具补 span_risk 段后两文件绿
  - 本仓声明表生效：loadSpanRiskPatterns 读到 9 token；src/migrate.js 与 src/dispatch/ 命中
  - node --test test/modules-rebuild-preserve.test.mjs 全绿（含新回插钉）
  - known-issues 两新条目 + INDEX 路由行在盘
verify:
  - grep -rn QUICK_RISK_PATH_PATTERNS src/ test/（期望零输出）
  - node --test test/modules-rebuild-preserve.test.mjs test/span-risk-surface.test.mjs test/ceremony-tier.test.mjs test/quick-gate-profile.test.mjs
constraints:
  - blast 段零触碰（含不借道恢复 bbe30ab）；价目表零改动
  - scope-audit :517 不接线（X-7）；map 维护提示只落段内注释（X-10）
  - 删表动作本 task 收口（接线全绿后）；不留 legacy 别名/再导出
  - known-issues 只登记不修 blast 缺口
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
