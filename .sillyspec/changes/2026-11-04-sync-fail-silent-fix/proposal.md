---
author: flow-machine-draft
created_at: 2026-11-04T02:06:05.911Z
---
# 提案书（Proposal）— 2026-11-04-sync-fail-silent-fix

## 动机

任务原话转写：platform sync 失败静默与慢链路全量对账修复

动机：平台侧生产确诊（2026-11-04 知识索引漏推回执）实证三个叠加缺陷——① platform sync 的 syncSpecTreeOnly 返回 ok:false（拉清单超时/POST 422/5xx）时调用方只查 conflict 不查 ok，照打「✅ 全树 spec 同步完成（0 个文件差异）」成功横幅（index.js:4521），失败被静默成成功，漏推不可见；② 全量清单拉取超时硬编码 10s（spec-sync.js withSignal(10000)），生产实测 2.7MB 清单经 ~1Mbps 入口链路需 ~25s，全量对账永远超时，缓存漂移后无法收敛；③ POST 被服务端 422 SPEC_BUNDLE_INVALID 整批拒收时（跨工作区污染行触发的 rename 校验失败），同批合法 update 连坐，且失败信息不含无效 op 定位。

成功标准：
- syncSpecTreeOnly ok:false 时 platform sync 输出失败信息（含原因）且退出码非零，不再出现成功横幅
- 全量清单拉取（无 since 参数态）超时提升至慢链路可完成（≥60s），增量拉取维持 10s 不变
- POST 422 失败输出含服务端指明的无效 op 路径，不再只报 HTTP 状态码

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. syncSpecTreeOnly ok:false 时 platform sync 输出失败信息（含原因）且退出码非零，不再出现成功横幅
2. 全量清单拉取（无 since 参数态）超时提升至慢链路可完成（≥60s），增量拉取维持 10s 不变
3. POST 422 失败输出含服务端指明的无效 op 路径，不再只报 HTTP 状态码

## 成功标准（可验证）

1. syncSpecTreeOnly ok:false 时 platform sync 输出失败信息（含原因）且退出码非零，不再出现成功横幅
2. 全量清单拉取（无 since 参数态）超时提升至慢链路可完成（≥60s），增量拉取维持 10s 不变
3. POST 422 失败输出含服务端指明的无效 op 路径，不再只报 HTTP 状态码
