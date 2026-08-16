---
author: qinyi
created_at: 2026-08-16 15:52:30
---

# 提案书（Proposal）

## 动机

2026-08-16 五角度自身缺陷审计（self-audit-2026-08-16.md）发现 SillySpec 状态机与守卫存在 4 项 fail-open 缺陷。四者同属「行为语义」类，均让 CLI 在失败/越权场景下静默放行——agent/CI/hook 按 exit code 或进度状态消费时感知不到问题，与「流程控制器必须诚实报告推进」的定位直接冲突。

## 关键问题

1. **`--done` gate 失败 exit 0（A5）**：`complete.js:328-329` gate 失败回滚 return 不设 `process.exitCode`，CLI 打印 ❌ 后仍 exit 0。agent/CI 按退出码判断成败即 fail-open——同仓 quick 审计 blocked→exit 1 的惯例分裂。
2. **`--done` 绕过转换守卫 + auxiliary 污染 currentStage（B6）**：`--done` 直接进 `completeStep` 不查 `checkTransition`（runStage 才查）；status/doctor 等 auxiliary 跑一次即写 `progress.currentStage`，fromStage 变 status 后跳阶段静默放行（AUXILIARY_STAGES 作 fromStage 一律放行）。
3. **status/doctor 自称只读实则写库（B7/8b）**：auxiliary fallback `initChange` 建 default 变更行 + 落盘 currentStage，与 SKILL「status 只读」矛盾；多 agent 并发 lastActive 互相覆盖；新项目首跑即产幽灵 default 变更。
4. **brainstorm 幽灵变更（B8）**：多活跃变更仓 `run brainstorm` 无 `--change` 静默 auto-create `*-new-change-*`，DB 实锤一小时 4 个幽灵活跃行。

## 变更范围

- 统一辅助阶段语义：constants 定义 read-only auxiliary 分类；auxiliary 统一不写 currentStage；read-only 查询置顶短路。
- `--done` 与 `run` 同源守卫：--done 完成阶段前执行 checkTransition（含 fromStageData）。
- gate 失败 fail-closed 退出码：completeStageGates 消费侧 `stageCompleted===false` → `process.exitCode = 1`。
- brainstorm auto-create gating：多活跃变更仓强制 `--change`。

## 不在范围内（显式清单）

- 不改 `machine-interface.js` 的 gate/derive specBase 分裂（审计 A4，另批裁决）。
- 不改 `docs`/`progress` 未知子命令 exit 0（审计 B10，另批裁决）。
- 不重构 `checkTransition` 契约本身（fromStage/toStage 判定逻辑不变）。
- 不做「写了再还原」的 currentStage 恢复机制（并发下 last-writer-wins 恢复错误）。
- 不为 auxiliary 增加新命令/新门控（纯减法优先）。

## 成功标准（可验证）

- `--done` 阶段产物 gate 失败（含 scan 非平台 failed_post_check）→ exit code 1。
- auxiliary 阶段执行后 `progress.currentStage` 保持主流程阶段不变。
- `run status`/`run doctor`（无写 flag）零副作用：不 initChange、不建 default 行、不 seed steps、不刷新 lastActive。
- 多活跃变更仓 `run brainstorm` 无 `--change` → exit 2 + 引导；0 活跃变更仓 auto-create 保留。
- 既有合法流程（brainstorm→plan→execute→verify→archive 链、同阶段 --done、--reopen 修订、--skip-approval 绕过）不误伤。
- npm test 全量 EXIT=0、lint 通过；新增状态机守卫回归测试。
