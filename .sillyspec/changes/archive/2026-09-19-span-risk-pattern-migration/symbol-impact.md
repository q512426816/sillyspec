# 符号影响面报告

> tasks.md 内容指纹（生成时）: 2a06a3904aa417ba——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 纯新增（NEW src/span-risk-surface.js 四导出），无既有签名级变更；调用点=零（新模块无存量消费者，task-02/03 接线）。在范围内。
- task-02: 函数签名（opts 对象）增参——computeCeremonyTier 增 opts.spanRiskPatterns（默认 []，向后兼容：既有调用不传不受影响）；reconcileDualRun 增 factSpanRiskPatterns（同兼容）；computeGateProfile opts.riskTable 默认值改 []（参数形态不变）。受影响调用点（grep 实证）：src/review-tier.js:156、src/run/gates.js:646、src/verify-postcheck.js:3074、src/ceremony-tier.js:338（reconcileDualRun 内部调 computeCeremonyTier）——全部在 task-03 allowed_paths（接线属 task-03）；src/run/shared.js:1780/1784、src/scope-audit.js:435/517——shared 在 task-03，scope-audit 仅 435 需接线（517 唯一消费 unmappedFiles，X-7 不接线）。均在范围内。
- task-03: 导出删除（破坏性）——QUICK_RISK_PATH_PATTERNS 自 src/change-risk-profile.js 删除。受影响调用点（grep 实证）：src/ceremony-tier.js:36（import+消费 :218——task-02 已切 matcher，本 task 删 import 行）、src/quick-gate-profile.js:28（import——task-02 后不再引用，删行）、test/quick-gate-profile.test.mjs:22（import——task-02 翻新）、test/ceremony-tier.test.mjs:65（仅注释）。全部在 task-02/task-03 allowed_paths 内。另五处装载接线为纯调用侧新增（loadSpanRiskPatterns 等），无第三方调用点。在范围内。
- task-04: 无签名级变更（纯文档同步：4 模块卡+map paths 补录）。
