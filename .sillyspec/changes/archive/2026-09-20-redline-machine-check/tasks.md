---
author: zcode-redline-framework
created_at: 2026-09-20 00:28
---
# 任务注册表（Tasks）— 2026-09-20-redline-machine-check

- [x] task-01: 新建 src/redlines.js——parseRedlines（七字段+四无效判据）/resolveScopeFiles（** 与 * glob，排除 node_modules 等）/evaluateRedlines（forbid 命中 file:line + require 缺失 + severity）+ module-map/模块卡登记
- [x] task-02: verify-probes.js 探针 11 接线——runRedlineConsistencyProbe（fail-soft，读 specBase/redlines.yaml，root=wtRoot||cwd）+ PROBE11_HEADING 渲染（❌/⚠️/✅/不适用）+ core-engine changelog 登记
- [x] task-03: test/redlines.test.mjs——四态夹具（violation/clean/absent/broken-yaml）+glob 语义+无效条目判据+severity 渲染；全量绿 (depends_on: task-01, task-02)
