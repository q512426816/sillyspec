---
author: flow-machine-draft
created_at: 2026-10-12T07:55:11.956Z
---
# 提案书（Proposal）— 2026-10-12-thin-module-gate-and-feed

## 动机

任务原话转写：轻量变更（默认主流程）收口不产模块文档增量：未登记模块图的交付目录致 FR 蒸馏落伪域 auto-*（静默）、知识图谱模块侧边（module-files/describes/changelog-of）断供、模块卡语义漂移只在收口时提示（时机太晚）。三档修复共用 reconcileModuleDocs 已算好的事实源（modules/uncoveredDirs/moduleMaps）：

一档（软门）：flow done patch 子步在模块图在场且交付面有未登记目录（local.yaml module_gate_ignore 可排除）时阻断，提示登记 _module-map.yaml 或 --accept-unmapped 显式放行；放行缺口数随 change-patch.json acceptedUnmappedDirs 留痕（镜像 acceptedDirtyGap 先例）；门在 distill 之前——FR 不落伪域。
二档（机械回写）：distill 子步对命中模块回写变更索引行——sidecar 优先（split-changelog 契约：已拆卡新条目进 sidecar 勿写回卡）、卡内「## 变更索引」节次之、无目标跳过；变更名幂等去重；回写文件随归档窄化精确入暂存。
三档（提示前移）：flow start 知识注入面对触碰命中模块追加 computeDocsDebt behind 事实（厚道 execute {DOCS_DEBT} 同源复用，fail-open 空债零输出）。

成功标准：
- 门三态：未登记目录在场裸跑 flow done 退出码 1 且不归档；登记后重跑通过；--accept-unmapped 放行且 change-patch.json 含 acceptedUnmappedDirs 计数；module_gate_ignore 命中目录不触发门；模块图缺席（绿地无图）不触发门
- 回写：命中模块的卡/sidecar 追加「| 日期 | 变更名 | 摘要 |」行；已拆卡（sidecar 在场）追加 sidecar 不动卡；重跑同变更名不重复追加；无卡无节跳过不报错；回写文件在归档后处于已暂存态
- 注入：触碰命中且卡 behind>0 的模块在 flow start 注入面出现欠账事实行；空债/无图零输出；注入异常不阻断 start
- 既有 flow/归档相关测试全绿，新增测试覆盖上述三档

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 门三态：未登记目录在场裸跑 flow done 退出码 1 且不归档；登记后重跑通过；--accept-unmapped 放行且 change-patch.json 含 acceptedUnmappedDirs 计数；module_gate_ignore 命中目录不触发门；模块图缺席（绿地无图）不触发门
2. 回写：命中模块的卡/sidecar 追加「| 日期 | 变更名 | 摘要 |」行；已拆卡（sidecar 在场）追加 sidecar 不动卡；重跑同变更名不重复追加；无卡无节跳过不报错；回写文件在归档后处于已暂存态
3. 注入：触碰命中且卡 behind>0 的模块在 flow start 注入面出现欠账事实行；空债/无图零输出；注入异常不阻断 start
4. 既有 flow/归档相关测试全绿，新增测试覆盖上述三档

## 成功标准（可验证）

1. 门三态：未登记目录在场裸跑 flow done 退出码 1 且不归档；登记后重跑通过；--accept-unmapped 放行且 change-patch.json 含 acceptedUnmappedDirs 计数；module_gate_ignore 命中目录不触发门；模块图缺席（绿地无图）不触发门
2. 回写：命中模块的卡/sidecar 追加「| 日期 | 变更名 | 摘要 |」行；已拆卡（sidecar 在场）追加 sidecar 不动卡；重跑同变更名不重复追加；无卡无节跳过不报错；回写文件在归档后处于已暂存态
3. 注入：触碰命中且卡 behind>0 的模块在 flow start 注入面出现欠账事实行；空债/无图零输出；注入异常不阻断 start
4. 既有 flow/归档相关测试全绿，新增测试覆盖上述三档
