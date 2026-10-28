---
author: flow-machine-draft
created_at: 2026-10-28T05:46:49.189Z
---
# 提案书（Proposal）— 2026-10-28-cp-review-debt

## 动机

任务原话转写：checkpoint 评审三债清偿：口径统一与链校验解耦

2026-10-28-shadow-checkpoint 独立评审留三条 P3 债，本变更一并清偿：①硬排除口径不一致——add 后 reset 的 pathspec（node_modules 等）根锚定，体积护栏 isHardExcluded 按任意深度段过滤：monorepo 嵌套产物目录（packages/x/node_modules）会进快照却不计护栏，两侧统一为任意深度（reset 改 :(glob)**/ 前缀形态）；②FR-05「删除失败不阻断」无用例——补 change-delete 确认路径下 ref 删除失败（锁文件占位）仍完成删除且留警告的用例；③listCheckpoints -n 200 截断且 restoreCheckpoint 链内校验复用该列表——超 200 档旧档不可读，链校验改为独立无上限扫描（列表显示面保留 200 帽仅作展示）。

成功标准：
- 嵌套产物目录（packages/x/node_modules、深层 dist 等）不进快照且不计体积护栏（两侧同口径，测试断言）
- change-delete 在 ref 删除失败（update-ref 被锁占位）时仍完成删除主流程，警告留痕（测试断言）
- 存档链内校验不再受列表截断影响（独立无上限扫描；显示面截 200 保留并注明全量走 git 直查）
- 既有 shadow-checkpoint 测试面零回归，零新依赖

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 嵌套产物目录（packages/x/node_modules、深层 dist 等）不进快照且不计体积护栏（两侧同口径，测试断言）
2. change-delete 在 ref 删除失败（update-ref 被锁占位）时仍完成删除主流程，警告留痕（测试断言）
3. 存档链内校验不再受列表截断影响（独立无上限扫描；显示面截 200 保留并注明全量走 git 直查）
4. 既有 shadow-checkpoint 测试面零回归，零新依赖

## 成功标准（可验证）

1. 嵌套产物目录（packages/x/node_modules、深层 dist 等）不进快照且不计体积护栏（两侧同口径，测试断言）
2. change-delete 在 ref 删除失败（update-ref 被锁占位）时仍完成删除主流程，警告留痕（测试断言）
3. 存档链内校验不再受列表截断影响（独立无上限扫描；显示面截 200 保留并注明全量走 git 直查）
4. 既有 shadow-checkpoint 测试面零回归，零新依赖
