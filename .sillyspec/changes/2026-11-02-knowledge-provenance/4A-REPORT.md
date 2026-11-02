# 4A 数据分层与来源对账报告（只读）

生成时间：2026-11-02T08:55:35.248Z｜条目守恒：decisions 383 + fr 210 = ledger 593｜零写入：两仓 knowledge hash 前后一致

## 与审查实测数字对照

| 指标 | 审查实测 | 本次对账 | 差异 |
|---|---|---|---|
| 本仓 decisions/unmapped | 74 | 75 | 差异（如实记录） |
| 本仓 fr/unmapped | 210 | 210 | 一致 |
| 平台 decisions/unmapped | 308 | 308 | 一致 |
| 两仓同 ID 条目（overlap） | 1026 | 1026 | 一致 |

## 分类计数

- 本仓 decisions：{"duplicate-of-platform":28,"template-draft":47}
- 本仓 fr：{"unique":2,"duplicate-of-platform":208}
- 平台 decisions：{"duplicate-of-platform":131,"template-draft":173,"unique":4}
- 平台 fr：{}

## 处置表（4B/4C 输入）

| 仓 | id | 文件 | change | class | 动作 | 理由 |
|---|---|---|---|---|---|---|
| platform | D-unmapped-026@v1 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-027@v1 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-028@v1 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-029@v1 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-030@v1 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-031@v1 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-032@v1 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-033@v1 | decisions/unmapped.md | 2026-10-15-pseudo-domain-migration | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-034@v1 | decisions/unmapped.md | 2026-10-15-workspace-session-agent-only | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-035@v1 | decisions/unmapped.md | 2026-10-15-assets-graph-depth | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-036@v1 | decisions/unmapped.md | 2026-10-15-server-logs-panel | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-037@v1 | decisions/unmapped.md | 2026-10-15-server-logs-panel | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-038@v1 | decisions/unmapped.md | 2026-10-15-server-logs-panel | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-039@v1 | decisions/unmapped.md | 2026-10-15-server-logs-panel | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-040@v1 | decisions/unmapped.md | 2026-10-15-server-logs-panel | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-041@v1 | decisions/unmapped.md | 2026-10-15-server-logs-panel | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-042@v1 | decisions/unmapped.md | 2026-10-15-server-logs-panel | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-043@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-044@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-045@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-046@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-047@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-048@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-049@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-050@v1 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-051@v1 | decisions/unmapped.md | 2026-10-16-proto-pipeline-discoverability | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-052@v1 | decisions/unmapped.md | 2026-10-16-driver-audit-fixes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-053@v1 | decisions/unmapped.md | 2026-10-16-archived-files-tab | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-054@v1 | decisions/unmapped.md | 2026-10-15-session-turn-completion-semantics | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-055@v1 | decisions/unmapped.md | 2026-10-16-session-run-status-realtime | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-056@v1 | decisions/unmapped.md | 2026-10-15-server-logs-dockerfile-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-057@v1 | decisions/unmapped.md | 2026-10-16-backend-mem-polling | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-058@v1 | decisions/unmapped.md | 2026-10-16-deploy-convergence-guard | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-059@v1 | decisions/unmapped.md | 2026-10-16-change-files-sync-result | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-060@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-061@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-062@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-063@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-064@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-065@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-066@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-067@v1 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-068@v1 | decisions/unmapped.md | 2026-10-16-agent-session-field-pin-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-069@v1 | decisions/unmapped.md | 2026-10-16-daemon-pull-antiresurrect | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-070@v1 | decisions/unmapped.md | 2026-10-16-change-center-back-keeps-list-state | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-071@v1 | decisions/unmapped.md | 2026-10-16-change-title-condense-backfill | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-072@v1 | decisions/unmapped.md | 2026-10-16-change-center-delete-back-keeps-state | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-073@v1 | decisions/unmapped.md | 2026-10-16-pg-index-local-followup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-074@v1 | decisions/unmapped.md | 2026-10-16-knowledge-module-card | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-075@v1 | decisions/unmapped.md | 2026-10-16-session-decision-pill | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-076@v1 | decisions/unmapped.md | 2026-10-16-decision-pill-no-workspace | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-077@v1 | decisions/unmapped.md | 2026-10-17-audit-risk-followup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-078@v1 | decisions/unmapped.md | 2026-10-17-zcode-provider-config-shape | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-079@v1 | decisions/unmapped.md | 2026-10-17-dsh-rc2-protocol-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-080@v1 | decisions/unmapped.md | 2026-10-17-dsh-rc2-routing-restore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-081@v1 | decisions/unmapped.md | 2026-10-17-session-replay-pingpong-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-082@v1 | decisions/unmapped.md | 2026-10-17-session-envelope-rev-stale-guard | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-083@v1 | decisions/unmapped.md | 2026-10-18-audit-log-redact-yaml-quote | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-084@v1 | decisions/unmapped.md | 2026-10-18-change-type-git-conventional | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-085@v1 | decisions/unmapped.md | 2026-10-18-change-list-type-filter | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-086@v1 | decisions/unmapped.md | 2026-10-19-assets-audit-expand-toggle | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-087@v1 | decisions/unmapped.md | 2026-10-19-shared-agent-onboarding-hint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-088@v1 | decisions/unmapped.md | 2026-10-19-hide-shared-profile-in-session | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-089@v1 | decisions/unmapped.md | 2026-10-19-platform-auto-commit-type | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-090@v1 | decisions/unmapped.md | 2026-10-19-change-list-created-sort | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-091@v1 | decisions/unmapped.md | 2026-10-19-knowledge-inbox-triage | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-092@v1 | decisions/unmapped.md | 2026-10-19-knowledge-search-build-switch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-093@v1 | decisions/unmapped.md | 2026-10-19-thinking-zh-translate | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-094@v1 | decisions/unmapped.md | 2026-10-19-translate-live-verify | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-095@v1 | decisions/unmapped.md | 2026-10-19-knowledge-build-switch-rollout | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-096@v1 | decisions/unmapped.md | 2026-10-19-change-assets-cross-repo-repos | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-097@v1 | decisions/unmapped.md | 2026-10-19-cross-repo-patch-slicing | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-098@v1 | decisions/unmapped.md | 2026-10-19-preview-card-empty-turn-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-099@v1 | decisions/unmapped.md | 2026-10-20-backfill-dryrun-log-scrub | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-100@v1 | decisions/unmapped.md | 2026-10-20-root-ruff-config | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-101@v1 | decisions/unmapped.md | 2026-10-20-sillyspec-gotchas-session | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-102@v1 | decisions/unmapped.md | 2026-10-20-conflict-platform-archive | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-103@v1 | decisions/unmapped.md | 2026-10-20-session-error-visibility | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-103@v1 | decisions/unmapped.md | 2026-10-20-pill-dock-left-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-104@v1 | decisions/unmapped.md | 2026-10-20-codex-requires-openai-auth | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-104@v1 | decisions/unmapped.md | 2026-10-20-pill-dock-drag-align-keep | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-105@v1 | decisions/unmapped.md | 2026-10-16-session-pill-dock-drag | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-105@v1 | decisions/unmapped.md | 2026-10-20-codex-models-fetch-candidates | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-106@v1 | decisions/unmapped.md | 2026-10-16-provider-switch-transcript-sanitize | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-106@v1 | decisions/unmapped.md | 2026-10-20-preset-engine-endpoint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-107@v1 | decisions/unmapped.md | 2026-10-19-host-settings-live-reload | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-107@v1 | decisions/unmapped.md | 2026-10-20-session-status-live-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-108@v1 | decisions/unmapped.md | 2026-10-19-host-settings-reload-latency | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-108@v1 | decisions/unmapped.md | 2026-10-21-gitlog-quotepath-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-109@v1 | decisions/unmapped.md | 2026-10-21-overview-card-mainflow-scan | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-110@v1 | decisions/unmapped.md | 2026-10-21-gitlog-conflict-quotepath | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-111@v1 | decisions/unmapped.md | 2026-10-21-mobile-scan-birth-cleanup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-112@v1 | decisions/unmapped.md | 2026-10-21-precommit-sandbox-entries | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-113@v1 | decisions/unmapped.md | 2026-10-21-precommit-cleanup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-114@v1 | decisions/unmapped.md | 2026-10-21-files-refresh-spinner | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-115@v1 | decisions/unmapped.md | 2026-10-21-task-wakeup-restore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-116@v1 | decisions/unmapped.md | 2026-10-21-archive-patch-repair | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-117@v1 | decisions/unmapped.md | 2026-10-21-spec-manifest-incremental | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-118@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-119@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-120@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-121@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-122@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-123@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-124@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-125@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-126@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-127@v2 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目——人工域映射后迁移 |
| platform | D-unmapped-128@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-129@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目——人工域映射后迁移 |
| platform | D-unmapped-130@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-131@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-132@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-133@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-134@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目——人工域映射后迁移 |
| platform | D-unmapped-135@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-136@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目——人工域映射后迁移 |
| platform | D-unmapped-137@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-138@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-139@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-140@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-141@v1 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-142@v1 | decisions/unmapped.md | 2026-10-21-session-git-branch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-143@v1 | decisions/unmapped.md | 2026-10-22-review-risk-fixes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-144@v1 | decisions/unmapped.md | 2026-10-22-daemon-snapshot-report-log | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-145@v1 | decisions/unmapped.md | 2026-10-22-fix-translate-cjk-segments | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-146@v1 | decisions/unmapped.md | 2026-10-22-protect-cjk-source | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-147@v1 | decisions/unmapped.md | 2026-10-21-task-wakeup-event-queue | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-148@v1 | decisions/unmapped.md | 2026-10-22-turn-trigger-generalize | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-149@v1 | decisions/unmapped.md | 2026-10-22-askuser-card-inline | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-150@v1 | decisions/unmapped.md | 2026-10-22-turn-trigger-metadata-p2 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-151@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-152@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-153@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-154@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-155@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-156@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-157@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-158@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-159@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-160@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-161@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-162@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-163@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-164@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-165@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-166@v1 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-167@v1 | decisions/unmapped.md | 2026-10-16-session-pill-dock-drag | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-168@v1 | decisions/unmapped.md | 2026-10-16-provider-switch-transcript-sanitize | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-169@v1 | decisions/unmapped.md | 2026-10-19-host-settings-live-reload | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-170@v1 | decisions/unmapped.md | 2026-10-19-host-settings-reload-latency | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-171@v1 | decisions/unmapped.md | 2026-10-20-pill-dock-left-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-172@v1 | decisions/unmapped.md | 2026-10-20-pill-dock-drag-align-keep | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-173@v1 | decisions/unmapped.md | 2026-10-21-agent-profile-slim-default | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-174@v1 | decisions/unmapped.md | 2026-10-21-provider-default-ui-hint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-175@v1 | decisions/unmapped.md | 2026-10-21-profile-default-prehint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-176@v1 | decisions/unmapped.md | 2026-10-22-agent-profile-modal-restyle | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-177@v1 | decisions/unmapped.md | 2026-10-22-agent-profile-edit-refresh | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-178@v1 | decisions/unmapped.md | 2026-10-22-merge-test-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-179@v1 | decisions/unmapped.md | 2026-10-22-merge-regression-fixes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-180@v1 | decisions/unmapped.md | 2026-10-22-change-delete-session-history-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-181@v1 | decisions/unmapped.md | 2026-10-22-file-changes-card-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-182@v1 | decisions/unmapped.md | 2026-10-22-sillyspec-probe-db-missing-evict | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-183@v1 | decisions/unmapped.md | 2026-10-20-session-awaiting-answer-status | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-184@v1 | decisions/unmapped.md | 2026-10-22-conversation-live-marquee | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-185@v1 | decisions/unmapped.md | 2026-10-23-translate-budget-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-186@v1 | decisions/unmapped.md | 2026-10-23-semantic-color-scale-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-187@v1 | decisions/unmapped.md | 2026-10-23-review-risk-fixes-2 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-188@v1 | decisions/unmapped.md | 2026-10-23-turn-file-diff-dialog | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-189@v1 | decisions/unmapped.md | 2026-10-22-askuser-dock-inputbar | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-190@v1 | decisions/unmapped.md | 2026-10-23-marquee-item-detail | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-191@v1 | decisions/unmapped.md | 2026-10-23-marquee-ticker-speed | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-192@v1 | decisions/unmapped.md | 2026-10-23-live-turn-meta-time | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-193@v1 | decisions/unmapped.md | 2026-10-23-askuser-history-live-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-194@v1 | decisions/unmapped.md | 2026-10-23-file-card-agent-grouping | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-195@v1 | decisions/unmapped.md | 2026-10-23-session-input-clear-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-196@v1 | decisions/unmapped.md | 2026-10-23-marquee-motion-polish | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-197@v1 | decisions/unmapped.md | 2026-10-23-diff-dialog-copy-fallback | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-198@v1 | decisions/unmapped.md | 2026-10-23-diff-copy-p3-cleanup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-199@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-200@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-201@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-202@v2 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-203@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-204@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-205@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-206@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-207@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-208@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-209@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-210@v1 | decisions/unmapped.md | 2026-10-23-session-network-context | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-211@v1 | decisions/unmapped.md | 2026-10-23-session-dialog-input-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-212@v1 | decisions/unmapped.md | 2026-10-23-session-first-window-turn-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-213@v1 | decisions/unmapped.md | 2026-10-23-skill-prune-git-safe | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-214@v1 | decisions/unmapped.md | 2026-10-23-marquee-blank-track-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-215@v1 | decisions/unmapped.md | 2026-10-23-rename-ghost-pit-doc | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-216@v1 | decisions/unmapped.md | 2026-10-23-marquee-queue-window | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-217@v1 | decisions/unmapped.md | 2026-10-23-session-first-load-ux | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-218@v1 | decisions/unmapped.md | 2026-10-23-marquee-thinking-fulltext | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-219@v1 | decisions/unmapped.md | 2026-10-23-diff-dialog-pairing-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-220@v1 | decisions/unmapped.md | 2026-10-23-watchdog-steering-guard | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-221@v1 | decisions/unmapped.md | 2026-10-23-knowledge-scope-maintenance | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-222@v1 | decisions/unmapped.md | 2026-10-24-close-run-quota-fallback | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-223@v1 | decisions/unmapped.md | 2026-10-24-pi-edit-patch-synth | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-224@v1 | decisions/unmapped.md | 2026-10-22-trajectory-context-jump | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-225@v1 | decisions/unmapped.md | 2026-10-24-backend-mem-limit-raise | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-226@v1 | decisions/unmapped.md | 2026-10-24-trajectory-context-rows | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-227@v1 | decisions/unmapped.md | 2026-10-23-marquee-awaiting-indicator | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-228@v1 | decisions/unmapped.md | 2026-10-25-marquee-subagent-outer-only | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-229@v1 | decisions/unmapped.md | 2026-10-25-subagent-card-unify-panel | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-230@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-231@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-232@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-233@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-234@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-235@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-236@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-237@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-238@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-239@v1 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-240@v1 | decisions/unmapped.md | 2026-10-25-session-tab-visual-unify | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-241@v1 | decisions/unmapped.md | 2026-10-25-askuser-keyword-overkill-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-242@v1 | decisions/unmapped.md | 2026-10-25-marquee-inactive-awaiting-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-243@v1 | decisions/unmapped.md | 2026-10-23-pre-session-draft-persist | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-244@v1 | decisions/unmapped.md | 2026-10-25-marquee-awaiting-real-data | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-245@v1 | decisions/unmapped.md | 2026-10-25-session-git-worktree-root | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-246@v1 | decisions/unmapped.md | 2026-10-25-fe-build-unblock | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-247@v2 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-248@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-249@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-250@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-251@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-252@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-253@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-254@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-255@v1 | decisions/unmapped.md | 2026-10-25-explorer-git-status | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-256@v1 | decisions/unmapped.md | 2026-10-26-worktree-group-collapse | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-257@v1 | decisions/unmapped.md | 2026-10-26-session-stage-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-258@v1 | decisions/unmapped.md | 2026-10-26-session-stage-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-259@v1 | decisions/unmapped.md | 2026-10-26-session-stage-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-260@v1 | decisions/unmapped.md | 2026-10-26-session-stage-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-261@v1 | decisions/unmapped.md | 2026-10-26-session-stage-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-262@v1 | decisions/unmapped.md | 2026-10-26-session-stage-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-263@v1 | decisions/unmapped.md | 2026-10-26-push-skill-docs | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-264@v1 | decisions/unmapped.md | 2026-10-26-config-staged-all-states | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-265@v1 | decisions/unmapped.md | 2026-10-26-turn-phase-prod-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-266@v1 | decisions/unmapped.md | 2026-10-26-turn-phase-orphan-fallback | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-267@v1 | decisions/unmapped.md | 2026-10-26-subagent-card-width-unify | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-268@v1 | decisions/unmapped.md | 2026-10-26-subagent-task-meta-restore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-269@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-270@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-271@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-272@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-273@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-274@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-275@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-276@v2 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-277@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-278@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-279@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-280@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-281@v1 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-282@v1 | decisions/unmapped.md | 2026-10-26-ws-evict-close | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-283@v1 | decisions/unmapped.md | 2026-10-26-ci-red-to-green | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-284@v1 | decisions/unmapped.md | 2026-10-27-mobile-chat-dense | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-285@v1 | decisions/unmapped.md | 2026-10-27-mobile-chat-visual-round2 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-286@v1 | decisions/unmapped.md | 2026-10-27-scheduled-send-attachments | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-287@v1 | decisions/unmapped.md | 2026-10-27-task-wakeup-precision-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-288@v1 | decisions/unmapped.md | 2026-10-27-task-wakeup-inject-retry | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-289@v1 | decisions/unmapped.md | 2026-10-27-mobile-chat-visual-round3 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-290@v1 | decisions/unmapped.md | 2026-10-27-session-input-spacing-tighten | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-291@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-292@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-293@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-294@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-295@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-296@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-297@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-298@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-299@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-300@v1 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-301@v1 | decisions/unmapped.md | 2026-10-27-mobile-chat-visual-round4 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-302@v1 | decisions/unmapped.md | 2026-10-27-netdata-prod-monitoring | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-303@v1 | decisions/unmapped.md | 2026-10-27-sessions-panes-gap-remove | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-304@v1 | decisions/unmapped.md | 2026-10-27-sessions-total-and-status-filter | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-305@v1 | decisions/unmapped.md | 2026-10-27-task-parser-md-check-fallback | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-306@v1 | decisions/unmapped.md | 2026-10-28-knowledge-hits-cli-direct | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-307@v1 | decisions/unmapped.md | 2026-10-28-change-detail-sessions-source-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-308@v1 | decisions/unmapped.md | 2026-10-28-cgroup-v2-watermark-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-309@v1 | decisions/unmapped.md | 2026-10-28-bg-scan-tailread-eviction | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-310@v1 | decisions/unmapped.md | 2026-10-28-reparse-trigger-tests-realign | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-311@v1 | decisions/unmapped.md | 2026-10-28-model-retry-visible | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-312@v1 | decisions/unmapped.md | 2026-10-28-release-mirror-persist | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-313@v1 | decisions/unmapped.md | 2026-10-28-release-record-generator | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-314@v1 | decisions/unmapped.md | 2026-10-28-session-list-loadmore-fetch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-315@v1 | decisions/unmapped.md | 2026-10-29-floating-scope-loadmore-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-316@v1 | decisions/unmapped.md | 2026-10-29-edit-diff-stat-badge | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-317@v1 | decisions/unmapped.md | 2026-10-29-engine-live-perception | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-318@v1 | decisions/unmapped.md | 2026-10-29-engine-live-perception | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| platform | D-unmapped-319@v1 | decisions/unmapped.md | 2026-10-30-task-resume-revive-notify-retry | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-320@v1 | decisions/unmapped.md | 2026-10-30-marquee-awaiting-loop-scroll | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-321@v1 | decisions/unmapped.md | 2026-10-30-quota-error-visible | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-322@v1 | decisions/unmapped.md | 2026-10-30-provider-user-share | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-323@v1 | decisions/unmapped.md | 2026-10-31-share-openai-chat-proxy-token | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-324@v1 | decisions/unmapped.md | 2026-11-02-stale-test-sync-contract | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-325@v1 | decisions/unmapped.md | 2026-11-02-embed-batch-chunk | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-326@v1 | decisions/unmapped.md | 2026-11-02-scan-docs-unbound-view | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-327@v1 | decisions/unmapped.md | 2026-11-02-daemon-resume-gate-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-002@v1 | decisions/unmapped.md | — | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-003@v2 | decisions/unmapped.md | — | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-004@v2 | decisions/unmapped.md | — | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-005@v1 | decisions/unmapped.md | — | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-006@v1 | decisions/unmapped.md | — | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-007@v1 | decisions/unmapped.md | — | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-022@v1 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-023@v2 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-024@v2 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-025@v1 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-026@v1 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-027@v1 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-049@v1 | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-050@v1 | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-051@v1 | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-052@v1 | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-066@v1 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-067@v1 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-068@v2 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-069@v1 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-070@v1 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-071@v1 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-078@v1 | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-079@v1 | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-080@v1 | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-081@v1 | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-084@v1 | decisions/unmapped.md | — | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-138@v1 | decisions/unmapped.md | 2026-09-16-background-task-grace-timeout | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | D-unmapped-173@v1 | decisions/unmapped.md | 2026-09-27-pushgate-green-repair | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-177@v1 | decisions/unmapped.md | 2026-09-27-pushgate-birth-tests-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-218@v1 | decisions/unmapped.md | 2026-10-03-splitgwt-direct-test | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-309@v1 | decisions/unmapped.md | 2026-10-10-release-3-32-4 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-381@v1 | decisions/unmapped.md | 2026-10-15-pseudo-domain-clearance | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-430@v1 | decisions/unmapped.md | 2026-10-20-known-failures-c-recycle | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-438@v1 | decisions/unmapped.md | 2026-10-20-stage-templates-retrofit | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-444@v1 | decisions/unmapped.md | 2026-10-21-brainstorm-proto-worktree | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-445@v1 | decisions/unmapped.md | 2026-10-21-flow-skill-askuser | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-446@v1 | decisions/unmapped.md | 2026-10-21-review-dispatch-answer-salvage | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-447@v1 | decisions/unmapped.md | 2026-10-21-lint-to-prepush | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-448@v1 | decisions/unmapped.md | 2026-10-21-cli-manifest-since-cache | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-449@v1 | decisions/unmapped.md | 2026-10-21-p0-p1-hardening | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-450@v1 | decisions/unmapped.md | 2026-10-21-verify-reuse-large-repo | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-451@v1 | decisions/unmapped.md | 2026-10-21-known-failures-unescape | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-452@v1 | decisions/unmapped.md | 2026-10-21-docref-checkapproval-reanchor | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-453@v1 | decisions/unmapped.md | 2026-10-23-flow-verify-drafts | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-454@v1 | decisions/unmapped.md | 2026-10-23-flow-done-preflight | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-455@v1 | decisions/unmapped.md | 2026-10-23-dirty-gate-ignore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-456@v1 | decisions/unmapped.md | 2026-10-23-turbo-docs-auto | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-457@v1 | decisions/unmapped.md | 2026-10-23-review-inline-dispatch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-458@v1 | decisions/unmapped.md | 2026-10-23-fr-regress-cap | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-459@v1 | decisions/unmapped.md | 2026-10-23-fr-regress-default-off | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-460@v1 | decisions/unmapped.md | 2026-10-23-config-validate-skill | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-461@v1 | decisions/unmapped.md | 2026-10-23-release-3-33-5 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-462@v1 | decisions/unmapped.md | 2026-10-23-schema-registration-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-463@v1 | decisions/unmapped.md | 2026-10-23-py-runner-flags | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-464@v1 | decisions/unmapped.md | 2026-10-23-rename-platform-tombstone | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-465@v1 | decisions/unmapped.md | 2026-10-23-runner-flags-generic | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-466@v1 | decisions/unmapped.md | 2026-10-23-knowledge-scope-inject | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-467@v1 | decisions/unmapped.md | 2026-10-23-knowledge-scope-discoverability | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-468@v1 | decisions/unmapped.md | 2026-10-23-push-squash | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-469@v1 | decisions/unmapped.md | 2026-10-23-push-review-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-470@v1 | decisions/unmapped.md | 2026-10-21-knowledge-tier-denoise | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-471@v1 | decisions/unmapped.md | 2026-10-23-flow-done-shared-repo-multi-session-frictions | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-472@v1 | decisions/unmapped.md | 2026-10-23-push-plan-anchor-batch-perf | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-473@v1 | decisions/unmapped.md | 2026-10-24-flow-done-review-artifact-drift-loop | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-474@v1 | decisions/unmapped.md | 2026-10-28-knowledge-hits-cli-push | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-475@v1 | decisions/unmapped.md | 2026-10-26-target-files-main-docs-rescue | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-476@v1 | decisions/unmapped.md | 2026-10-28-stages-cycle-root-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-477@v1 | decisions/unmapped.md | 2026-10-28-cp-review-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-478@v1 | decisions/unmapped.md | 2026-10-28-overlap-route | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-479@v1 | decisions/unmapped.md | 2026-10-29-open-metrics-gate | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-480@v1 | decisions/unmapped.md | 2026-10-29-metrics-routes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-481@v1 | decisions/unmapped.md | 2026-11-02-knowledge-scope-recall | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-482@v1 | decisions/unmapped.md | 2026-11-02-knowledge-fusion | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-483@v1 | decisions/unmapped.md | 2026-11-02-knowledge-engine-tail | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | FR-unmapped-001 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | unique | manual-domain-map | 本仓唯一真实条目——人工域映射后迁移 |
| sillyspec | FR-unmapped-002 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-003 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-004 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-005 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-006 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-007 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-008 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-009 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-010 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-011 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-012 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-013 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-014 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-015 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-016 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-017 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-018 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-019 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-020 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-021 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-022 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-023 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-024 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-025 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-026 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-027 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-028 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-029 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-030 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-031 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-032 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-033 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-034 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-035 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-036 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-037 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-038 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-039 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-040 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-041 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-042 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-043 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-044 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-045 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-046 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-047 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-048 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-049 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-050 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-051 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-052 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-053 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-054 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-055 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-056 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-057 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-058 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-059 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-060 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-061 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-062 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-063 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-064 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-065 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-066 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-067 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-068 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-069 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-070 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-071 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-072 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-073 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-074 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-075 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-076 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-077 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-078 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-079 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-080 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-081 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-082 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-083 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-084 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-085 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-086 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-087 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-088 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-089 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-090 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-091 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-092 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-093 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-094 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-095 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-096 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-097 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-098 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-099 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-100 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-101 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-102 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-103 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-104 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-105 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-106 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-107 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-108 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-109 | fr/unmapped.md | 2026-06-05-agent-74b61b | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-110 | fr/unmapped.md | 2026-06-05-agent-74b61b | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-111 | fr/unmapped.md | 2026-06-05-agent-74b61b | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-112 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-113 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-114 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-115 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-127 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-128 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-129 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-130 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-131 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-132 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-133 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-134 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-135 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-136 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-137 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-138 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-139 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-140 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-141 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-142 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-207 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-208 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-209 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-210 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-211 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-212 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-213 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-214 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-215 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-216 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-236 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-237 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-238 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-239 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-240 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-241 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-242 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-243 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-244 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-245 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-425 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-426 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-427 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-428 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-429 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-647 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-648 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-649 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-650 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-651 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-652 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-653 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-654 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-655 | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-656 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-657 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-658 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-659 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-660 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-661 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-662 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-663 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-664 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-665 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-666 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-667 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-668 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-669 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-670 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-671 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-672 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-673 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-674 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-675 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-676 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-677 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-678 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-679 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-680 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-681 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-682 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-683 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-684 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-685 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-686 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-687 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-688 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-689 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-690 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-691 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-692 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-693 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-694 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-695 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-696 | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-697 | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-698 | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-699 | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | 另一仓已存在同 ID 条目（fork 快照）——归档或裁剪 |
| sillyspec | FR-unmapped-714 | fr/unmapped.md | workspace-spec-root-managed-p0 | unique | manual-domain-map | 本仓唯一真实条目——人工域映射后迁移 |

## 处置汇总

- platform/decisions/unmapped.md/archive-or-prune：131
- platform/decisions/unmapped.md/manual-domain-map：4
- platform/decisions/unmapped.md/mark-draft-exclude：173
- sillyspec/decisions/unmapped.md/archive-or-prune：28
- sillyspec/decisions/unmapped.md/mark-draft-exclude：47
- sillyspec/fr/unmapped.md/archive-or-prune：208
- sillyspec/fr/unmapped.md/manual-domain-map：2

## 下一变更输入

- 4B（定向迁移）：`manual-domain-map` 条目 = 本仓唯一真实决策 + 平台唯一真实决策（附 id/标题/变更，人工定域后迁）
- 4C（resolved 状态）：known-issues 状态词人工审核（不在本报告范围）
- 模板 draft 候选与重复裁剪候选见处置表
