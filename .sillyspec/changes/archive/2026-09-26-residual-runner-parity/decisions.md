---
author: flow-machine-draft
created_at: 2026-09-26T01:56:14.467Z
---
# 决策记录（Decisions）— 2026-09-26-residual-runner-parity

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=jsxRunner 提取的命令串形态不匹配项目实际（cd 链/嵌套 pnpm exec）——提取不到走 skip 批（安全侧：转办不假跑），提取到但命令错会 failed 由 known_failures/归属鉴定兜（与 py 侧推断同风险面同兜法）。死路：CLI 主动探测项目 vitest 配置（读 vite.config/tsconfig 判项目类型）——探测面无界且易过时，命令串推断+skip 转办是诚实分界，弃；死路：JSX 批也 node --test 顶着 known_failures——制造恒败段正是要修的病，弃。
