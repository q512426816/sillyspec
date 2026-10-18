---
author: flow-machine-draft
created_at: 2026-10-18T03:09:27.361Z
---
# 提案书（Proposal）— 2026-10-18-runtime-relayout

## 动机

任务原话转写：runtime 目录分层重排与归档回收
用户反馈：.runtime 目录下文件太多太乱（本仓实测 1649 个），要求统一放入下一级子目录，不重要的文件放 temp 目录方便整体删除。

动机与背景：堆积根源有三——①8 类按 change 命名的散文件（sync-docs-lastpush-/draft-ledger-/route-hindsight-baseline-/watcher-events|stage-timing|last-snapshot-/test-rerun-/test-ledger-，约 1530 个）不在 pruneArchivedChangeRuntime 归档回收名单内，742 个已归档变更的孤儿文件只增不减；②历次变更遗留的一次性脚本（repro-*.mjs、anchor-*.mjs 等）无归属堆积；③日志与 db 备份（.bak/.corrupt-*/.pre-import-*）与核心状态文件混放根目录。

成功标准：
- .runtime 根目录不再新增按 change 命名的散文件：8 类产品写入点全部改写入 state/ 子目录（文件名保持不变，仅加目录前缀）
- 可随时删除的产物（日志、db 备份、锁残留 tmp）统一写入 temp/ 子目录，删除 temp/ 内容后各流程功能不受影响
- 变更归档/删除时同步回收该变更在 state/ 下的全部散文件（pruneArchivedChangeRuntime 扩名单），不再随归档数累积
- 旧布局兼容：升级后旧位置文件自动迁移到新位置（幂等、fail-open），既有仓库不丢状态
- 本仓 .sillyspec/.runtime 完成迁移：根目录只剩核心单例与子目录，文件数从 1649 降至 60 以内

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. .runtime 根目录不再新增按 change 命名的散文件：8 类产品写入点全部改写入 state/ 子目录（文件名保持不变，仅加目录前缀）
2. 可随时删除的产物（日志、db 备份、锁残留 tmp）统一写入 temp/ 子目录，删除 temp/ 内容后各流程功能不受影响
3. 变更归档/删除时同步回收该变更在 state/ 下的全部散文件（pruneArchivedChangeRuntime 扩名单），不再随归档数累积
4. 旧布局兼容：升级后旧位置文件自动迁移到新位置（幂等、fail-open），既有仓库不丢状态
5. 本仓 .sillyspec/.runtime 完成迁移：根目录只剩核心单例与子目录，文件数从 1649 降至 60 以内

## 成功标准（可验证）

1. .runtime 根目录不再新增按 change 命名的散文件：8 类产品写入点全部改写入 state/ 子目录（文件名保持不变，仅加目录前缀）
2. 可随时删除的产物（日志、db 备份、锁残留 tmp）统一写入 temp/ 子目录，删除 temp/ 内容后各流程功能不受影响
3. 变更归档/删除时同步回收该变更在 state/ 下的全部散文件（pruneArchivedChangeRuntime 扩名单），不再随归档数累积
4. 旧布局兼容：升级后旧位置文件自动迁移到新位置（幂等、fail-open），既有仓库不丢状态
5. 本仓 .sillyspec/.runtime 完成迁移：根目录只剩核心单例与子目录，文件数从 1649 降至 60 以内
