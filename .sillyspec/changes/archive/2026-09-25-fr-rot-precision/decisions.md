---
author: flow-machine-draft
created_at: 2026-09-25T12:03:11.893Z
---
# 决策记录（Decisions）— 2026-09-25-fr-rot-precision

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险=判别力天花板：评审实测基线（131 条→strong 83/unknown 8/skip 40；存量 keep 72/删 128）——src/flow.js 等高耦合文件的历史 coverage 命中率极高，域级通胀收敛为「文件级通胀」，这是 FR 覆盖面记录粒度（文件）的数据模型限制，判据无法再细；后续若要更准需 hunk/符号级 coverage（记为方向）。次风险=3 个早期 thin 归档无 change-patch.json 导致 8 条恒 unknown（宁漏勿滥可接受，unknownSources 遥测带来源名可后续补录）。死路①：hunk 级判据（parse patch 文本按函数归属）——解析复杂度与归档件形态耦合，弃；死路②：quick 侧钩子同步收紧——quick 退役中，为其扩面反向投资，弃（重打残留由 cleanup 幂等重跑消化）。
