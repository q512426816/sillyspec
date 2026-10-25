---
author: flow-machine-draft
created_at: 2026-10-25T11:25:54.249Z
---
# 决策记录（Decisions）— 2026-10-24-flow-done-review-artifact-drift-loop

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：治理文件前缀 `.sillyspec/` 判定把「借治理路径夹带交付内容」的提交误判为保留——缓解：承诺面（requirements/design）单列强拦（touchedPromiseFace → 不成立），且 review.json 等治理件本身不进 patch 冻结面，夹带内容不因保留判定进冻结证据；后果方向是多保留一轮评审对象而非漏拦交付变更。试过放弃的方案：①放宽 reviewAnchoredToHead 为「锚是 HEAD 祖先」——把复审后真正的交付提交也放行，假绿方向不可接受；②按文件 mtime/索引快照判交付面变化——mtime 不可靠（checkout/重排即漂移），快照引入新冻结面与既有 patch 冻结重复；③在评审员侧解决（评审前自查锚后提交）——评审员无收口视野，循环仍在收口侧，治标不治本。
