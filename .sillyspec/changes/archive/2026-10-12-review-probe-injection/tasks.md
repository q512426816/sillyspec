---
author: flow-machine-draft
created_at: 2026-10-12T13:04:18.145Z
---
# 任务注册表（Tasks）— 2026-10-12-review-probe-injection

- [x] task-01: 新建 src/review-probes.js——parseReviewProbes/loadReviewProbes/resolveProbeLines（fail-soft 校验、容量帽、scope 过滤、命令超时与输出帽、provenance 留痕）
- [x] task-02: 注入面接线——flow-review.js renderReviewerTaskbook 增 probeLines 参数+【项目评审探针】段、flow.js 调用点装配（thin）；review-dispatch.js buildReviewerTaskBook 增参+段、两处调用点装配（thick）
- [x] task-03: config-schema.js 登记 review_probes 段 + 新增 test/review-probes.test.mjs（解析/帽/过滤/命令 fail-soft/双面注入/未配置零变化）跑绿 + flow-review 回归
