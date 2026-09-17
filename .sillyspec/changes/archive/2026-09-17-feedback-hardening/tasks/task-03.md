---
id: task-03
title: '隐式 Wave 串行——buildWavePrompt implicit 分支 + 检查 0.8 文案 + plan-postcheck error→warning + 测试随行'
title_zh: '隐式 Wave 串行——buildWavePrompt implicit 分支 + 检查 0.8 文案 + plan-postcheck error→warning + 测试随行'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 08:59:25
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/stages/execute.js
  - src/stages/plan-postcheck.js
  - test/plan-optimization.test.mjs
  - test/plan-postcheck-cross-repo.test.mjs
  - test/plan-execute-contract.test.mjs
target_files:
  - src/stages/execute.js
  - src/stages/plan-postcheck.js
  - test/plan-optimization.test.mjs
  - test/plan-postcheck-cross-repo.test.mjs
  - test/plan-execute-contract.test.mjs
goal: >
  无显式 Wave 的 plan（light 级无任务区）统一为隐式串行执行：buildWavePrompt 对 wave.implicit 下发串行
  调度指令（替掉「必须并行启动」），plan-postcheck 无显式 Wave 共享路径从 error 降 warning——
  消灭「宣称自动串行 vs postcheck 硬拦要求显式 Wave」的口径打架与被迫补 6 个 Wave 段的摩擦（用户 2026-09-17 负面③）。
implementation:
  - 'execute.js buildWavePrompt：wave.implicit === true 时——返回头改「## Wave N（隐式合成——plan.md 无显式 Wave 划分，串行执行）」；「你的角色」清单第 1 条「同 Wave 内可并行」措辞与「调度要求」第 1 条「必须并行启动」换为串行铁律（任务逐个完成：单子代理串行逐个或逐个启动子代理等待完成再下一个，禁止并行启动；理由=未做过文件正交/契约链核查，并行不安全）；batch 指引条件 2 括注「契约 task 由独立子代理并行处理或落在不同 Wave」（:1274）隐式分支收敛为「由独立子代理逐个（串行）处理或落在不同批次」'
  - '显式 Wave 路径输出逐字节不变（模板字符串按 implicit 分支参数化，非 implicit 走原文）'
  - 'execute.js 检查 0.8 错误文案（:204-208）重述：「其下的引用行不会被收容——所有任务将退化为单个隐式 Wave 串行执行（Wave 分组意图丢失，无法按组并行/验收）」；检查 0.8/0.9 拦截行为本身不变'
  - 'parseWavesFromPlan 隐式合成处注释（:662-665）扶正：单 Wave 串行执行现为真实行为（锚 buildWavePrompt implicit 分支），不再是悬空宣称'
  - 'plan-postcheck.js waveOfTask===null 分支（:595-601）：error → warning，措辞「execute 将按单个隐式 Wave 串行执行（共享文件安全）；显式划分 Wave 可获并行收益（同 Wave 内仍禁止共享文件）」；:590-591 注释「execute 全并行」口径同步改串行口径'
  - 'test/plan-optimization.test.mjs Test 5f（:365-372）断言随行：!result.ok 改 result.ok（error→warning，warnings 含新措辞锚点「隐式」与 service.py）'
  - 'test/plan-postcheck-cross-repo.test.mjs 场景 5（:140-142）断言随行：同走 waveOfTask===null 分支，!r.ok 改 r.ok、errors 断言改 warnings 断言（场景 6 r.ok=true 不受影响）'
  - 'test/plan-execute-contract.test.mjs 补断言：parseWavesFromPlan 无显式 Wave 返回 implicit:true 单 Wave（既有）+ buildWavePrompt(implicit wave) 输出含串行铁律/禁并行措辞与「隐式合成」头标注，显式 Wave 输出仍含「必须并行启动」'
acceptance:
  - 'buildWavePrompt 对 implicit Wave 输出：头含「隐式合成」标注、调度要求含串行铁律与「禁止并行启动」、无「必须并行启动」字样'
  - 'buildWavePrompt 对显式 Wave 输出与改前逐字节一致'
  - 'plan-postcheck：无显式 Wave + 多 task 共享 allowed_path → ok=true 且 warnings 含提示；显式 Wave 同 Wave 共享路径 error 不变（Test 5d 不动）'
  - '检查 0.8（wave-like 畸形标题）仍 error，但文案为串行退化口径'
verify:
  - 'npm test -- test/plan-optimization.test.mjs'
  - 'npm test -- test/plan-execute-contract.test.mjs'
  - 'npm test（全量回归）'
constraints:
  - '不动 parseWavesFromPlan 解析逻辑与 implicit:true 标记（既有断言兼容）'
  - '不动显式 Wave 语义（同 Wave 共享 error / 检查 0.9 / 拓扑自动修复说明）'
  - '不动 stage-review-checklist.js（其 Wave 说明与串行口径不矛盾）'
  - 'stages/plan.js:199 宣称不动（现为真实行为）'
---
