---
author: qinyi
created_at: 2026-08-19T11:07:44+08:00
---

# 提案书（Proposal）

## 动机

SillySpec 自身流程状态机存在三个 fail-open 缺陷（multi-agent-platform 仓两份 debt 文档实证）：reopen 后未执行步骤被静默回填 completed、execute 批量完成放行未实现 task、worktree apply 被 baseline 占位文件的 add/delete 假冲突挡死且冲突根因被静默。三者同属「进度绿但产物缺失 / 错误被吞」家族，直接侵蚀 SillySpec 作为流程状态机的核心承诺——进度库与实际产物一致。

## 关键问题

1. **reopen 静默回填**：`--reopen --from-step N` 后任一次 `--done` 把 N 之后从未执行的 stale 步骤直接标完成（`src/run/complete.js:282-296` 无条件回填），进度库与实际产物脱节；`progress complete-stage` SQL 同病（`stage-machine.js:95`）。
2. **execute 批量完成误标未实现 task**：`detectExecuteBatchFinish` 代码核验是整变更级——其它 task 有真实改动即可批量放行；cannot_verify 自动草稿被 `shouldAutoCheckTask` 当作可勾选依据，plan checkbox 被自动勾掉，「表面完成、代码不存在」。
3. **apply 3way 假冲突 + 冲突列表静默**：diffBase 锚 baseline checkpoint（含 CLI 造的 0 字节占位文件，main 从未有过）→ patch 在 main 侧呈 add/delete 冲突；`--3way` 失败时冲突文件列表可能为空（"(未能获取冲突文件列表)"），真实根因被吞。

## 变更范围

- W1：reopen stale 回填改 `--confirm` 门控（run --done 拦截 + complete-stage 拒绝 + audit log）。
- W2：execute 批量完成三层零 diff 守卫（勾选层实测 diff / 批量层逐 task 复核 + blockedTasks / 生成层回归锁定）。
- W3：worktree apply patch 锚点默认 merge-base（交付集合锚不变）+ `--base baseline` 回退 flag + 冲突列表 stderr 解析不静默。
- 三个新测试文件 + file-lifecycle/模块文档同步。

## 不在范围内（显式清单）

- 不改 reopenStage 状态置位逻辑（fromIdx 前保持 completed，debt 所述"显示清零"不复现）。
- 不补 waiting 态消费记录（waitAnswers 审计已有）。
- 不移除 execute 批量完成机制与 cannot_verify 草稿兜底（只加守卫）。
- 不清理历史 verify-required-evidence.json 幽灵数据（verify 阶段自然消化）。
- 不动 worktree apply 既有 dirty 拦截 / 允许清单 gate。

## 成功标准（可验证）

- reopen 后无 `--confirm` 的 `--done` 不回填 stale、阶段不完成（阻断 + 指引文案）；`--done --confirm` 回填且 audit log 落一条 `reopen-stale-backfill`。
- 草稿（reviewerNotes 含 `auto-generated draft`）零有效 diff 时不自动勾选 checkbox、不参与批量放行，`blockedTasks` 列出阻断 task；真实 pass review 行为不变。
- 占位文件场景 apply 干净落盘（merge-base 锚点）；`--base baseline` 恢复旧行为；冲突时错误信息含文件列表或原始 stderr 尾部。
- `npm test` + `npm run lint` 全绿（含三个新测试文件）。
