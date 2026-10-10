# 任务注册表（Tasks）— 2026-10-10-worktree-salvage-archive-aware

- [x] task-01: 工件起草——requirements FR 三态（归档跳过不复活 / 未归档行为不变 / 真独有照捞）+ design 四问作答 + 文件变更清单落盘；验证：本文件与 requirements/design 可读且锚齐全
- [x] task-02: 测试先行——test/worktree-spec-salvage.test.mjs 新增场景 3（归档态：原路径不复活、archive 副本不被覆盖、独有产物捞进归档副本）；验证：对现实现跑该场景断言失败（红——现实现会复活原路径）
- [ ] task-03: 实现 src/worktree.js `_salvageSpecArtifacts` 归档感知三态 + warn/details 输出 + JSDoc；验证：场景 3 转绿，场景 1/2（未归档态回归）不破坏
- [ ] task-04: 相关面全量回归（salvage 测试全文件 + worktree/cleanup 域测试）+ flow done 收口实测；验证：零失败
