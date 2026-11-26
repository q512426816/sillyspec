---
author: flow-machine-draft
created_at: 2026-11-26T00:16:56.841Z
---
# 任务注册表（Tasks）— 2026-11-26-verify-skip-switch

- [x] task-01: 新增 `src/verify-mode.js`（`readVerifyMode` + 纯判定 `shouldSkipVerify`，fail-soft 缺省 full），并在 `src/config-schema.js` 注册 `verify.mode`；用单测证明 skip/full/非法值三态
- [x] task-02: 在 `src/run/stage.js` 的 verify 阶段入口加 skip 短路：打印留痕、全部步骤与阶段标 completed、不渲染 prompt；单测或最小集成验证证明不写产物
- [x] task-03: 改 `src/stage-contract.js` 的 `resolveFactsExpected(changeDir)`：skip 档返回 false；单测证明 skip 下不触发 factsExpected fail-closed
- [x] task-04: 改 `src/run/next.js` 的 `inferChange`：skip 档且无 verify-result.md 时提示 `run archive`；单测覆盖推断结果
- [x] task-05: 同步 `docs/sillyspec/file-lifecycle.md`（verify.mode=skip 的文件生命周期）与 `.claude/skills/sillyspec-verify/SKILL.md`（skip 档说明）
