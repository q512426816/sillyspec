# SillySpec ROADMAP

> 架构级 / 延后项登记。已完成项归档至 changes/archive/。

## 延后项

### 多代理中间态 import 链污染（架构级延后，P2）
- **来源**：change `2026-08-06-sillyspec-self-tooling-fixes` D-05
- **现象**：多个子代理并行实现时，某子代理中途写坏 `packages/*/` 下文件（注释 SyntaxError），污染 import 链，导致其他子代理 / 主仓代码加载失败。
- **根因**：execute 批量派子代理并行改代码，未完成 / 未测试的中间态直接落入共享 import 链，无隔离边界。
- **候选解**：
  1. worktree-per-task（每 task 独立 worktree，中间态物理隔离）
  2. import 沙箱（子代理改动先进暂存区，验证通过才应用入链）
  3. 关键路径 task 顺序执行（牺牲并行换稳定）
- **决策**：延后（P2），需独立 design 评估隔离边界 vs 并行收益。

### _extract.mjs 提取受 local.yaml 环境影响（工具债，P2）
- **来源**：change `2026-08-17-execute-batch-dispatch` verify 遗留 NOTES①
- **现象**：主仓重跑 `node docs/prompt/_extract.mjs` 会向 execute 三 Wave prompt 注入「派发后端提示：SillyHub MCP 已配置」动态段（buildWavePrompt 检测 local.yaml mcp 段），worktree（无 local.yaml overlay）提取则不含——镜像进了 git，生成却依赖本机 gitignore 配置，跨环境重跑必漂移。
- **候选解**：_extract.mjs 提取时跳过/固定 local.yaml 检测（提取输入应只有源码）。
- **决策**：延后（P2，独立 quick 可修；本次已恢复镜像至 worktree 产物版保持一致）。

### worktree apply 后 cleanup 删分支 ref（fail-closed 盲区，P2）
- **来源**：change `2026-08-17-execute-batch-dispatch` verify 遗留 NOTES②（与 memory execute-batch-cleanup-deletes-branch-recovery 同源第二例）
- **现象**：`worktree apply` 成功后 cleanup 删除变更分支 ref，task commit（task review.json 的 base/head 引用）变 dangling，gc 后即真丢失。
- **根因**：fail-closed 保护未覆盖 apply 后 cleanup 这条调用路径（首例为 execute --done 批量完成路径）。
- **决策**：延后（P2；cleanup 删分支前应保留 ref 或校验 review.json 引用可达。本次已手动重建分支 sillyspec/2026-08-17-execute-batch-dispatch@470effe 保护）。
