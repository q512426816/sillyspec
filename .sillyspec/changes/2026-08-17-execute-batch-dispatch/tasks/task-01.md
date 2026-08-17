---
id: task-01
title: execute.js buildWavePrompt batch 调度指令改造
title_zh: execute 阶段 Wave 调度指令改造——默认独立子代理 + 可选 batch（≤3）串行实现
author: qinyi
created_at: 2026-08-17 16:48:51
priority: P0
depends_on: []
blocks: [task-02, task-03]
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: []
allowed_paths:
  - src/stages/execute.js
provides:
  - contract: buildWavePrompt 产出 prompt 的 batch 调度文本契约（task-02 断言锚点）
    fields:
      - 三条件分组指导（allowed_paths 文件正交 / 无 provides-expects_from 契约链 / 组大小 ≤3）
      - 「batch」+「最多 3 个 task」+「逐个完成」组合表述
      - 职责边界：batch 子代理不写 review.json / 不勾选 checkbox，审查归主 agent
      - 越权即停：「立即停止」+ 与任务边界铁律的 batch 语境消歧
      - 并行铁律改写：「独立或 batch」+「并行启动」+「batch 内部串行」
expects_from: []
goal: >
  把 buildWavePrompt 的「每 task 必须独立子代理」独占调度指令改为「默认独立 + 满足三条件可合并 batch（≤3）」，
  降低同 Wave 正交 task 的子代理调用与限流开销；纯 prompt 文本变更，零 schema/状态机/CLI 行为分支。
implementation:
  - ':846 执行方式独占文案改写：「每个任务必须由独立子代理执行，你不要自己写代码」→ 默认每 task 独立子代理；满足三条件（候选组内任意两 task 的 allowed_paths 无交集、无 provides/expects_from 契约链、组大小 ≤3）可合并为一个 batch 由一个子代理串行实现；契约 task 禁止同批（plan batch 是「尽量同批」，execute 方向相反）；拿不准就不合并'
  - ':848-852 主 agent「调度者 + 审查者」角色保留，明确 batch 子代理只做实现与自验，审查/勾选仍归主 agent；主 agent 收到 batch 报告后逐 task 对照 allowed_paths 检查改动文件清单有无越权 → 按既有 Task Review 流程写 review.json → 勾选 checkbox'
  - ':891-892 调度要求 1 改写：「同一 Wave 的多个子代理（独立或 batch）必须并行启动；batch 内部串行」；括号注「不自行分析依赖关系」同步改为「batch 分组仅按文件正交/无契约链判定，不改变 Wave 依赖语义」'
  - '「任务摘要」节子代理 prompt 要点补 batch 协议：按 batch 内 task 顺序逐个完成实现闭环（读 tasks/task-N.md → 实现 → 跑该 task verify → 记录报告 → 才开始下一个），最终回复输出逐 task 报告清单；不写 review.json、不勾选 plan.md checkbox；越权即停（须改其他 task 的 allowed_paths 文件 → 立即停止本 task 及后续，报告冲突文件回主 agent 裁决）；第 7 条铁律的「本 task」消歧为「当前正在实现的 task」'
  - '「执行方式」节补 SillyHub 互斥句：SillyHub 派发模式下按派发段执行（一 Wave 一 mission），不按 batch 分组；dispatchSection 代码逻辑本身不动'
acceptance:
  - buildWavePrompt 产出 prompt 含「batch」「最多 3 个 task」「逐个完成」组合表述（design 接口定义契约，task-02 断言锚点）
  - 含职责边界表述：batch 子代理不写 review.json / 不勾选 checkbox，审查归主 agent
  - 含改写后并行铁律：「独立或 batch」+「并行启动」（+ batch 内部串行）
  - 旧独占文案「每个任务必须由独立子代理执行，你不要自己写代码」不再作为唯一调度形态（改为默认 + batch 例外结构）
  - git diff src/stages/execute.js 验证 Task Review Gate 段（:904-932）与调度要求 4（先写 review 再勾选）逐字不动，既有第 6 条增量落盘铁律不动
  - dispatch 三条派发路径既有断言零回归（local 模式输出与改前字节一致等，见 execute-dispatch-integration.test.mjs）
verify:
  - node --test test/dispatch/execute-dispatch-integration.test.mjs
  - npm test
  - npm run lint
  - git diff src/stages/execute.js  # 人工核对 Task Review Gate 段（:904-932）与调度要求 4 零变更
constraints:
  - 只改 src/stages/execute.js 单文件，不动 buildWavePrompt 函数签名/返回结构、不动 dispatchSection 判定逻辑、不动 review.json schema、不动 prompt.js 注入框架
  - batch 上限 3（非 plan 的 4）；batch 只合并实现不合并审查；契约 task 禁止同批
  - 纯中文 prompt 文本含中文引号/反引号/CRLF，编辑时注意锚点匹配与模板字符串转义，避免破坏 JS 模板字面量
  - 并行 session 可能同改 execute.js：Edit 前重读最新态，commit 用显式 pathspec 隔离
related_tests:
  - test/dispatch/execute-dispatch-integration.test.mjs（既有断言不涉及旧调度文案，已 grep 证实预期零失效；batch 新增断言归 task-02，本 task 不改测试文件）
---
