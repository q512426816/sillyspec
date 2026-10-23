---
author: flow-machine-draft
created_at: 2026-10-23T00:18:32.714Z
---
# 决策记录（Decisions）— 2026-10-23-review-inline-dispatch

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：①平台结果形态漂移（worker 回传的 review 不合规/提取不到）→ 回退任务书面零损失（validateReviewJson 同一源把关，坏产物进不了登记）；②阻塞等待体感（用户盯着 flow done 不动）→ 等待预算=键值秒数（仓主自定），轮询期每 15s 打一行进度心跳，回退路径永远在场。放弃方案：①缺省开启 inline（阻塞 UX 是仓主决策，且本仓平台可用性因环境而异——配置门控与 dirty_gate_ignore/turbo docs-auto 同形态，弃缺省开）；②复用厚道 dispatch record 异步轮询机制（那是跨命令异步形态，单调用要的是有界同步等待，语义不同，弃）；③reviewer 伪装 subagent（不诚实——如实 'platform-inline'，评审抽查面可区分）。
