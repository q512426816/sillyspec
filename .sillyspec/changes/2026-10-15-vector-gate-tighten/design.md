---
author: flow-machine-draft
created_at: 2026-10-15T01:55:40.179Z
---
# 设计记录（Design Record）— 2026-10-15-vector-gate-tighten

## 做法概述

CLI 向量召回层 2026-09-29 发布时缺省 auto（有平台配置即试），但平台端 `/api/spec/knowledge/vector-search` 从未实现——线上 404 实证半个月（10-14 评审探针坐实），CLI 每次检索白走一轮失败分支，语义召回整体空缺。本变更做 CLI 侧契约收紧：vectorSwitchFromLocalYaml 缺省哨兵从 'auto' 改 null（未表态），vectorEnabled 缺省关（local.yaml `knowledge.vector_search: on|auto` 或 env `SILLYSPEC_KNOWLEDGE_VECTOR=on|auto` 显式开启才启用）；platformVectorRecall 增 404 进程级死信短路（vectorDeadEndpoints Set 按平台 URL 记，标记后本进程对同 URL 零网络请求——CLI 短进程生命周期天然重置，测试独立端口互不污染）。scope 遍历层（第三层）在开关门之外不动。文件头契约注记同步：平台侧实现端点后打开开关即恢复语义召回，CLI 零改动（平台侧实现另立变更登记）。

## 接口契约

- src/knowledge-vector.js vectorSwitchFromLocalYaml：返回值域 'on'|'off'|'auto'|null（原 'auto' 缺省哨兵改 null=未表态）；模块内私有函数，无外部导出面。
- vectorEnabled（模块内私有）：缺省（env 未设+键未写）false；env on|auto 强制 true；env off（及其他未知值保守）false；yaml on|auto true、off/未写 false。
- platformVectorRecall：行为面不变（未连接/失败/形态不符 → null 降级），新增 404 死信短路副作用（模块级 Set，无导出）。
- 对消费方（flow 注入段/complete 门/{DECISION_HITS}/knowledge search CLI）零签名变化——缺省关只影响「是否尝试平台层」，本地层为路径不变回退。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——开关判定为每次调用现读配置的纯谓词，无时序依赖。
2. 并发写：vectorDeadEndpoints 为进程内单线程事件循环下的 Set 读写，无竞争面；无盘面写。
3. 切换/生命周期：死信记忆进程生命周期——长驻进程（daemon 侧若有）在平台上线端点后需重启进程才能恢复探测，可接受（CLI 每命令新进程；daemon 不直接调本层）；env/yaml 变更即时生效（每次调用现读）。
4. 作用域：死信按平台 URL 键隔离，多 workspace 指向不同平台实例互不污染；同实例多 workspace 共享死信——正确语义（端点是实例级能力）。

## 风险与死路

最大风险：用户误以为向量召回一直在用、收紧后以为「坏了」——实际半月来从未有向量结果（404 实证），收紧只是让日志/行为与真相一致；文件头注记已声明恢复路径。次风险：env 未知值保守视为 off 可能与未来新开关值冲突——接受：显式值集 {on,auto,off} 已覆盖语义空间，新增值走显式扩展。放弃方案：①auto 改「探测一次缓存」（探测本身也要一轮网络+缓存失效复杂度，不如缺省关诚实）；②只加死信短路不动缺省（本仓 local.yaml 有 platform 段，空转照旧，问题实质未解）；③直接删向量层（平台可能实现端点，保留 opt-in 层零维护成本）。
