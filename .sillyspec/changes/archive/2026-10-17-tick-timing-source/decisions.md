---
author: flow-machine-draft
created_at: 2026-10-16T17:16:57.523Z
---
# 决策记录（Decisions）— 2026-10-17-tick-timing-source

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：阈值启发式误报——120s 簇窗与 10× 存活比是经验值。缓解：快变更短跨度形态由存活比守卫放行（lifespan < 10×span → spread）；误报仅 advisory 一行不阻断。已知盲区（如实留痕）：agent 全程直接 Edit 的末尾逐格集中（无侧车、watcher 采样出多个单格跳）两类门都不报——时点判据只认侧车是防采样误报的刻意取舍，教学行引导走 task tick 后盲区自然收窄。 试过但放弃的方案：①判据换到「提交时戳与 tick 时戳交错分析」——提交时戳同为压扁受害者（reset --soft 后 recommit 改写 committer date），换汤不换药；②watcher 事件作时点判据兜底（侧车缺失时）——3s 采样的部分观测会把分散勾选采样成「尾窗两跳」，与采样合并跳系列坑同源，误报风险大于收益，弃；③保留 git 判据作双轨——双判据只要一条被压扁摧毁就复现误报，且「untracked 直至归档」在 tasks.md 不进交付 pathspec 的纪律下恒复现，整体退役。
