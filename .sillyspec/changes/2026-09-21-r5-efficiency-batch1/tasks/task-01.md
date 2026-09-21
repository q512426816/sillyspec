---
id: task-01
title: 'plan 并批默认提示词注入 + plan-postcheck checkBatchAdvisory advisory（含 test/plan-batch-advisory.test.mjs）'
title_zh: 'plan 并批默认提示词注入 + plan-postcheck checkBatchAdvisory advisory（含 test/plan-batch-advisory.test.mjs）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 11:53:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-002@v1]
allowed_paths:
  - src/stages/plan.js
  - src/stages/plan-postcheck.js
  - test/plan-batch-advisory.test.mjs
target_files:
  - src/stages/plan.js
  - src/stages/plan-postcheck.js
  - NEW:test/plan-batch-advisory.test.mjs
goal: >
  plan 阶段把「文件正交任务默认并批」写进生成指令，plan-postcheck 加 warning 级 advisory
  （正交未并批提示 + 批数护栏提示），摊平 execute 扇出的重复上下文重建（R4-S-F 5 任务 2 batch 实证收益）。
implementation:
  - src/stages/plan.js:142 stepGeneratePlan prompt 段 Wave 拆分指令后追加并批默认三行（不变式表述：2–4 任务/批 且整 Wave 批数 ≥ min(3, 任务数)；并批不跨风险级；护栏 warning 可显式接受）
  - src/stages/plan-postcheck.js 新增导出 checkBatchAdvisory({tasksMdText, planMdText, taskCards}) 返回 Array<{level:'warning', code:'batch_orthogonal_unbundled'|'wave_inflight_below_floor', message}>，复用 collectTaskDepMap（src/stages/plan-postcheck.js:460）与 parseTargetFiles（src/stages/plan-postcheck.js:118）
  - 接线进 plan postcheck 的 warnings 通道（{ok,errors,warnings} 先例，不进 errors——门禁轮次不增）
  - 新增 test/plan-batch-advisory.test.mjs：正交未并批触发 / 护栏缺口触发（5 任务 2 批） / 已并批不误报（5 任务 3 批）/ 共享文件不提示 / 返回数组双命中
acceptance:
  - checkBatchAdvisory 对四场景判定正确（纯函数，无 IO）
  - plan postcheck 输出含 warning 不含新增 error（阻断面零变化）
  - stepGeneratePlan 渲染文本含并批默认三行（文本钉）
verify:
  - node --test test/plan-batch-advisory.test.mjs
  - npm test
constraints:
  - advisory 只进 warnings 通道，禁触碰 errors 阻断语义（红线：不动门禁）
  - 不改 plan-postcheck 既有导出签名
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
