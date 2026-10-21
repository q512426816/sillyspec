---
author: flow-machine-draft
created_at: 2026-10-21T13:38:03.403Z
---
# 任务注册表（Tasks）— 2026-10-21-p0-p1-hardening

- [x] task-01: P0-1 回归锚核验——回收链五项能力已由 2026-10-21-review-dispatch-answer-salvage 落地：跑 test/review-dispatch.test.mjs + test/sillyhub-mcp-platform-fixes.test.mjs 确认全绿（不重复实现，requirements FR-01 登记回归锚）
- [x] task-02: restoreMainStash 冲突标记机械扫描（stash 面文件，行首三形态）——命中保留 stash+清单+处置指引+进 apply errors（exit 非零）；导出 restoreMainStash/scanConflictMarkers 供测试；干净恢复行为不变
- [ ] task-03: completeStep/completeStepBurst 心跳 wrapper——>60s 每分钟一行 stderr 进度行（含旁路核对建议），finally 清理；常规路径零输出；同步后台化既有行为保持
- [ ] task-04: machine-interface stage-review 预警面扩 brainstorm/plan——默认档 hint 与 --full 档探测条件从 execute 单值改三值集合，文案按 stage 参数化；verify 维持排除
- [ ] task-05: 所有权匿名同机自动升级（assertChangeOwnership 新分支 takeover-anon-upgrade）+ handoff 交接块 --takeover 预告行
- [ ] task-06: checkWorktreeDirIgnored 三态分流（已忽略/确未忽略/探测失败）+ 一次重试 + 探测失败 fail-open 放行与警告
- [ ] task-07: doctor local_yaml_integrity 维度（坏 YAML/BOM finding）+ config known-failures list/add/remove 子命令（行级手术保注释，原子写无 BOM，坏 YAML 拒改）
- [ ] task-08: watcher/bg-sync detached spawn 后 awaitSpawnSettled 稳定化（spawn/error 事件或 150ms 上限，已退出立即返回）
- [ ] task-09: 新增/扩展测试全部落地（apply-stash-conflict-scan / done-heartbeat / gate-stage-review-hint 扩 / change-ownership-guards 扩 / handoff-takeover-hint / worktree-gitignore-probe / config-known-failures / doctor-local-yaml / spawn-settle）且变更测试面全绿
