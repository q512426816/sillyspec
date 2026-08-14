---
author: qinyi
created_at: 2026-08-14 21:34:04
---

# Tasks — 文档行号引用校验脚本（doc-ref-check）

- [x] task-01：实现 `test/doc-ref-check.test.mjs` 骨架（白名单数组 + main + 退出码）
  - FR-01 提取正则；FR-05 命名 .test.mjs 进 run-tests
- [x] task-02：实现 resolvePath（仓库根直拼 + 裸文件名 src/ 递归唯一性）
  - FR-02
- [x] task-03：实现层 1 存在性校验（existsSync + 行号边界 + 范围 end）
  - FR-03
- [x] task-04：实现层 2 关键词断言（±30 字符反引号 token + 代码符号判定 + ±1 行子串）
  - FR-04；token 判定含大写/下划线/点/$ 硬条件防误报
- [x] task-05：失败输出（docLine + 原因 + 实际内容摘要 + 统计）
  - FR-06
- [x] task-06：首跑全绿 + 篡改自测（临时 +10 行号验证变红 + 定位准确）
  - FR-07 验收；顺带修正文档裸文件名歧义/关键词误报（若首跑暴露）
- [x] task-07：全量 `npm test` + `npm run lint` 回归
  - NFR-01/02/03
- [x] ql-20260814-010-5741 文档行号引用校验脚本（doc-ref-check）
