---
plan_level: full
author: qinyi
created_at: 2026-08-17 16:45:00
---

# 实现计划（Plan）：execute 阶段 task 执行 batch 调度

## Wave 1（基础：源码调度指令改造）
- [x] task-01: execute.js buildWavePrompt batch 调度指令改造（覆盖：FR-01, FR-02, FR-03, FR-04, FR-05）

## Wave 2（依赖 Wave 1：验证与镜像，两 task 文件正交）
- [x] task-02: execute-dispatch 集成测试新增 batch 调度断言 + 既有断言适配（覆盖：FR-06）
- [x] task-03: 文档同步——_extracted.json 再生、execute.md 镜像逐字替换、SKILL.md 核对、stages.md 变更索引（覆盖：NFR-01）

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | buildWavePrompt batch 调度指令 | W1 | P0 | — | FR-01~05 | :846 默认+batch 例外、:848 审查职责不变、:891-892 并行铁律+括号注改写、任务摘要节 batch 协议、SillyHub 互斥句；Task Review Gate 段不动 |
| task-02 | dispatch 集成测试 batch 断言 | W2 | P0 | task-01 | FR-06 | 断言锚点：三条件/上限 3/逐 task 实现闭环/不写 review 不勾选/越权即停/「独立或 batch」并行铁律/旧独占文案移除 |
| task-03 | 文档同步五件 | W2 | P1 | task-01 | NFR-01 | node docs/prompt/_extract.mjs → execute.md 逐字替换 → node docs/prompt/_build-site.mjs（index.html 第三镜像再生，plan-review gap 补录） → SKILL.md 调度段落核对（对外纯净） → modules/stages.md 变更索引追加 |

## 关键路径
task-01 → task-02 → npm test 全量验证（task-03 与 task-02 并行，不在关键路径）

## 全局验收标准
- [ ] npm test 全绿（217 文件零回归）、npm run lint 通过
- [ ] buildWavePrompt 产出 prompt 含完整 batch 指导：三条件（文件正交/无契约链/≤3）、逐 task 实现闭环+报告协议、禁止子代理写 review.json/勾选 checkbox、越权即停、「同 Wave 的多个子代理（独立或 batch）必须并行启动」
- [ ] 旧独占文案「每个任务必须由独立子代理执行，你不要自己写代码」不再作为唯一调度形态（改为默认+batch 例外结构）
- [ ] Task Review Gate 段与调度要求 4 逐字未动（diff 验证）
- [ ] docs/prompt/execute.md 镜像与 _extracted.json 逐字一致；SKILL.md 无内部路径/编号泄漏

## 覆盖矩阵（FR 覆盖）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| FR-01 batch 分派指导注入 | task-01 | prompt 断言（task-02 断言锚点「三条件」「最多 3 个 task」） |
| FR-02 逐 task 串行实现协议 | task-01 | prompt 断言「逐个完成」+ 禁止写 review/勾选子代理侧表述 |
| FR-03 review 独立性不变式 | task-01 | 职责边界句 + Task Review Gate 段 diff 未动 |
| FR-04 越权即停协议 | task-01 | prompt 断言「立即停止」+ 与第 7 条铁律消歧句 |
| FR-05 并行语义保留 | task-01 | 「独立或 batch」+「并行启动」断言 |
| FR-06 测试与回归 | task-02 | npm test 全绿 + 新增断言通过 |
| NFR-01 文档同步 | task-03 | _extracted.json 再生 + execute.md 逐字一致 + SKILL/stages.md 更新 |
