# 决策知识 — dispatch

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-dispatch-001@v1 2026-11-21-shadow-dispatch-form-respect——痛点实证（2026-11-21）：`2026-11-21-verify-gate-scope-speed` 按 `--no-review` 形态收口时，主会话如
状态：implemented
变更：2026-11-21-shadow-dispatch-form-respect
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-21-shadow-dispatch-form-respect/design.md
文件：src/review-dispatch.js, src/run/gates.js, test/shadow-dispatch-form.test.mjs
最近确认：f10e34e41a046fda1314158458da029968c1bd80
理由：痛点实证（2026-11-21）：`2026-11-21-verify-gate-scope-speed` 按 `--no-review` 形态收口时，主会话如实报告「不派平台评审」，但 `src/run/gates.js:1744` 的影子旁路在 brainstorm 收口自动向平台派发独立审查会话（pi 会话 23:29:21 被建、12s failed），且 fire-and-forget 使 `ℹ️ 影子审查已后台派发` 披露行落在主会话读不到的时机——形态选择被旁路穿透 + 披露缺口。用户裁决：**形态压过旁路、影子机制保留但派发必须可见**。 两处小改（方案内聚优先）： 1. **形态门（`src/review-dispatch.js`，dispatchShadowReview 内聚）**：create 模式既有前置校验链（tier-missing → tier-not-light → shadow-off → 幂等闸 → client → probe）**最前**插入形态免评审检查——`readFlowState(join(specBase,'changes',changeName))`（`src/flow-state.js` 既有 fail-soft 读取器，缺文件/损坏 → null → 不命中），`st.review_force === false || st.turbo === true` → 走既有 skip 通道留痕 `form-review-exempt（变更声明免评审形态：<形态表述>——形态压过旁路，不派影子对照）`。放函数内而非 gates 挂点层：所有前置校验内聚一处、单测直调无需拉起 gates、gates 挂点保持零条件逻辑。 2. **披露同步（`src/run/gates.js:1744-1771`）**：fire-and-forget Promise 链改 `await`——`dispatchShadowReview` 自身 catch-all 永不抛、skip 路径全本地快速返回、网络面有界（`SillyHubMcpClient` 缺省 timeoutMs=10000，probe 失败快速 skip），await 安全；ℹ️ 披露行保证在收口命令退出前打出。
