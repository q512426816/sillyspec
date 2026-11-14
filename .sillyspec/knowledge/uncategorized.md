# 未分类知识

> 项目特定的架构经验、历史记录、尚未提炼成通用 pattern 的知识。
> 已分类的迁移到：`sillyspec-gotchas.md`（工具坑）/ `testing-gotchas.md`（测试坑）/ `patterns.md`（架构）/ `known-issues.md`（项目坑）/ `conventions.md`（约定）。
> 已修复项保留并标注状态，便于回溯。INDEX.md 不索引本文件——条目成熟后请迁出到分类文件并加 INDEX 索引。

（清账留痕：2026-10-08 由变更 2026-10-08-knowledge-inbox-triage 清空。历史 39 条 + 1 个掉标题孤儿块全部迁出：known-issues.md 22 块（🟢 已修复 15 / 🟡 在案 7）、patterns.md 8 条、conventions.md 2 条、testing-gotchas.md 4 条、sillyspec-gotchas.md 4 条；INDEX.md 已补全对应索引。新发现未成熟经验仍先落本文件，成熟后迁出并加 INDEX 索引。）

## PowerShell .ps1 包装 CLI 会吞掉 `--` 分隔符——带 pathspec 的命令在 PowerShell 下必失败
npm 全局 CLI 在 Windows 经 nvm4w 的 .ps1 shim 调用时，PowerShell 解析器会把 `--`（参数分隔符）当特殊 token 消费、不透传给脚本——`sillyspec wt-commit ... -- src/a.js` 这类「-- 后跟精确 pathspec」的命令在 PowerShell 下报「缺少提交路径」，同命令在 Git Bash 下正常。规避：带 `--` 的 CLI 调用一律走 Bash 通道；或 CLI 侧提供 --pathspec-from-file 兜底。（来源：2026-11-14-scan-incremental task-01 实证）
