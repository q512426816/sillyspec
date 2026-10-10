# 任务注册表（Tasks）— 2026-10-10-drift-review-governance-keep

- [x] task-01: 工件起草——FR 五条（治理面等价保留 / 交付承诺面隔离回归 / superseded 回退 / 处置提示 / 测试面）+ design 四问 + 文件变更清单；验证：requirements/design 本文件可读且锚齐全
- [x] task-02: 测试先行——flowdone-disposition-drift.test.mjs ① 扩展文件面字段断言 + 新增 ③ e2e 治理面等价保留；flow-review.test.mjs 新增 superseded 回退用例；验证：对现实现跑红（①b/②b/③ 三用例红，既有 ①/② 回归绿）
- [x] task-03: 实现——flow-parity.js detectPatchDrift 文件面三字段 + flow.js 保留第三态与 P2/P3 处置提示 + flow-review.js 任务书回退；验证：四用例全绿（①b/②b/③ 转绿 + 既有 ①/② 隔离回归不破）
- [ ] task-04: 相关面全量回归（两测试文件全量 + flow/review 域测试）+ flow done 收口实测；验证：零失败
