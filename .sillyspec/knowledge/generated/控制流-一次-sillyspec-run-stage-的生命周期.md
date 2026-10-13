---
source: scan/ARCHITECTURE.md
section: 控制流：一次 `sillyspec run <stage>` 的生命周期
generated_at: 2026-10-13T00:36:46.743Z
---

# ARCHITECTURE — 控制流：一次 `sillyspec run <stage>` 的生命周期

```
argv → index.js switch('run') → runCommand(src/run/command.js:157)
   ├─ 解析 --done/--reset/--reopen/--skip/--auto 等 flag
   ├─ worktree 副本漂移守卫：specBase 命中 worktree 副本 → 自动锚回主仓
   ├─ new ProgressManager() 读当前 change 进度
   ├─ 若 --auto → runAutoMode(src/run/command.js:824) 连跑 brainstorm→plan→execute→verify
   ├─ 否则 → runStage(src/run/stage.js:31)
   │     ├─ stage-contract.checkTransition 校验状态转换
   │     ├─ stageRegistry[stage].steps 取步骤定义
   │     ├─ scan 阶段：perProject steps 按 projectNames 展开
   │     ├─ 逐 step：输出 prompt 让 AI 执行 → --done 写 steps 表
   │     └─ 阶段全部 done → completeStage 推进 changes.current_stage
   ├─ 关键节点调 SyncManager 同步平台
   └─ 返回
```