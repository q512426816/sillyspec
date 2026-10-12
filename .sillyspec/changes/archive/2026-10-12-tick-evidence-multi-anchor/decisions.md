---
author: flow-machine-draft
created_at: 2026-10-12T13:41:09.488Z
---
# 决策记录（Decisions）— 2026-10-12-tick-evidence-multi-anchor

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：证据文本自由（≤8KB）可能被塞入超长噪声或敏感内容进归档件。缓解：8KB 帽 + 自愿面定位（不进门禁，无激励灌水）；敏感面与 change.patch 同级暴露（仓库本身私有）。 试过但放弃：① evidence 接入收口哨兵作为替代证据源——改变哨兵判据语义（token/review.json 双源是 L0 硬门），混入自愿补录会稀释假完成拦截强度，明确不做（留待真实需求再立项）；② 锚对象做全仓逐键锚定判定（任一仓漂移即隔离评审）——跨仓 HEAD 由评审环境决定，主仓 CLI 无法可靠 rev-parse 外仓（路径注册逐机不同），判定面收敛在 workspace 锚 fail-safe；③ evidence 强制格式（URL/sha/路径枚举）——开放世界红线，自由文本+@file 引用已够。
