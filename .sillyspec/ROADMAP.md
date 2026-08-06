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
