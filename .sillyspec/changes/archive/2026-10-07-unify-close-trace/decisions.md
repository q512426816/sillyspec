---
author: flow-machine-draft
created_at: 2026-10-07T15:55:28.235Z
---
# 决策记录（Decisions）— 2026-10-07-unify-close-trace

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：两写点行为收口的回归面——thin 侧 console 字样/键序、heavy 侧「空 patch 当 ok」形态变化可能碰隐性消费者。缓解：thin 侧键结构与输出前缀逐字保留（flow-protocol 断言钉住）；heavy 空 patch 形态经全量套件与 e2e 验证；快照新增 closedBy 为 additive 键，旧快照读侧缺省兼容。放弃的方案：① 只做读侧不写统一（第 2 层已做）——新变更永远靠回退兜底，两卡不对称长期存在；② heavy 侧沉淀面在 archive --confirm 才写——语义上更「终态」，但需在归档点重建采集上下文（worktree/分支已清），且与快照时点（execute --done）不一致会造成两套留痕时点漂移，不如同点同锚；③ scope-audit.json 里引用 change.patch 路径省一份 patch 文件——读侧（getFileDiff/平台）认死 scope-audit.patch 文件名，省字节收益小于读面改动风险（同字节 git blob 本去重，零仓容成本）。
