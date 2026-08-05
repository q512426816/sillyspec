---
author: qinyi
created_at: 2026-08-05T22:01:04
---

# 提案（Proposal）— 工具驾驭反馈修复

## 一句话

修复一次工具驾驭复盘发现的 5 个 SillySpec 痛点（worktree doctor 依赖漂移、cd 守卫误拒、plan 命令校验缺失、acceptance/schema 不对齐、execute --done 推进不可见），顺手抽两个共享 helper 消除双写漂移。

## 背景

用 SillySpec 管理 sillyhub 项目时，复盘点暴露了工具自身的 5 处缺陷：doctor 检测依赖漂移漏比主仓 lockfile、cd 进 worktree 副本被硬拒（mainSpecBase 算好却不用）、plan 蓝图写不存在的 monorepo 命令无人拦、acceptance 字段与 schema 形态不符能过 plan、execute --done 推进信号被长 prompt 挤出 tail。根因均有明确代码位置（见 design.md §1）。

## 提案要点

1. **doctor 真能修 deps**：加 worktree-vs-main drift 检测，`--fix` 真正强制重装，补 `--change` flag 对齐已有提示。
2. **cd 守卫自动锚定**：worktree 副本漂移场景自动用主仓 spec 继续，不再 exit(2)。
3. **plan 拦截幽灵命令**：plan-postcheck 新增命令存在性校验（monorepo 子目录感知），硬阻断。
4. **acceptance 软约束**：plan 审查清单要求对照实际 schema 核验 + best-effort 字段 grep 兜底。
5. **execute --done 可见推进**：输出末尾追加 `🚀 advanced to step N/M` 锚定行。
6. **抽 helper 去重**：`checkDepsFreshness` 统一 doctor/execute 入口；`validateScriptCommands` 统一 scan/plan-postcheck。

## 不在范围内 / Non-Goals

- **Claude Code harness 后台 bash 任务被 kill**（复盘问题 6）：非 SillySpec 可控，仅加「长测试前台跑」prompt 软约束。
- **通用「健康检查框架」重构**：超出修痛点范围，YAGNI。
- **sillyhub 项目本身的 task-07**：只改 SillySpec 工具侧。
- **新 stage / 新规模档 / 新持久 schema**。

## 影响范围

跨 4 模块：worktree（doctor）、runtime（cwd 守卫 + execute 输出 + deps 入口）、stages（plan/scan postcheck + plan 审查）、cli-entry（doctor --change）。详见 design.md §6 文件变更清单。

## 预期收益

- doctor `--fix` 名副其实（用户不再手动 `pnpm install --force`）。
- worktree 工作流体验顺（cd 进 worktree 不再被拒）。
- plan 阶段挡住幽灵命令，减少 execute 阶段的无效返工。
- execute --done 推进可一眼确认，减少二次 grep。
- doctor/ensureDepsFreshness、scan/plan-postcheck 两处双写漂移消除。
