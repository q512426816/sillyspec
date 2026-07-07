---
author: qinyi
created_at: 2026-07-07T07:36:55
change: 2026-07-06-execute-deps-gate-deadlock
---

# Proposal

## 动机
execute deps 门控（`enforceDepsGate`,run.js:2388）在 worktree 已 cleanup 的终态永久拒绝 `--done`,导致代码已完成（commit main、worktree 按正常生命周期 cleanup）但 execute 派生进度戳永远盖不上,后续 verify/archive 流程被 `checkTransition` 拦截。multi-agent-platform 实测卡 6/12。

## 关键问题（现有方案为何不够）
1. **门控无终态出口**:depsStatus 在 cleanup 后恒为 unknown,门只认 `['linked','installed','n/a']`;自愈 `ensureDepsFreshness` 前提是 worktreePath 存在,cleanup 后不触发 —— 无任何路径把已完成的代码反映到 execute 戳。
2. **诊断指引错误**:门拒绝时提示 `doctor --fix` 重供给,但 worktree 都没了重供给无效,agent 被误导到无效修复。
3. **输出非 fail-loud**:门拒绝走 stderr,但 stdout 残留上次 `completeStep` 的"✅ Step X/N 完成",agent grep stdout 捞进度会误判已推进（实测盲区）。

## 变更范围
- doctor 加 `--align-execute-progress` flag:plan.md 全勾时把 execute 戳对齐到完成（`ProgressManager.alignExecuteToPlan`,显式置 stage status）。
- `doctor-diagnostics.js` 加只读诊断项 `execute-progress-plan-mismatch`。
- `enforceDepsGate` 加诊断分支（终态指向 doctor 对齐/重建 worktree,**不放行**）+ fail-loud 输出块。
- 测试 + 文档（file-lifecycle / modules / skills）同步。

## 不在范围内（显式清单）
- 不动门核心放行标准 `['linked','installed','n/a']`。
- 不让 main commit 存在性成为放行条件（拒绝 fail-open）。
- 不改 sillyspec.db schema。
- 不改 worktree 生命周期（create/cleanup 时机）。
- 不复核 plan.md 声明真实性（verify 兜底）。
- 不重写 doctor 阶段 prompt 自检流程。

## 成功标准（可验证）
- worktree 已 cleanup + plan.md 全勾 → `sillyspec doctor --align-execute-progress --change X --confirm` 后 execute `stageData.status='completed'`,可进 verify（checkTransition 放行）。
- plan.md 有未勾 task → `alignExecuteToPlan` 拒绝对齐（`{ok:false, reason}`）。
- 默认不带 flag → doctor 行为不变。
- `enforceDepsGate` 在 worktree 物理目录不存在时输出"不可用"分支提示（指向 align/create）,且 stderr 含"本次 --done 未完成"块。
- 门核心放行标准不变（linked/installed/n/a 仍放行,其他仍拒）。
- `npm test` 全量通过。
