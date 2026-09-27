---
author: flow-machine-draft
created_at: 2026-09-27T17:40:07.471Z
---
# 决策记录（Decisions）— 2026-09-28-archive-timeline-bake

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：平台/漂移模式下 runtimeRoot 与 specBase/.runtime 分裂，烤制读错目录 → 静默漏烤。缓解：编排内用 resolvePlatformOpts + resolveRuntimeRoot 与既有消费者同链；跳过/失败均输出注记行保持可观测；测试用 fixture runtimeRoot 直验。次风险：巨型事件流污染 git——尺寸帽 2MiB 超帽只烤 timeline.md 并注记。 放弃的方案：①watcher 活跃期直接把事件写进 changes 目录（放弃——改写侧协议面大，且活跃期事件属 .runtime 隐私/排除边界，D-002 语义不动）；②CLI 回退时把归档副本反向重建到 .runtime（放弃——制造两份真相源，违背「本地 jsonl 唯一真相源」既有口径）。 评审留痕（独立评审 PASS 2×P3 清偿）：P3-1 副本读源失败时头注记虚报副本在场——已修（eventsCopySkipped 扩读源失败形态，注记文本改为「尺寸超帽或读源失败」与实际产出一致，补测试）；P3-2 「与 spawnWatcher 写侧同链」对 flow.js 各拉起位在平台极端漂移下存在既有分裂面——措辞修正：烤制的 runtimeRoot 解析与既有消费链（resolvePlatformOpts>resolveRuntimeRoot）同源，平台模式下若写读目录分裂属既有面，本设计的兜底是跳过时输出注记行保持可观测、非静默漏烤。
