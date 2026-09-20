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

### 文件所有权登记（claims+心跳，D-004 延后）
- **来源**：change `2026-09-14-apply-conflict-hardening` D-004@v1
- **现象**：apply 落地的交付文件可被并行会话的工作区级 git 操作（restore/clean 类）冲掉（troubleshooting §64）。
- **不做理由**：裸 git 拦不住，单独做收益不抵复杂度（该变更 design 非目标第 1 条）。
- **复潮条件**：本护栏（merge 写回收口暂存 + apply-manifest 漂移检测 + 活跃 quick guard 相交拦截，见 change `2026-09-14-apply-conflict-hardening`）落地后，仍发生 apply/裸 git 冲掉造成实际损失 ≥2 次 → 重开评估。

### verify gate parity/探针增量缓存（quick-4af1acc3 D② 延后）
- **来源**：2026-09-20 工具缺陷调查报告问题 D（性能面）+ quick-4af1acc3（明细落盘已收口，缓存另案）
- **现象**：verify gate 单次 3-4 分钟全量重跑探针管线，contract parity 多根扫描 1633 端点是主要成本之一；失败轮与修复轮之间无增量。
- **不做理由**：缓存失效面广（diff/HEAD/facts 三输入指纹），quick 期做易引 staleness 假绿；verify-facts.json 可当缓存键的方案需单独 design（键设计+失效语义+回退链）。
- **复潮条件**：单仓 verify gate 均值仍 >2min 且同一变更多轮 verify 复跑 ≥3 次的场景再现实证 → 立 full 变更设计缓存键与失效契约。
