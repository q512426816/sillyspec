---
author: flow-machine-draft
created_at: 2026-10-16T02:58:13.947Z
---
# 任务注册表（Tasks）— 2026-10-16-release-3-33-0

- [x] task-01: test/lint-ownership-failfast.test.mjs 3e 契约锚随 lint-triage-path-unify 实态改钉（gates.js 已迁 lintOwnershipDowngrade helper，旧 `verdict === 'pre-existing'` 字面量已消失），node --test 该件 1/1 绿后显式 pathspec 提交
- [x] task-02: package.json 与 package-lock.json version=3.33.0 且 test/quick-retired.test.mjs R5 锚断言同步并跑绿，显式 pathspec 提交
- [x] task-03: git push origin main 成功（pre-push 三门放行），origin/main 与本地一致
- [x] task-04: npm publish 回执含 sillyspec@3.33.0 与 shasum，传播后双核验 version=3.33.0 且 dist-tags.latest=3.33.0
- [x] task-05: .github/workflows/ci.yml test/docs-gate 两 job 补 npm ci install 步（CI 首跑实证 js-yaml 等 7 个运行时依赖缺失致两 job 全灭），推送回执 + CI 恢复真实跑动（docs-gate/lint 绿；test job 真实跑动暴露的 ~16 例 Linux 存量平台债留 run 留痕另案）
- [x] task-06: test/review-material-pack.test.mjs 组四源码钉随 fbf0ada4 substituteRaw 收编实态改钉（prompt.js 1701/1709 裸 split/join 已迁 substituteRaw，旧 `.split('{REVIEW_MATERIALS}').join(...)` 字面量已消失），node --test 该件 32 断言全绿后显式 pathspec 提交
