---
id: task-06
title: 'sync module cards for gate profile wiring and thresholds'
title_zh: '模块卡同步——core-engine/runtime/cli-entry 三卡更新'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 10:02:07
priority: P1
depends_on: ['task-01', 'task-02', 'task-03', 'task-05']
blocks: []
requirement_ids: [FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-002@v1, D-008@v1]
expects_from:
  task-05:
    - contract: CalibratedThresholds
      needs: [thresholds-final]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
target_files:
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
goal: >
  把 quick 出口分级门禁的信号/接线/双出口/阈值定稿同步进 core-engine、runtime、cli-entry 三张模块卡（模块卡唯一写者，吸收 task-05 的落卡需求），使模块文档与代码事实一致。
implementation:
  - core-engine.md——头行「最近变更」前插本变更条目（2026-09-14）；契约/评审族清单登记新文件 src/quick-gate-profile.js（computeGateProfile + THRESHOLDS 单点，与 change-risk-profile/scope-audit 同卡）+ change-risk-profile 条目补路径模式风险表说明 + 门禁接线数据流（producer=quick-gate-profile 挂 review.gateProfile，consumers=complete-handlers/quick-audit/scope-audit）；THRESHOLDS 定稿值按 task-05 校准回写后的实际常量抄录
  - runtime.md——注意事项段按既有日期条目惯例追加 2026-09-14 条目，记录 run/shared.js auditQuickCompletion 画像挂载（review.gateProfile）、run/complete-handlers.js [gate] 落账与 --no-docs 豁免留痕、run/quick-audit.js [gate] advisory 打印块、run/command.js --no-docs knownFlags 登记透传
  - cli-entry.md——变更索引（表格）追加 2026-09-14 行，记录 index.js scope-audit 命令分支 gateProfile 双出口（renderScopeAuditTable 画像段 + --json gateProfile 字段）；三卡新写 file:line 引用逐条对源码核真实（docs check 口径）
acceptance:
  - 三卡均含日期 2026-09-14 的本变更条目（core-engine 头行最近变更 + runtime 注意事项段 + cli-entry 变更索引表），frontmatter updated_at 同步刷新
  - core-engine.md 的 THRESHOLDS 定稿值与 src/quick-gate-profile.js 实际常量逐字一致（执行时以代码为准读取，非 design 初值）
  - 覆盖面齐全——core-engine 含 quick-gate-profile.js 新文件条目/路径模式表/接线数据流，runtime 含四接线点，cli-entry 含表格与 --json 双出口
verify:
  - sillyspec docs check --paths .sillyspec/docs/sillyspec/modules/core-engine.md,.sillyspec/docs/sillyspec/modules/runtime.md,.sillyspec/docs/sillyspec/modules/cli-entry.md
  - npm test
constraints:
  - 只改三张模块卡本体——sidecar changelog 不在授权面（条目落各卡卡内既有段落）、不写其他模块卡、不动 src 与 test 代码（纯文档同步）；不改 _module-map.yaml（新文件 paths 归属按现有 core-engine/runtime 前缀匹配已覆盖）
  - THRESHOLDS 定稿值执行时读 src/quick-gate-profile.js 实际常量抄录，不照抄 design.md 初值（初值可能被 task-05 校准推翻）
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
