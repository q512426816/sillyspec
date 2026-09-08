---
id: task-02
title: 'plan_level 客观复核'
title_zh: 'plan_level 客观复核'
author: 'qinyi'
created_at: 2026-09-09 04:34:27
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/stages/plan-postcheck.js
  - NEW:test/plan-wave-autoderive.test.mjs
target_files:
  - src/stages/plan-postcheck.js
  - NEW:test/plan-wave-autoderive.test.mjs
expects_from:
  provider: [{ contract: adoptPlanWaves proposal 档, needs: [mode, planMdDraft, conflicts] }]
goal: >
  plan_level 客观复核：第二把尺子 warning（不接管）。
implementation:
  - PLAN_LEVEL_SIGNALS 常量单点（files: 8, modules: 2）+ reviewPlanLevelSignal(changeDir, planLevel)：design 清单条数（parseDesignCoverageByRepo）+ 模块跨度（_module-map 前缀命中去重数，未命中文件不计数）+ task 卡数；light/full 且超阈 → warning 文案（信号+建议+一行理由豁免出口）
  - executePlanPostcheck 尾部接入（section 1f 后）：warning 不阻断；full 且 ≤2 文件单模块 → 提示性 warning
acceptance:
  - light + 10 文件 → warning 含信号明细与豁免说明
  - 声明与信号一致 → 零输出
  - design/map 读取失败 → 跳过（fail-open）
verify:
  - node --test test/plan-wave-autoderive.test.mjs（复核分支随 task-01 文件）
constraints:
  - 不阻断（warning only）
  - 不写回 plan.md
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
