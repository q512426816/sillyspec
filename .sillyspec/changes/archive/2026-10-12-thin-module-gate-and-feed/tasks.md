---
author: flow-machine-draft
created_at: 2026-10-12T07:55:11.956Z
---
# 任务注册表（Tasks）— 2026-10-12-thin-module-gate-and-feed

- [x] task-01: 门三态：未登记目录在场裸跑 flow done 退出码 1 且不归档；登记后重跑通过；--accept-unmapped 放行且 change-patch.json 含 acceptedUnmappedDirs 计数；module_gate_ignore 命中目录不触发门；模块图缺席（绿地无图）不触发门
- [x] task-02: 回写：命中模块的卡/sidecar 追加「| 日期 | 变更名 | 摘要 |」行；已拆卡（sidecar 在场）追加 sidecar 不动卡；重跑同变更名不重复追加；无卡无节跳过不报错；回写文件在归档后处于已暂存态
- [x] task-03: 注入：触碰命中且卡 behind>0 的模块在 flow start 注入面出现欠账事实行；空债/无图零输出；注入异常不阻断 start
- [x] task-04: 既有 flow/归档相关测试全绿，新增测试覆盖上述三档
