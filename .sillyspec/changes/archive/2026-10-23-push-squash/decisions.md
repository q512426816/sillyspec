---
author: flow-machine-draft
created_at: 2026-10-23T13:18:43.188Z
---
# 决策记录（Decisions）— 2026-10-23-push-squash

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：历史重写破坏 SillySpec 的审计锚。缓解=有效 base 抬升 + 备份 ref 保活旧对象 + by-change subject 保留 `(<变更名>)`；`--mode one` 在活跃变更存在时默认拒绝。 - 死路 1：pre-push hook 自动改写。git 在调用 hook 前已捕获要推送的 OID，hook 内改 HEAD 不影响本次推送（临时仓实测：远端收到旧提交）。只做显式命令。 - 死路 2：`git reset --soft` 压扁。会把共享暂存区内容卷进压扁提交；`commit-tree` + `update-ref` 才能保证 index/工作区逐字节不变。 - 死路 3：在活跃 worktree 内压扁。`scanOrphanFace` 只扫 reflog、不认备份 ref，会把旧提交误判为冻结面外；v1 直接拒绝，后续再讨论忽略 pre-squash ref。 - 其他风险：merge commit 展平、签名提交丢签名、tag 指向旧提交、commit-msg hook 被绕过；v1 默认拒绝 merge/已推送区间，签名与 tag 给 warning，pre-push hook 仍正常执行。 - 不做：改写已推送历史、force-push、跨分支批量清理、自动 hook 静默改写、跨仓 push。
