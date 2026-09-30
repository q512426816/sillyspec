---
author: flow-machine-draft
created_at: 2026-09-29T08:11:36.628Z
---
# 决策记录（Decisions）— 2026-09-29-flow-agent-log-report

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：平台慢时 push 拖延协议面首屏。缓解：PUSH_TIMEOUT_MS=5s 硬上限 + 无平台配置即跳过 + 失败静默留底（与 run 族同语义，run --status 已付同代价）。放弃的方案：①挂 cmdFlowStart/cmdFlowDone 尾部（对齐 triggerSync 位置）——需改两个大函数、start 尾部有 --json 纯 JSON 输出面会被登记日志污染；②挂 index.js 分发层——change 未解析，auto 生成的 start 名拿不到，change_key 归属会缺。
