---
author: flow-machine-draft
created_at: 2026-11-04T05:13:24.652Z
---
# 任务注册表（Tasks）— 2026-11-04-junction-guard-rename-content

- [x] task-01: resolvePlatformSpecDir 解析结果与 cwd 分属不同 git 仓时大声告警（含指针路径与修复指引）；同仓/无 git 仓/显式 --spec-dir 覆盖三种形态零告警
- [x] task-02: computeSpecOps 的 rename op 携带 content（base64，与 add/update 同款），服务端源行缺失可物化目标不再 422
