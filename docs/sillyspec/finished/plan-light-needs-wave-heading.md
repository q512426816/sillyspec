---
author: qinyi
created_at: 2026-07-04 09:00:00
---

# light plan 不再强制 Wave heading（隐式任务区）

## 背景

plan.md 模板（`src/stages/plan.js`）按复杂度分级：

| plan_level | 任务区写法 | 是否有 `## Wave N` |
|---|---|---|
| full | `## Wave 1` 下 `- [ ] task-XX:` | 是 |
| light | `## Tasks` 下 `- [ ] task-XX:` | 否 |
| none | `## Tasks` 下 `- [ ] task-XX:` | 否 |

plan→execute Contract 校验（`validatePlanForExecute` + `parseWavesFromPlan`，`src/stages/execute.js`）原本只识别 `## Wave N` 段内的 `- [ ] task-XX:` 行。

## 问题

light/none plan.md 用 `## Tasks` 包任务（无 `## Wave N` 标题），`parseWavesFromPlan` 收不到任何 task → `validatePlanForExecute` 报「没有找到 checkbox task」→ light/none 变更**无法进入 execute**。

旧 workaround 是强推用户写 `## Wave 1`，但 light/none 的设计本意就是不必分组（任务少、无并行依赖），强加 Wave 是反模板。

## 修复

`parseWavesFromPlan` 新增隐式任务区识别（`inImplicitTaskSection` 标志）：

1. 遇 `## Tasks` / `## Task` / `## 任务` 标题 → 置位 `inImplicitTaskSection = true`
2. 在隐式任务区内，遇**含 `task-XX` 编号**的 checkbox → 惰性创建隐式 Wave `{ index, tasks: [], implicit: true }` 收容（index 基于已存在 Wave 数递增）
3. 遇任何其它标题（`## 自检`/`## 验收` 等）→ 复位 `inImplicitTaskSection = false`

## 不收的情况（避免误收）

- **非任务区**（`## 自检`/`## 验收`/`## 来源` 等）的 checkbox —— 标题切换时标志复位，与 [plan-postcheck-self-check-checkbox-false-dup.md](plan-postcheck-self-check-checkbox-false-dup.md) 互补：那个防「自检 `- [x]` 被误当 task」，这个让「任务区 `- [ ] task-XX:` 被收容」
- **任务区内无 `task-XX` 编号**的 checkbox（如 `- [ ] 所有单元测试通过`）—— `taskNoMatch` 为空时跳过，避免把验收式条目当 task
- **full plan 行为不变** —— `## Wave N` 仍正常识别，隐式任务区逻辑只在无显式 Wave 时兜底

## 代码位置

- `src/stages/execute.js` `parseWavesFromPlan`：`inImplicitTaskSection` 标志 + 惰性隐式 Wave 创建（`implicit: true`）
- 测试：`test/plan-execute-contract.test.mjs`「light plan（## Tasks 无 Wave）contract 通过」
- `implicit: true` 标记当前仅作来源标识，下游 Wave prompt 生成对显式/隐式 Wave 一视同仁
