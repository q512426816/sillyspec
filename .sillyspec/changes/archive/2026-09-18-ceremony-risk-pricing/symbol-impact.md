# 符号影响面报告

> tasks.md 内容指纹（生成时）: b41c7e632877648d——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新建模块无存量符号触碰；新增导出 CEREMONY_TIERS/RISK_TO_TIER 常量 + computeCeremonyTier/escalateByFriction/reconcileDualRun 三纯函数（零依赖，不 import 仓内 IO 模块）。
- task-02: classifyReviewTier **返回结构增量**（新增 ceremonyTier 字段；保留现 tier/reason/fileCount）——非签名变更；受影响调用点 gates.js:242/:1015（读 tier/reason，兼容）、prompt.js:1075（{{REVIEW_TIER}} 渲染，task-05 改写消费新字段）、stage-review.js:570（注释约定，tier=self 语义兼容）——三消费点均在任务范围内由 task-02/05 覆盖。
- task-03: runStageCompletionGates 内部追加升档检查块（调用侧签名与返回结构不变）；新增 .runtime/ceremony-tier-<change>.json 读写（文件级新产物，非代码符号）。
- task-04: verify-postcheck 内部新增 runCeremonyDualRunCheck 校验段、complete-handlers handleArchiveConfirmStep 内部追加双跑警告——均不改变对外函数签名；复用 resolveReconcileActualFiles(:2549) 只读消费。
- task-05: prompt.js {{REVIEW_TIER}} 占位符**输出内容**档位化（占位符名不变，消费面为 prompt 文本非代码签名）；stages/plan.js 与 brainstorm.js 为 stage 定义文案/渲染变更（固定 shape 不动）；config-schema LOCAL_YAML_SCHEMA 新增 ceremony.force_tier/shadow 两键（additive，renderExample 同步）。
- task-06: doctor-diagnostics 维度数组新增「影子对照」维度（对齐既有 dimension 契约，增量 push）；review-dispatch 新增影子派发路径（不改既有独立派发签名）。
- task-07: 测试文件新增/增量，无源码签名变更；test/stage-review.test.mjs 为断言增量非被测符号改动。
