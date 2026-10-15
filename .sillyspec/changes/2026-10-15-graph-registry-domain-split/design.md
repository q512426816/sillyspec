---
author: flow-machine-draft
created_at: 2026-10-15T02:40:39.717Z
---
# 设计记录（Design Record）— 2026-10-15-graph-registry-domain-split

## 做法概述

效果评估实证：图簇 file:_unmapped 大簇 2183 个文件节点是拓扑伪信号——本 spec 树管理多仓（register-repo：projects/ 登记 backend/frontend/sillyhub-daemon/SillyHub/multi-agent-platform 等）而模块卡按单仓建，跨仓交付路径（frontend/** 491、backend/** 470、sillyhub-daemon/** 206、sillyhub/** 43 等 1220 个）与本仓 test 面 421 个无模块卡可挂，全被塞进 _unmasked 大簇，把真缺口（module-map 覆盖欠账）埋在噪音下。修法（src/knowledge-graph.js graphNodeDomain file 分支）：module-files 反查落空后增两级归属——①登记仓前缀（registryProjectPrefixes 读 projects/*.yaml 的 name: 字段，惰性缓存 graph._projPrefixes，最长前缀优先、大小写不敏感——登记名 SillyHub vs 路径 sillyhub/ 实证）→ 登记仓名簇；②本仓 test/ 或 tests/ 前缀 → _tests 簇；残余 _unmapped 只剩真无归属（真图 2183→761，全是可行动的模块覆盖缺口，不消音）。同变更留痕 C5/D3 缓办裁决入 known-issues：decisions/unmapped.md 285KB 拆分=决策 id 寻址键（file+id+change）全体漂移的 renumber 级迁移风险 vs 只读稳定池零增长；fr-unmapped 存量退休在 L3 冻结（2026-10-15-fr-chain-l3-adjudication）后无门禁消费方、基线消音在位——两者均给重启条件。

## 接口契约

- graphNodeDomain（模块私有）：file 分支归属判定序 = module-files 反查 → 登记仓前缀 → test/tests 前缀 → _unmapped；其余节点类型零变化。
- registryProjectPrefixes：新增模块私有 helper（graph 惰性缓存，projects 缺席=空集 fail-soft）。
- 消费面：graphSummary 簇分布（clusters 键集新增登记仓名簇——平台 lite 画布按簇渲染 additive 兼容）；summary/dump/impact 计数口径零变化（只影响聚簇展示键）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——聚簇为构建后纯函数求值。
2. 并发写：projects/*.yaml 只读；graph._projPrefixes 为单次构建内缓存，无跨运行态。
3. 切换/生命周期：登记集变化（新增 projects/*.yaml）下次构建自然生效，无失效问题（缓存生命周期=单图对象）。
4. 作用域：登记名取自本 spec 树 projects/，跨 workspace 各树自治；大小写不敏感匹配只在簇键归簇用（不改节点 id），平台消费的节点 id 与边零变化——无串台。

## 风险与死路

最大风险：登记名与模块卡名撞车造成簇键歧义（如登记 backend 且同树有 backend 模块卡）——file 节点归簇优先 module-files（精确挂接赢），登记前缀只兜底无挂接节点，无歧义路径。次风险：大小写不敏感匹配在大小写敏感文件系统上的语义错位——本匹配只影响展示聚簇键，不触文件解析，安全。放弃方案：①为跨仓建模块卡（doc-debt behind 计算在本仓无对应提交面=垃圾数据，且模块卡是维护义务不是标签）；②跨仓前缀硬编码清单（projects/ 登记机制已是单一真相源，硬编码制造第二源）；③_unmapped 簇直接隐藏（真缺口必须可见——761 是可行动信号非噪音）。
