---
author: flow-machine-draft
created_at: 2026-10-19T07:40:03.128Z
---
# 任务注册表（Tasks）— 2026-10-19-thin-review-material-pack

- [x] task-01: 新建 src/flow-review-pack.js 纯函数基座：FR 标题/测试绑定行解析（requirements.md）+ 冻结 patch 文件级摘要（diff --git/@@ 头行解析：路径+±行数+hunk 数，rename/二进制容错）；验证=单测直调解析断言正确
- [x] task-02: assembleReviewPack 组装与 12000 体积帽（超限截断注记；两子源各自可得各自产出、全缺返回 null）；验证=单测三态（可得/部分/全缺）
- [x] task-03: renderReviewerTaskbook 增可选 packLines 注入段（段尾基准面语义行，未传零注入）+ flow.js review 子步装配传入；验证=零注入逐字一致用例过+注入形态用例过
- [x] task-04: test/flow-review-pack.test.mjs 三态全绿 + test/flow-review.test.mjs 既有回归全绿
