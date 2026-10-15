---
author: flow-machine-draft
created_at: 2026-10-15T02:26:13.257Z
---
# 设计记录（Design Record）— 2026-10-15-classify-surface

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

效果评估实证：knowledge classify 工具在位（uncategorized 条目四步归类迁移+hits 审计齐全）但遥测零消费——根因是入口隐身：digest 收件箱信号只在 >20 积压时报警，1~20 条常态化静默，classify 永不进入治理视野。修法（src/knowledge-digest.js 单文件）：收件箱 ∈ [1,20] 增 info 级 inbox 信号（detail 列条目标题、suggestion 给可执行命令 `knowledge inbox 看清单 → knowledge classify --ql <id> --file <目标> [--dry-run]`）；healthy 语义同步收窄为只看 warn 级（`!signals.some(level==='warn')`——info 是提示不是超阈，低量收件箱不该把治理卡打成告警面）；渲染面 warn（⚠️ 超阈段）/info（ℹ️ 提示段）分区，healthy 行文案改「超阈信号零——健康态」。>20 warn 阈值语义逐字不变。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- collectKnowledgeDigest 返回面：signals 数组元素增 level 可能值 'info'（原只有隐式 warn——此前所有信号都不带 level 字段，mk() 不传 level……实证：mk(kind, level, …) 首参后即 level，既有三信号全传 'warn'）；healthy 判定语义变化（全空→无 warn）——平台 governance 卡消费 healthy 布尔语义兼容（false 集合收窄，不会把健康的卡误报）。
- renderKnowledgeDigestText：新增 info 区渲染；healthy=true 行文案变化（「三类信号全部在阈内…」→「超阈信号零…」）。
- knowledge classify/inbox 子命令零变化——本变更只接显示面。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——digest 为即时快照纯读。
2. 并发写：零写盘；uncategorized.md 读侧既有容错（文件缺席=0 条）。
3. 切换/生命周期：无状态；healthy 语义变化对既有消费方是收紧（false→true 方向），无中间态。
4. 作用域：digest 为单 spec 树治理卡；平台 governance RPC 消费同源函数（collectKnowledgeDigest 直采），info 字段前向兼容（平台 mk 结构已带 level 通道）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：info 信号常态化出现在每次 digest（收件箱长期 1~5 条是正常运维态）——提示疲劳。评估：info 与 warn 视觉分区（ℹ️ vs ⚠️）、healthy 不翻红、底数行照旧——看到「有条目待归类+一条命令」是恰当的轻推，狼来了风险低于原 >20 报警（那才是积压到忍无可忍才叫）。次风险：平台 governance 卡对 level 字段缺省的旧信号（warn）渲染分支——既有信号全带 'warn' 字面量，无缺省态，零影响。放弃方案：①给 classify 做自动建议目标文件（条目语义分类需要模型判断，词面建议错误率高——留给 agent 按清单自行裁决）；②收件箱阈值降到 >5 报 warn（把提示当告警用，语义错位）；③只改 healthy 不加 info 信号（收件箱存在但仍隐身，问题实质未解）。
