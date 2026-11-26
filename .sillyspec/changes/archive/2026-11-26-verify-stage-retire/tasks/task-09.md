---
id: task-09
title: 'doctor legacy——在途 verify 检测+legacyCompleteRetiredStage 底层通路（绕三处 VALID_STAGES 拦截、一次写两态、不加幽灵边）+显式确认+用例（依赖 task-01）'
title_zh: 'doctor legacy——在途 verify 检测+legacyCompleteRetiredStage 底层通路（绕三处 VALID_STAGES 拦截、一次写两态、不加幽灵边）+显式确认+用例（依赖 task-01）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:09
priority: P0
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-05]
decision_ids: [D-004@v1]
allowed_paths:
  - src/doctor-diagnostics.js
  - src/stages/doctor.js
  - src/progress/stage-machine.js
  - test/doctor-legacy-retired-stage.test.mjs
target_files:
  - src/doctor-diagnostics.js
  - src/stages/doctor.js
  - src/progress/stage-machine.js
  - NEW:test/doctor-legacy-retired-stage.test.mjs
goal: >
  doctor 检测在途 verify 变更并提供一次性 legacy 盖完成戳：legacyCompleteRetiredStage 底层通路（绕三处 VALID_STAGES 拦截、一次写两态、不加幽灵边），显式确认后执行。
implementation:
  - src/progress/stage-machine.js 新增 legacyCompleteRetiredStage(changeName)：一次写两态（verify 行 status=completed + currentStage 改 archive），不经 VALID_STAGES.includes 前置拦截（progress.js:1437/step-store.js:16/stage-machine.js:81 三处通道不适用本方法）；幂等（已 completed 直接返回）
  - src/doctor-diagnostics.js 新增检测维度：活跃变更 stage=verify（枚举外行）→ 报告「verify 阶段已退役，检测到在途变更 <名>」
  - src/stages/doctor.js 修复指引补：显式确认（--confirm 或交互确认）后调 legacyCompleteRetiredStage 盖戳，随后指 run archive
  - verify 专属诊断项退役（枚举外阶段行不再触发 verify 类诊断）
  - 新增 test/doctor-legacy-retired-stage.test.mjs：DB fixture（mkdtemp+ProgressManager 造 stage=verify 在途变更）→ 检测命中 → 盖戳后 verify 行 completed+currentStage=archive → 幂等二跑不重复写
acceptance:
  - node --test test/doctor-legacy-retired-stage.test.mjs 全绿
  - doctor 对枚举外 verify 行：提示不崩、盖戳后 status/progress show 无幽灵告警
verify:
  - node --test test/doctor-legacy-retired-stage.test.mjs
  - node test/check-syntax.mjs
constraints:
  - 仅 verify 阶段在途 + 用户显式确认两条件同时满足才盖戳（R-03）
  - 不加 TRANSITION 幽灵边（checkTransition 的 map 不为存量回边）
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
