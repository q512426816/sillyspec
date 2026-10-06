---
author: flow-machine-draft
created_at: 2026-10-06T11:41:16.700Z
---
# 决策记录（Decisions）— 2026-10-06-resume-title

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：恢复路径在测试里跑 cmdFlow start 会拉起 watcher/补起草等副作用——测试须以 SILLYSPEC_WATCHER=0 逃生阀与临时仓隔离（既有 watcher 测试同款），否则测试环境噪声。放弃的方案：① 在 flow-state.yaml 冗余存 title（双源漂移，DB 已是权威源）；② 恢复简报改为直接复用 flow status 的渲染函数（两版面文案/结构不同，强行共用会把 status 的阶段推断耦合进恢复面，超出本变更范围）。
