---
id: task-02
title: detectChangeRisk 早期 warning 引导（坑2）
title_zh: detectChangeRisk 早期 warning 引导（坑2）
author: qinyi
created_at: 2026-08-06T09:42:00+08:00
priority: P0
depends_on: []
blocks: [task-06, task-07]
requirement_ids: [FR-02]
decision_ids: [D-02@v1, D-06@v1]
allowed_paths:
  - src/stage-contract.js
  - test/stage-contract.test.mjs
goal: |
  design.md 含 session/lease/daemon 等关键词但无 frontmatter risk_level 时，
  validateVerifyResult 早期透出 frontmatter 覆盖指引（warnings），不依赖 conclusion/evidence，
  避免 agent 走到 verify 末尾撞错才发现可显式覆盖。遵 6417a27（frontmatter 覆盖通道，否决 body 扫描）。
implementation: |
  - src/stage-contract.js:448 附近（detectChangeRisk 调用后、evidence gate :452 前）插入：
    if (['integration-critical','deployment-critical'].includes(changeRiskProfile.level)
        && !changeRiskProfile.explicit) {
      warnings.push(
        `[${changeRiskProfile.level}] 本次变更被关键词判级（命中：${changeRiskProfile.triggers.join(', ')}）。` +
        `若属关键词误伤（实际未触碰 daemon/session/启动入口/跨进程），可在 design.md frontmatter ` +
        `加 risk_level: <真实等级>（如 unit-sufficient）显式覆盖后重跑。`
      )
    }
  - 不改 detectChangeRisk 返回值、判级逻辑、frontmatter 优先级（6417a27 已就位）。
  - test/stage-contract.test.mjs 增断言：高危 && !explicit → warnings 含 frontmatter 覆盖指引；
    explicit → 不发；FAIL 结论也透出（不依赖 conclusion）。
acceptance: |
  - 命中高危关键词 && 无 frontmatter risk_level → warnings 含"可在 design.md frontmatter
    加 risk_level 显式覆盖"指引。
  - 有 frontmatter risk_level（explicit）→ 不发 warning（已显式声明无需引导）。
  - FAIL 结论也透出 warning（不依赖 conclusion / evidence gate）。
verify: |
  node test/stage-contract.test.mjs
constraints: |
  - 不改 detectChangeRisk 返回值 / 判级逻辑 / frontmatter 优先级（遵 6417a27，Grill B-002）。
  - 不做 body 豁免短语扫描（D-06 显式遵 6417a27 否决项，防复读）。
  - 现有 stage-contract.js:481 "出路③" 错误信息保留（PASS 缺证据兜底，双保险）。
  - warning 走既有 warnings 数组（Grill B-002 已核 detectChangeRisk 唯一生产调用点 :443）。
---

# task-02: detectChangeRisk 早期 warning 引导（坑2）

detectChangeRisk 机械字面匹配，命中高危关键词无 frontmatter 覆盖时，现状指引仅出现在
stage-contract.js:481 "出路③"（仅 PASS 缺证据触发）。本 task 在 detectChangeRisk 调用后
早期无条件 push warning，覆盖 FAIL / 判级后场景。

## 依据
- design.md §5 Fix-2 / §7 Fix-2 代码片段 / FR-02 / D-02@v1 / D-06@v1
- 6417a27（2026-07-28）注释：与其在正则层做脆弱的否定识别，不如给显式可审计覆盖通道。
- Grill B-002：原方案 hint 字段无渲染点=死字段，改为 stage-contract.js 早期 warning。
