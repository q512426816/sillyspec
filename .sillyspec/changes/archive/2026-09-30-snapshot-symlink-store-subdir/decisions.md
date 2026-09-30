---
author: flow-machine-draft
created_at: 2026-09-30T08:36:51.933Z
---
# 决策记录（Decisions）— 2026-09-30-snapshot-symlink-store-subdir

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：误报面扩大——子目录有 bun.lock 但根是标准 npm 且快照本可用 → 被跳快照回主仓（牺牲隔离性换布局安全）。裁决为可接受：与既有「宁可主仓口径」同向（本仓 sillyspec 自身即 pnpm 根判据跳快照运行，主仓口径+污染归属鉴定兜底是已验证形态）；且 apps 型子目录 lockfile 意味着该 app 的 node_modules 符号链接网在 junction 快照内跨根失效，跳过是正确方向。已放弃方案：a) 递归扫两层——packages/* workspace 型 lockfile 在根、一层已覆盖 apps 型，递归徒增误报面与 I/O，弃；b) 探测 node_modules/.pnpm 目录存在性代替 lockfile——node_modules 是 gitignored 可变面（装/卸依赖瞬时态），lockfile 是 tracked 稳定判据，弃。残留边界：子目录仅 yarn（无 pnpm/bun/lerna 判据）不命中——yarn classic 无 symlink store 坑（PnP 另算），维持现状。
