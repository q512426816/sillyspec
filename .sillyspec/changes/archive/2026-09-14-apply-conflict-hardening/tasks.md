---
author: qinyi
created_at: 2026-09-14 13:40:00
---
# 任务清单（Tasks）

<!-- plan 阶段展开细节（allowed_paths/验收）并写回本文件；Wave 划分见 design.md 总体方案 -->

- [x] task-01: 收口层——merge 写回批末 git add + 三出口统一 writeApplyManifest + rescue 指引行 (depends_on: —)
- [x] task-02: 拦截层——collectActiveQuickGuardFiles 导出 + applyWorktree 锁内相交预检（三分支）+ index.js --force/autoApply 接线 (depends_on: task-01)
- [x] task-03: 检测面——doctor manifest 漂移检查项（两态 sha256 三分支）+ ROADMAP 观察项 + troubleshooting §64 状态更新 (depends_on: task-01)
- [x] task-04: 测试与模块卡——apply-conflict-hardening 集成测试（四块）+ worktree/change-management/core-engine 三卡同步 (depends_on: task-01, task-02, task-03)
