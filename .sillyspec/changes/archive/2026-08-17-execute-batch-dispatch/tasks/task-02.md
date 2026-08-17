---
id: task-02
title: execute-dispatch integration test batch dispatch assertions
title_zh: "#2 execute-dispatch 集成测试新增 batch 调度断言 + 既有断言适配"
author: qinyi
created_at: 2026-08-17 16:48:08
priority: P0
depends_on: [task-01]
requirement_ids: [FR-06]
allowed_paths:
  - test/dispatch/execute-dispatch-integration.test.mjs
goal: 为 buildWavePrompt batch 调度改造补集成测试（FR-06）——新增断言组覆盖 design「接口定义」全部 prompt 文本契约，既有断言零回归。
implementation: |
  断言设计要点（本卡只写断言维度；具体措辞执行时从 task-01 落地后的 buildWavePrompt 实际产出读取，不预写死字符串）：
  1. 新增独立用例组（沿用现有「--- N.」编号风格 + assertContains/assertNotContains 工具），
     对 Local 路径 buildWavePrompt 产出断言以下维度：
     a. batch 指导存在：三条件语义（allowed_paths 两两正交 / 无 provides-expects_from 契约链 / 组大小上限 3 个 task）
     b. 逐 task 实现闭环：batch 内按顺序逐个完成（实现→跑该 task verify→记录报告→才下一个），最终输出逐 task 报告清单
     c. 职责边界：batch 子代理不写 review.json、不勾选 plan.md checkbox——审查与勾选归主 agent
     d. 越权即停：需改 batch 内其他 task 或 batch 外 task 的 allowed_paths 文件时立即停止并报告冲突
     e. 并行铁律改写：同 Wave 多个子代理「独立或 batch」+「并行启动」组合表述存在
     f. 旧独占文案「每个任务必须由独立子代理执行，你不要自己写代码」不再作为唯一调度形态
        （改为默认形态 + batch 例外结构；断言形态按实际产出定——NotContains 锚旧独占整句或结构断言默认+例外并存）
  2. 既有断言适配：第 1 组 Local 零回归等用例中与改写文案冲突的关键词断言按新产出适配；
     只做必要适配，不弱化既有用例判定量（派发三路径/worktree/task-08 跨仓组语义原样保留）。
  3. 断言锚点唯一来源 = design.md「接口定义」节 4 条契约，防措辞漂移；
     断言 needle 先跑 buildWavePrompt 取实际产出字符串再落盘。
acceptance:
  - 新增断言覆盖 design「接口定义」全部契约（batch+上限 3+逐个完成 / 不写 review 不勾选 / 独立或 batch+并行启动 / 旧独占表述不再独占）
  - 既有断言全部保留判定量并通过（零回归）
  - 断言字符串与 task-01 落地后实际 prompt 产出逐字一致
verify: node test/dispatch/execute-dispatch-integration.test.mjs && npm test
constraints: 不改 src（断言对象是 task-01 产出）；不动既有用例语义仅必要关键词适配；断言维度锚 design「接口定义」，具体字符串以实际产出为准不预写。
---
