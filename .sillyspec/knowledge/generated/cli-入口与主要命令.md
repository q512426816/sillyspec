---
source: scan/PROJECT.md
section: CLI 入口与主要命令
generated_at: 2026-10-13T00:36:46.818Z
---

# PROJECT — CLI 入口与主要命令

`bin/sillyspec.js` 是 Node shebang 入口，转发到 `src/index.js` 的命令路由（64 个 case 分支，子命令模块全部 `await import` 懒加载）。顶层命令覆盖完整变更生命周期：

- `init` — 绿地项目初始化（路线图 + 需求文档；平台模式写双指针）
- `setup` — AI 工具 / MCP 安装引导
- `brainstorm` / `plan` / `execute` / `verify` / `archive` / `auto` — 核心五阶段 + 自动模式（顶层别名，等同 `run <stage>`）
- `scan` — 项目代码库扫描（`--quick / --standard / --deep` 三档 + `--force-rescan`）
- `status` / `doctor` — 查看进度 / 自检修复（只读辅助阶段）
- `quick` — 跳过 brainstorm/plan 的快速通道（低风险小任务；`--linked-changes` / `--files` / `--allow-new` / `--allow-delete` / `--force-baseline` / `--confirm` 守卫 flag）
- `explore` — 只读自由讨论
- `progress` — 进度库管理（init / status / show / check / repair / validate / reset / set-stage / add-step / update-step / complete-stage / batch）
- `worktree` — worktree 生命周期（create / apply / assess / meta / diff / list / cleanup / doctor）
- `dispatch` — SillyHub 派发能力探测与策略生成（probe / hint，agent 调用桥）
- `platform` — 平台连接 / 同步 / 审批（connect / disconnect / sync / sync-docs / status / pull / resolve / approve / reject / pointer）
- `docs` — 文档工具（migrate / check / gate）
- `knowledge` — 知识库管理（search / inspect / validate / refresh / propose）
- `gate` / `derive` / `backfill-reviews` / `register-stage-review` — 机器接口 / 评审回填
- `workflow` / `modules` / `local` / `config` / `runtime` / `change-rename` / `dashboard` — 工作流 / 模块文档 / 本地配置 / 运行时 / 改名 / 面板

> 恢复中断工作不靠专用 CLI 命令：进度由 `--done` 自动落盘，恢复用 `status` 查看进度后 `run <stage>` 续跑（`--reopen --from-step` 可重开已完成阶段）。