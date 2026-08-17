---
author: qinyi
created_at: 2026-08-17 16:14:16
---

# Requirements — execute 阶段 task 执行 batch 调度

## FR-01 batch 分派指导注入

execute 阶段 Wave 执行 prompt（`buildWavePrompt` 产出）必须包含 batch 分派指导：默认每 task 独立子代理；同 Wave 内 allowed_paths 两两无交集且无 provides/expects_from 契约依赖时，可合并为 batch（最多 3 个 task）交给单个子代理串行执行。

## FR-02 batch 内逐 task 串行实现协议

batch 子代理按 task 顺序逐个完成**实现闭环**：读取 task-N.md → 实现 → 跑该 task 的 verify 命令 → 记录该 task 报告（改动文件清单 / verify 结果 / 卡点）→ 才能开始下一个 task；最终回复必须输出 batch 内全部 task 的逐 task 报告清单。**禁止 batch 子代理写 review.json 或勾选 plan.md checkbox**——task 审查、review.json 产出与 checkbox 勾选归主 agent，在 batch 子代理返回后逐 task 进行（与独立子代理模式现状职责一致，implementer 不自报审查结论）。

## FR-03 review 独立性不变式

batch 合并不得改变 task review 契约：每个 task 仍产出独立的 review.json（文件名、schema、schemaVersion、base/head 对账语义均不变）；review.json 由主 agent 审查产出（现状语义，execute.js「调度者 + 审查者」+「不信任 implementer 自报结果」铁律），不因 batch 下放给实现子代理。

## FR-04 越权即停协议

batch 子代理在任一 task 执行中发现必须修改 batch 内其他 task 或 batch 外任何 task 的 allowed_paths 文件时：立即停止该 task 及后续 task，在最终回复中报告冲突文件与卡点，由主 agent 决定重分 Wave、调整 plan 或回退为独立子代理执行。禁止私自越界实现。

## FR-05 并行语义保留

「同 Wave 必须并行」铁律改写为「同 Wave 的多个子代理（独立或 batch）必须并行启动」——batch 内部串行，batch 之间与独立子代理之间仍并行；Wave 间依赖顺序不变。

## FR-06 测试与回归

- execute 派发相关集成测试新增 batch 调度断言（prompt 含 batch 指导、上限 3、逐 task 串行协议、越权即停协议）
- 既有全部测试零回归（npm test 全绿、npm run lint 通过）

## NFR-01 文档同步

触及 `src/stages/execute.js` prompt，按 CLAUDE.md 同步规则更新 `docs/prompt/_extracted.json`（重跑 extract 脚本）与 `docs/prompt/execute.md` 镜像；execute SKILL 如涉及调度描述同步 `.claude/skills/sillyspec-execute/`。
