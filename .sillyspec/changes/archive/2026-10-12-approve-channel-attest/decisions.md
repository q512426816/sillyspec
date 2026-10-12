---
author: flow-machine-draft
created_at: 2026-10-12T13:11:37.077Z
---
# 决策记录（Decisions）— 2026-10-12-approve-channel-attest

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：留痕仍非防伪——同机 agent 可以谎报 `--user-confirmed`。接受：CLI 无法验证人机，价值在必留痕 + 通道可区分 + 评审抽查兜底（与 --by 诚实边界一致）；强凭据属平台层课题（CLI 直连用户问询通道），不与本变更耦合。 试过但放弃：① approve 默认拒绝（无 flag 不放行）——破坏全部既有调用方与平台脚本，收益不成比例，且无 flag 路径已按 unattested 醒目警示；② 批准时 inquirer 交互确认——agent 环境恒非 TTY，等价于默认拒绝同款破坏；③ channel 用自由文本——机器判读与遥测聚合需要封闭三态，自由文本留给 reason 才是对的分工。
