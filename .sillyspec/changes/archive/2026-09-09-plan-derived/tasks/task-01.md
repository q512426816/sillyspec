---
id: task-01
title: 'adoptPlanWaves proposal 档 + section 2 三类分流重构'
title_zh: 'adoptPlanWaves proposal 档 + section 2 三类分流重构'
author: 'qinyi'
created_at: 2026-09-09 04:34:27
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/plan-adopt-waves.js
  - src/stages/plan-postcheck.js
  - NEW:test/plan-wave-autoderive.test.mjs
  - test/plan-adopt-waves.test.mjs
target_files:
  - src/plan-adopt-waves.js
  - src/stages/plan-postcheck.js
  - NEW:test/plan-wave-autoderive.test.mjs
  - test/plan-adopt-waves.test.mjs
provides:
  - contract: adoptPlanWaves proposal 档
    fields: [mode, waves, planMdDraft, rewritten, conflicts]
  - contract: validateWaveProposal
    fields: [waves 覆盖参, allowedPaths 交集]
goal: >
  Wave 依赖违规自动修复主链：提案-验证-落盘三段式 + 三类分流（违规修/合法串行静默/一致✅）。
implementation:
  - plan-adopt-waves.js：adoptPlanWaves 加 mode 参（默认 write 向后兼容）——proposal 档只读产 { waves, planMdDraft, conflicts } 不落盘；write 档返回值增 rewritten/conflicts（CLI 输出行为等价）
  - plan-postcheck.js section 2（:1593-1685）三类分流重构：①方向违规 → adoptPlanWaves(proposal) → validateWaveProposal（validateBlueprintConsistency 加可选 waves 覆盖参——读侧注入不改 plan.md；逐 Wave 两两 allowed_paths 交集）→ 干净则落盘（proposal draft + W 列）+ 回执；脏则保原文 throw 原信息（提示改「拆 Wave 或补 depends_on」）②合法串行 → 静默（删 ⚠️ 两行与手动命令提示）③一致 → ✅ 不变
  - test/plan-wave-autoderive.test.mjs 新建：违规+提案干净→自动修复回执+落盘断言；违规+提案脏（同 Wave 重叠 fixture）→保原文 throw；合法串行→静默零改写；幂等（二跑零变更）
  - test/plan-adopt-waves.test.mjs §4/§4b：断言从 throw 改锚定自动修复回执（复审 P1）
acceptance:
  - 违规且提案干净 → --done 自动落盘 + 回执，无 agent 手改需求
  - 违规且提案脏 → 原文保留照旧拦（冲突明细）
  - 合法保守串行 → 零输出零改写
  - mode 默认 write：CLI adopt 命令行为等价（既有命令测试绿）
verify:
  - node --test test/plan-wave-autoderive.test.mjs
  - node --test test/plan-adopt-waves.test.mjs
constraints:
  - execute 解析（buildExecuteSteps/parseTaskWavesFromPlan）零改动
  - topoError（环）维持 throw
  - taskFiles 三层守卫保留（none/light 零影响）
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
