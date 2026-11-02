# 4A 数据分层与来源对账报告（只读）

生成时间：2026-11-02T09:15:06.192Z
平台知识库：`C:/Users/qinyi/IdeaProjects/multi-agent-platform/.sillyspec/knowledge`
段头守恒：ledger 593 = 本仓 decisions 75 + 本仓 fr 210 + 平台 decisions 308 + 平台 fr 0
零写入：两仓 knowledge 目录执行前后 hash 一致（断言通过）

## 与审查实测数字对照

| 指标 | 审查实测 | 本次对账 | 说明 |
|---|---|---|---|
| 本仓 decisions/unmapped | 74 | 75 | 差 1：段头解析口径差异（`## D-` 头计数一致于 ledger），4B 前人工复核 |
| 本仓 fr/unmapped | 210 | 210 | 一致 |
| 平台 decisions/unmapped | 308 | 308 | 一致 |
| 两仓同 ID 条目（overlap） | 1026 | 1026 | 一致（注意：同 ID ≠ 同条目，重复判定已按 id+change） |
| 本仓 decisions 模板/真实 | 46/28 | 47/28 | 模板启发式差 1（75 与 74 同源）；真实 28 = duplicate 21（同 id+change 证据）+ unique 7 |
| 平台 decisions 模板/真实 | 173/135 | 173/135 | 模板一致；真实 135 = duplicate 0 + unique 135 |
| 本仓 fr 重复/唯一 | 208/2 | 208/2 | 一致 |

## 分类计数

- 本仓 decisions：{"unique":7,"duplicate-of-platform":21,"template-draft":47}（模板 47）
- 本仓 fr：{"unique":2,"duplicate-of-platform":208}
- 平台 decisions：{"unique":135,"template-draft":173}
- 平台 fr：{}

## 处置表（4B/4C 输入）

| 仓 | id | 标题 | 文件 | change | class | 动作 | 重复证据/理由 |
|---|---|---|---|---|---|---|---|
| platform | D-unmapped-026@v1 | dsh 二进制发现策略——照 agent-detector 先例 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-027@v1 | dsh 版本门语义——最低版本门 + 警告（不硬拒） | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-028@v1 | 驱动层实现方式——自研 ACP 驱动（方案 A） | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-029@v1 | 落选——官方 @agentclientprotocol/sdk 客户端包（方案 B） | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-030@v1 | 落选——headless --json 短命进程批处理通道（方案 C） | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-031@v1 | 执行期任务边界合并——task-03 驱动与 task-04 注册的类型依赖 | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-032@v1 | 执行期任务边界修正——task-07 单一源实为 runtimes.ts | decisions/unmapped.md | 2026-10-15-dsh-engine-acp | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-033@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-15-pseudo-domain-migration | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-034@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-15-workspace-session-agent-only | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-035@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-15-assets-graph-depth | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-036@v1 | 日志源=应用侧落文件+轮转（用户亲选） | decisions/unmapped.md | 2026-10-15-server-logs-panel | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-037@v1 | 展示形式=结构化+自动刷新（用户亲选） | decisions/unmapped.md | 2026-10-15-server-logs-panel | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-038@v1 | 下载范围=单文件可选历史（用户亲选） | decisions/unmapped.md | 2026-10-15-server-logs-panel | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-039@v1 | 权限=复用 system_status:read（用户亲选） | decisions/unmapped.md | 2026-10-15-server-logs-panel | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-040@v1 | 日志落盘实现=单点插入文件写入（用户亲选，方案 A） | decisions/unmapped.md | 2026-10-15-server-logs-panel | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-041@v1 | 页面布局=日志卡满宽居底（用户亲选） | decisions/unmapped.md | 2026-10-15-server-logs-panel | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-042@v1 | 日志条数参数与轮转参数的可配口径（AI 定案，可否决） | decisions/unmapped.md | 2026-10-15-server-logs-panel | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-043@v1 | ZCode 引擎发现策略——三段式探测（env 覆盖 → PATH → Desktop 固定路径） | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-044@v1 | 会话数据隔离边界——配置面 per-session 隔离，会话库接受机器共享 | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-045@v1 | 模型路由——平台 LlmProvider 接管（per-session provider_config.json 注入） | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-046@v1 | 版本门语义——最低版本门 + 警告（不硬拒） | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-047@v1 | 驱动层实现方式——自研 ZCode 私有协议驱动（无备选，落选项登记） | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-048@v1 | 落选——等待官方 ACP/SDK 支持面（事实性落选登记） | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-049@v1 | 驱动承载形态——独立驱动 + 独立轻量信封层 + 每会话一进程（方案 A） | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-050@v1 | 执行期三类协议形状修正（实测驱动，task-08 冒烟抓出） | decisions/unmapped.md | 2026-10-15-zcode-engine-appserver | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-051@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-proto-pipeline-discoverability | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-052@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-driver-audit-fixes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-053@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-archived-files-tab | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-054@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-15-session-turn-completion-semantics | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-055@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-session-run-status-realtime | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-056@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-15-server-logs-dockerfile-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-057@v1 | 落选——方案 C（进程内卸载 + 拉长轮询 + 缓存） | decisions/unmapped.md | 2026-10-16-backend-mem-polling | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-058@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-deploy-convergence-guard | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-059@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-change-files-sync-result | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-060@v1 | sessions 表增 family_id 列建模会话族 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-061@v1 | refresh 复用检测从全用户吊销改为族级吊销 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-062@v1 | grace 宽限窗默认 60s → 300s | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-063@v1 | 前端 doRefresh 按状态码分流——5xx 抛错不清会话 | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-064@v1 | 根因一实现方案选 A（会话族吊销 + 宽限窗加大） | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-065@v1 | 方案 B（只加大宽限窗，不加族系列） | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-066@v1 | 方案 C（复用检测只拒绝不吊销） | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-067@v1 | 族吊销必须内部 commit（执行期裁决，纠正 design 笔误） | decisions/unmapped.md | 2026-10-16-fix-auth-random-logout | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-068@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-agent-session-field-pin-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-069@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-daemon-pull-antiresurrect | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-070@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-change-center-back-keeps-list-state | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-071@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-change-title-condense-backfill | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-072@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-change-center-delete-back-keeps-state | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-073@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-pg-index-local-followup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-074@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-knowledge-module-card | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-075@v1 | rejected 方案 B——后端聚合端点 GET /sessions/{id}/decisions | decisions/unmapped.md | 2026-10-16-session-decision-pill | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-076@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-decision-pill-no-workspace | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-077@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-17-audit-risk-followup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-078@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-17-zcode-provider-config-shape | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-079@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-17-dsh-rc2-protocol-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-080@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-17-dsh-rc2-routing-restore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-081@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-17-session-replay-pingpong-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-082@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-17-session-envelope-rev-stale-guard | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-083@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-18-audit-log-redact-yaml-quote | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-084@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-18-change-type-git-conventional | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-085@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-18-change-list-type-filter | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-086@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-assets-audit-expand-toggle | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-087@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-shared-agent-onboarding-hint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-088@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-hide-shared-profile-in-session | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-089@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-platform-auto-commit-type | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-090@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-change-list-created-sort | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-091@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-knowledge-inbox-triage | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-092@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-knowledge-search-build-switch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-093@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-thinking-zh-translate | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-094@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-translate-live-verify | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-095@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-knowledge-build-switch-rollout | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-096@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-change-assets-cross-repo-repos | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-097@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-cross-repo-patch-slicing | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-098@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-preview-card-empty-turn-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-099@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-backfill-dryrun-log-scrub | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-100@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-root-ruff-config | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-101@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-sillyspec-gotchas-session | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-102@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-conflict-platform-archive | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-103@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-session-error-visibility | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-103@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-pill-dock-left-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-104@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-codex-requires-openai-auth | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-104@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-pill-dock-drag-align-keep | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-105@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-session-pill-dock-drag | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-105@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-codex-models-fetch-candidates | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-106@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-provider-switch-transcript-sanitize | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-106@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-preset-engine-endpoint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-107@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-host-settings-live-reload | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-107@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-session-status-live-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-108@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-host-settings-reload-latency | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-108@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-gitlog-quotepath-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-109@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-overview-card-mainflow-scan | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-110@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-gitlog-conflict-quotepath | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-111@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-mobile-scan-birth-cleanup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-112@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-precommit-sandbox-entries | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-113@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-precommit-cleanup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-114@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-files-refresh-spinner | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-115@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-task-wakeup-restore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-116@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-archive-patch-repair | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-117@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-spec-manifest-incremental | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-118@v1 | 参考粒度＝交互模型与数据口径，不移植 DSH 插件化客户端架构 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-119@v1 | 动机＝日常主力工作台 + 对外演示可用 + 与 DSH 直接对标（非「会话规模爆炸」驱动） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-120@v1 | 视图模型不在对话里拍板——先出 HTML 原型看效果再定（用户选 C） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-121@v1 | 原型出「A/B 双形态对比」单页（我的判断） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-122@v1 | 成功标准延后到原型确认后定稿（草案 SC-01..SC-05 随原型呈现） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-123@v1 | 方案定稿推迟到原型确认轮；原型出 A/C 双形态（修订 D-005 的 A/B 组合） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-124@v1 | 原型形态升级为 dev 预览路由（直接渲染真实会话组件） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-125@v1 | 「继续用静态 prototype:build 复刻会话页」被否决 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-126@v1 | 静态交付形态＝真实组件树的 SSR 快照 + 内联 CSS（交互仍走 dev 路由） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-127@v2 | 视觉基线＝真实页面的**结构**（三主题并存，不把深色当基线）〔取代 D-015@v1〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-128@v1 | 视觉稿必须由真实组件产出（手绘 HTML 只作参考，不作定稿） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-129@v1 | 静态原型导出必须「浏览器水合后序列化 DOM」，禁止抓 SSR HTML | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-130@v1 | 此前三次「效果不咋地 / 看不出区别」的判定，基于缺正文的残缺稿，需在修复稿上重判 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-131@v1 | 删除轮间 1px hairline，仅以留白分隔轮次（用户方向） | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-132@v1 | 对比加强（答案压过过程）——四组参数定稿 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-133@v1 | 轨迹视图形态＝泳道时间轴（共享绝对时间轴 × 输入/模型/工具），账本降为「调用」档 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-134@v1 | 过程行采用 DSH 式语义标签（思考 / 运行命令 / 收到任务消息…），daemon 采集缓发 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-135@v1 | 1b 快照落库点修正——interactive 轮走 `close_run_steps`，不走 `lease/service.complete_lease`〔2026-10-21 execute 期实证〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-136@v1 | 1b 读模型落点＝`GET /sessions/{id}/runs`（SessionRunRead），`TurnOutlineItemRead` 不加字段〔2026-10-21 execute 期裁决〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-137@v1 | 后到快照必须在「run 已终态」的二次上报里补写侧表（否则 1b 对 interactive 全废）〔2026-10-21 execute 期实证〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-138@v1 | 前端降级判据以 capability 为准；`snapshot=null` 且 `capability` 也缺＝「未接线」，不出卡〔2026-10-21 execute 期裁决〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-139@v1 | TTFT/attempt 实际只能 `basis="approx"`（三引擎均无「模型请求起点」事件）；attempt 沿用近似起点而非只记终点〔2026-10-21 execute 期实证〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-140@v1 | 迁移链尾锚测试随新迁移一并前移（提交 hook 强制连带）〔2026-10-21 execute 期登记〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-141@v1 | `partial` 且无文件清单时出「一行提示卡」——不得静默成「本轮无改动」〔2026-10-21 execute 期独立审查阻断项修复〕 | decisions/unmapped.md | 2026-10-20-session-page-dsh-alignment | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-142@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-session-git-branch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-143@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-review-risk-fixes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-144@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-daemon-snapshot-report-log | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-145@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-fix-translate-cjk-segments | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-146@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-protect-cjk-source | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-147@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-task-wakeup-event-queue | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-148@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-turn-trigger-generalize | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-149@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-askuser-card-inline | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-150@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-turn-trigger-metadata-p2 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-151@v1 | 轨迹面板以 dsh（deepseek-harness）ui-trajectory 为视觉与交互基准 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-152@v1 | 顶部固定布局——工具栏与时间线不随账本滚动 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-153@v1 | 工具栏四项语义与行为 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-154@v1 | 账本形态——无表头两列紧凑表格 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-155@v1 | 详情面板——多标签 + 可调宽 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-156@v1 | 采用组件族拆分方案（B） | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-157@v1 | 否决「原地重构 trajectory-view.tsx」（方案 A） | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-158@v1 | 否决「直接移植 dsh 组件」（方案 C） | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-159@v1 | 总览缩略条随 D-017 一并裁剪，实际时长保留缩放/平移/双击重置 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-160@v1 | 设计方案与真码原型定稿 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-161@v1 | 搜索时折叠整体失效，时间线不做降透明 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-162@v1 | 折叠/搜索隐藏选中行时清空选中，键盘只遍历可见行 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-163@v1 | 工具行参数/结果字段来源（允许 from-turn-views 小改） | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-164@v1 | 等宽模式为只读概览 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-165@v1 | D-007 覆盖 D-005 的 Schema 子项 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-166@v1 | 时长偏好为全局偏好 | decisions/unmapped.md | 2026-10-22-trajectory-view-redesign | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-167@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-session-pill-dock-drag | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-168@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-16-provider-switch-transcript-sanitize | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-169@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-host-settings-live-reload | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-170@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-19-host-settings-reload-latency | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-171@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-pill-dock-left-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-172@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-pill-dock-drag-align-keep | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-173@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-agent-profile-slim-default | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-174@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-provider-default-ui-hint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-175@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-profile-default-prehint | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-176@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-agent-profile-modal-restyle | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-177@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-agent-profile-edit-refresh | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-178@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-merge-test-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-179@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-merge-regression-fixes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-180@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-change-delete-session-history-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-181@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-file-changes-card-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-182@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-sillyspec-probe-db-missing-evict | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-183@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-session-awaiting-answer-status | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-184@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-conversation-live-marquee | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-185@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-translate-budget-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-186@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-semantic-color-scale-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-187@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-review-risk-fixes-2 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-188@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-turn-file-diff-dialog | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-189@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-askuser-dock-inputbar | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-190@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-marquee-item-detail | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-191@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-marquee-ticker-speed | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-192@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-live-turn-meta-time | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-193@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-askuser-history-live-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-194@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-file-card-agent-grouping | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-195@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-session-input-clear-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-196@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-marquee-motion-polish | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-197@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-diff-dialog-copy-fallback | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-198@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-diff-copy-p3-cleanup | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-199@v1 | 每轮注入【网络环境】前导段，不动首轮一次性策略 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-200@v1 | 同网段判定双源——后端观测 daemon 请求源 IP 为 ground truth，daemon 自报网卡列表用于拼访问地址 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-201@v1 | 共享机器的内网 IP 对借用人可见 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-202@v2 | 共享机器权威口径 = grants 表（supersedes D-005@v1） | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-203@v1 | 注入去重——内容快照变化才重注 + 会话内最短间隔兜底 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-204@v1 | 排队/steering 轮注入语义——入队存用户 IP，派发时重算判定 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-205@v1 | 快照 60s 窗口语义——不吞变化，到点补注 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-206@v1 | 心跳契约扩展须同步四个钉子测试文件 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-207@v1 | daemon_instances 加 JSON 列 + Alembic 迁移，链尾锚测试前移一行 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-208@v1 | 实现方案选定——方案 A 平台自动注入（每轮 CIDR 判定 + 前导段注入） | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-209@v1 | 落选方案 B——agent 按需查询工具（get_network_info MCP 工具） | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-210@v1 | 落选方案 C——仅前端展示网络徽标不注入 | decisions/unmapped.md | 2026-10-23-session-network-context | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-211@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-session-dialog-input-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-212@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-session-first-window-turn-align | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-213@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-skill-prune-git-safe | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-214@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-marquee-blank-track-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-215@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-rename-ghost-pit-doc | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-216@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-marquee-queue-window | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-217@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-session-first-load-ux | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-218@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-marquee-thinking-fulltext | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-219@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-diff-dialog-pairing-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-220@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-watchdog-steering-guard | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-221@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-knowledge-scope-maintenance | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-222@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-24-close-run-quota-fallback | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-223@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-24-pi-edit-patch-synth | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-224@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-22-trajectory-context-jump | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-225@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-24-backend-mem-limit-raise | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-226@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-24-trajectory-context-rows | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-227@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-marquee-awaiting-indicator | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-228@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-marquee-subagent-outer-only | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-229@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-subagent-card-unify-panel | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-230@v1 | 按 dsh 引擎机制做全套（消息来源标记 + 请求头快照），跨三端 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-231@v1 | 系统提示词行做「配置面快照」口径（引擎全文不可得） | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-232@v1 | 存量历史会话如实呈现（无标记 → 用户行），不做启发式兜底 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-233@v1 | revert 已提交的启发式代码（77ba0588b / c93aafc84） | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-234@v1 | 采用方案 A——复用日志通道（metadata 盖戳 + 新 channel 快照 + submit 透传修复） | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-235@v1 | 否决「独立快照表 + REST 上报」（方案 B） | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-236@v1 | 否决「纯前端不落库」（方案 C） | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-237@v1 | 设计定稿——三段式（注入盖戳 / daemon 快照 / 前端行）+ 真码原型 | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-238@v1 | 新注入类归 turn_trigger 体系（非独立 sender 键） | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-239@v1 | 变更检测在 daemon 侧，只报 initial/change（非每轮落快照） | decisions/unmapped.md | 2026-10-25-trajectory-source-model | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-240@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-session-tab-visual-unify | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-241@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-askuser-keyword-overkill-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-242@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-marquee-inactive-awaiting-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-243@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-pre-session-draft-persist | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-244@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-marquee-awaiting-real-data | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-245@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-session-git-worktree-root | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-246@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-25-fe-build-unblock | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-247@v2 | 忽略条目按顶层聚合展示，不递归展开（措辞精度修订） | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-248@v1 | diff 基线一律 HEAD，不区分暂存区；untracked/已删除特例展示 | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-249@v1 | explorer 树着色不改点击行为，diff 入口仅修改集合视图 | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-250@v1 | 状态采集沿用 git_log 既有三层链路，daemon 新增两个平名能力 | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-251@v1 | 落选——方案 B（explorer 契约内嵌状态字段）— rejected | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-252@v1 | 落选——方案 C（daemon watch + 实时推送）— rejected | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-253@v1 | untracked diff 采集用局部 execFile 读退出码（exit 0/1 均成功） | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-254@v1 | porcelain v2 解析契约——末段 rejoin、u 条目按 modified、祖先蓝点不含 ignored | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-255@v1 | 并行变更遗留红测试的就地对齐（turn-timeline 断言恢复） | decisions/unmapped.md | 2026-10-25-explorer-git-status | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-256@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-worktree-group-collapse | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-257@v1 | 否决方案 B——后端推断式（零 daemon 改动） | decisions/unmapped.md | 2026-10-26-session-stage-progress | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-258@v1 | 否决方案 C——心跳快照轮询 | decisions/unmapped.md | 2026-10-26-session-stage-progress | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-259@v1 | 超时阈值=前端常量 30s（非用户/服务端配置） | decisions/unmapped.md | 2026-10-26-session-stage-progress | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-260@v1 | 轮内阶段由客户端从已有事件映射，不发新事件 | decisions/unmapped.md | 2026-10-26-session-stage-progress | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-261@v1 | 阶段上报失败静默降级，不阻塞会话主流程 | decisions/unmapped.md | 2026-10-26-session-stage-progress | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-262@v1 | 断线/刷新后阶段未知→回退现有兜底文案，不做持久化 | decisions/unmapped.md | 2026-10-26-session-stage-progress | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-263@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-push-skill-docs | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-264@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-config-staged-all-states | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-265@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-turn-phase-prod-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-266@v1 | 回退安全性前提=单会话单活跃 run 不变式(反例排查) | decisions/unmapped.md | 2026-10-26-turn-phase-orphan-fallback | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-267@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-subagent-card-width-unify | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-268@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-subagent-task-meta-restore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-269@v1 | 轻量变更耗时口径=总时长 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-270@v1 | 全量异常态=异色圈+状态字 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-271@v1 | 进度展示位置=下拉项内嵌+入口旁单个总进度圈 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-272@v1 | 数据链路=方案A后端投影扩展 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-273@v1 | execute 阶段圈口径=Task 表 n/m | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-274@v1 | brainstorm→thin 分流态归轻量渲染 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-275@v1 | 升厚变更切换全量渲染+标注 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-276@v2 | 轻量数据通道=daemon heartbeat 载荷扩展+条目 workspace 维度+backend 全新逐变更写入路径 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-277@v1 | 入口圈选取=前端显式 updated_at 重排 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-278@v1 | heartbeat thin_flow 写入不刷 changes.updated_at | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-279@v1 | 已归档项不渲染进度行 | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-280@v1 | 落选方案B（前端按需拉详情） | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-281@v1 | 落选方案C（daemon SSE 实时推） | decisions/unmapped.md | 2026-10-26-session-change-progress-hover | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-282@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-ws-evict-close | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-283@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-ci-red-to-green | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-284@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-mobile-chat-dense | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-285@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-mobile-chat-visual-round2 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-286@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-scheduled-send-attachments | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-287@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-task-wakeup-precision-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-288@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-task-wakeup-inject-retry | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-289@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-mobile-chat-visual-round3 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-290@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-session-input-spacing-tighten | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-291@v1 | 治本目标定为增量方案（又快又稳） | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-292@v1 | mem_limit 再上调只作方案附录建议，不在本次实施 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-293@v1 | 治本方案选定方案C（scoped 增量承接归档 + 探针对账兜底） | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-294@v1 | 方案A（免 reparse 靶向改库）落选 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-295@v1 | 方案B（全量合并窗治理）落选 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-296@v1 | 双通道时效分档（结构性立即 / 普通推送 2 分钟合并窗） | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-297@v1 | 漂移探针只告警不自动修复 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-298@v1 | bundle gzip 构建加同版本 single-flight | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-299@v1 | structural 触发撞在途 reparse 时尾随改「完成回调即时补发」 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-300@v1 | bundle 等待者 Future 失败传播 + 降级自建 | decisions/unmapped.md | 2026-10-27-archive-reparse-oom-governance | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-301@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-mobile-chat-visual-round4 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-302@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-netdata-prod-monitoring | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-303@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-sessions-panes-gap-remove | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-304@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-sessions-total-and-status-filter | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-305@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-27-task-parser-md-check-fallback | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-306@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-knowledge-hits-cli-direct | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-307@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-change-detail-sessions-source-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-308@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-cgroup-v2-watermark-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-309@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-bg-scan-tailread-eviction | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-310@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-reparse-trigger-tests-realign | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-311@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-model-retry-visible | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-312@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-release-mirror-persist | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-313@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-release-record-generator | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-314@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-session-list-loadmore-fetch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-315@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-29-floating-scope-loadmore-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-316@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-29-edit-diff-stat-badge | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-317@v1 | 落选——估算并入既有 usage_update 通道 | decisions/unmapped.md | 2026-10-29-engine-live-perception | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-318@v1 | 落选——纯前端等待态分级（不动 daemon） | decisions/unmapped.md | 2026-10-29-engine-live-perception | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| platform | D-unmapped-319@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-30-task-resume-revive-notify-retry | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-320@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-30-marquee-awaiting-loop-scroll | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-321@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-30-quota-error-visible | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-322@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-30-provider-user-share | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-323@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-31-share-openai-chat-proxy-token | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-324@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-11-02-stale-test-sync-contract | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-325@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-11-02-embed-batch-chunk | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-326@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-11-02-scan-docs-unbound-view | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| platform | D-unmapped-327@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-11-02-daemon-resume-gate-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-002@v1 | : 平台共享智能体绑定的守护进程取管理员自己名下 | decisions/unmapped.md | — | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | D-unmapped-003@v2 | : 平台共享智能体会话——源码只读 + 指定目录可写 | decisions/unmapped.md | — | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | D-unmapped-004@v2 | : 共享机器/智能体由用户在会话中显式选择 | decisions/unmapped.md | — | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | D-unmapped-005@v1 | : 实现方案选 B——统一授权表 daemon_runtime_grants | decisions/unmapped.md | — | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | D-unmapped-006@v1 | : 打破 daemon 零改动 Non-Goal——session 级 overlay roots 写守卫增量（spike-02 B 裁决） | decisions/unmapped.md | — | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | D-unmapped-007@v1 | : platform grant 的 pinned runtime 不经共享档案直接钉定 → 404 | decisions/unmapped.md | — | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | D-unmapped-022@v1 | : 缓存范围 = has_permission + data_scope 一并覆盖 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | D-001@v1@2026-07-23-rbac-permission-cache |
| sillyspec | D-unmapped-023@v2 | : 失效策略 = 整体清空 + 失效失败 ERROR 告警(supersedes D-002@v1) | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | D-002@v2@2026-07-23-rbac-permission-cache |
| sillyspec | D-unmapped-024@v2 | : 缓存粒度 = 拆键 platform/all/workspace + everywhere 内存并集(supersedes D-003@v1) | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | D-003@v2@2026-07-23-rbac-permission-cache |
| sillyspec | D-unmapped-025@v1 | : 无 Redis 降级 = 回退查 DB(不加本地兜底) | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | D-004@v1@2026-07-23-rbac-permission-cache |
| sillyspec | D-unmapped-026@v1 | : ppm-scope uuid 反序列化保证类型 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | D-005@v1@2026-07-23-rbac-permission-cache |
| sillyspec | D-unmapped-027@v1 | : WorkspaceService.create 失效点补全 | decisions/unmapped.md | 2026-07-23-rbac-permission-cache | duplicate-of-platform | archive-or-prune | D-006@v1@2026-07-23-rbac-permission-cache |
| sillyspec | D-unmapped-049@v1 | : 方案 A——daemon 消费 SDK task_* + agent_task_status SSE 通道扩展 | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | D-001@v1@2026-08-27-background-subagent-progress |
| sillyspec | D-unmapped-050@v1 | : 生命周期双写——SSE 事件 + [TASK_*] 持久日志行 | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | D-002@v1@2026-08-27-background-subagent-progress |
| sillyspec | D-unmapped-051@v1 | : 跨轮归位在 backend 落库时做（submit_messages 重映射 run_id） | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | D-003@v1@2026-08-27-background-subagent-progress |
| sillyspec | D-unmapped-052@v1 | : 空 prompt 防御——后端 422 为主，前端禁点为辅 | decisions/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | D-004@v1@2026-08-27-background-subagent-progress |
| sillyspec | D-unmapped-066@v1 | : 注入通道选前导拼接，不动 system_prompt 与 daemon | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | D-001@v1@2026-08-29-session-user-preamble |
| sillyspec | D-unmapped-067@v1 | : 仅首轮注入 + 覆盖重派重渲染路径；后续轮次与服务身份注入不带 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | D-002@v1@2026-08-29-session-user-preamble |
| sillyspec | D-unmapped-068@v2 | : 不加 Role 字段，角色名称直接给 agent 自行判断沟通风格 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | D-003@v2@2026-08-29-session-user-preamble |
| sillyspec | D-unmapped-069@v1 | : SillySpec 工具规则条件注入（工作区根存在 .sillyspec/ 才拼） | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | D-004@v1@2026-08-29-session-user-preamble |
| sillyspec | D-unmapped-070@v1 | : batch（批量任务）路径本期不注入 | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | D-005@v1@2026-08-29-session-user-preamble |
| sillyspec | D-unmapped-071@v1 | : 整体方案选 A（后端前导拼接 + Role 受众字段），否决 B（纯 prompt 猜测）与 C（system_prompt 通道） | decisions/unmapped.md | 2026-08-29-session-user-preamble | duplicate-of-platform | archive-or-prune | D-007@v1@2026-08-29-session-user-preamble |
| sillyspec | D-unmapped-078@v1 | : 缺口①触发形态 — 心跳恢复事件触发 | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | D-001@v1@2026-08-30-daemon-self-heal |
| sillyspec | D-unmapped-079@v1 | : 下载校验口径 — 零子进程 | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | D-003@v1@2026-08-30-daemon-self-heal |
| sillyspec | D-unmapped-080@v1 | : respawn 最后防线 — 不退出保活 | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | D-005@v1@2026-08-30-daemon-self-heal |
| sillyspec | D-unmapped-081@v1 | : respawn 前校验提前到 stop 之前（主拦截点） | decisions/unmapped.md | 2026-08-30-daemon-self-heal | duplicate-of-platform | archive-or-prune | D-009@v1@2026-08-30-daemon-self-heal |
| sillyspec | D-unmapped-084@v1 | : PPM 个人工作台头像维持首字占位（用户头像功能非目标） | decisions/unmapped.md | — | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | D-unmapped-138@v1 | 维持 R-01 接受不修代码，文档登记观察项（方案 A） | decisions/unmapped.md | 2026-09-16-background-task-grace-timeout | duplicate-of-platform | archive-or-prune | D-001@v1@2026-09-16-background-task-grace-timeout |
| sillyspec | D-unmapped-173@v1 | 风险与死路（design 槽4 收割） | decisions/unmapped.md | 2026-09-27-pushgate-green-repair | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-177@v1 | 风险与死路（design 槽4 收割） | decisions/unmapped.md | 2026-09-27-pushgate-birth-tests-sync | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-218@v1 | 风险与死路（design 槽4 收割） | decisions/unmapped.md | 2026-10-03-splitgwt-direct-test | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-309@v1 | 风险与死路（design 槽4 收割） | decisions/unmapped.md | 2026-10-10-release-3-32-4 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-381@v1 | 风险与死路（design 槽4 收割） | decisions/unmapped.md | 2026-10-15-pseudo-domain-clearance | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-430@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-known-failures-c-recycle | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-438@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-20-stage-templates-retrofit | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-444@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-brainstorm-proto-worktree | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-445@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-flow-skill-askuser | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-446@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-review-dispatch-answer-salvage | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-447@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-lint-to-prepush | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-448@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-cli-manifest-since-cache | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-449@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-p0-p1-hardening | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-450@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-verify-reuse-large-repo | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-451@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-known-failures-unescape | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-452@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-docref-checkapproval-reanchor | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-453@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-flow-verify-drafts | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-454@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-flow-done-preflight | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-455@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-dirty-gate-ignore | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-456@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-turbo-docs-auto | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-457@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-review-inline-dispatch | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-458@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-fr-regress-cap | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-459@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-fr-regress-default-off | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-460@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-config-validate-skill | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-461@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-release-3-33-5 | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-462@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-schema-registration-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-463@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-py-runner-flags | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-464@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-rename-platform-tombstone | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-465@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-runner-flags-generic | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-466@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-knowledge-scope-inject | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-467@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-knowledge-scope-discoverability | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-468@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-push-squash | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-469@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-push-review-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-470@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-21-knowledge-tier-denoise | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-471@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-flow-done-shared-repo-multi-session-frictions | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-472@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-23-push-plan-anchor-batch-perf | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-473@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-24-flow-done-review-artifact-drift-loop | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-474@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-knowledge-hits-cli-push | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-475@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-26-target-files-main-docs-rescue | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-476@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-stages-cycle-root-fix | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-477@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-cp-review-debt | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-478@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-28-overlap-route | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-479@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-29-open-metrics-gate | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-480@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-10-29-metrics-routes | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-481@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-11-02-knowledge-scope-recall | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-482@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-11-02-knowledge-fusion | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | D-unmapped-483@v1 | 设计期风险与放弃方案（底稿） | decisions/unmapped.md | 2026-11-02-knowledge-engine-tail | template-draft | mark-draft-exclude | 底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位 |
| sillyspec | FR-unmapped-001 | 普通项目可创建 Workspace | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |
| sillyspec | FR-unmapped-002 | 平台托管规范空间 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-002@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-003 | Agent Spec Profile | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-003@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-004 | 规范冲突策略 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-004@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-005 | Claude Code Agent 接入 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-005@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-006 | Agent 类型一致性 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-006@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-007 | 规范文件独立存储 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-007@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-008 | SillySpec CLI 作为 Agent 工具 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-008@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-009 | SpecValidator 程序验证 | fr/unmapped.md | 2026-05-27-platform-native-sillyspec | duplicate-of-platform | archive-or-prune | FR-unmapped-009@2026-05-27-platform-native-sillyspec |
| sillyspec | FR-unmapped-010 | Agent stdout 逐行流式发布 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | FR-unmapped-010@2026-05-28-agent-log-streaming |
| sillyspec | FR-unmapped-011 | SSE 实时日志端点 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | FR-unmapped-011@2026-05-28-agent-log-streaming |
| sillyspec | FR-unmapped-012 | 前端实时日志消费 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | FR-unmapped-012@2026-05-28-agent-log-streaming |
| sillyspec | FR-unmapped-013 | DB 日志持久化不受影响 | fr/unmapped.md | 2026-05-28-agent-log-streaming | duplicate-of-platform | archive-or-prune | FR-unmapped-013@2026-05-28-agent-log-streaming |
| sillyspec | FR-unmapped-014 | Workspace 吸收 Component 元数据 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-014@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-015 | 移除旧 Component 核心数据面 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-015@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-016 | 创建 WorkspaceRelation | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-016@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-017 | 支持循环依赖图 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-017@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-018 | Change 支持多 Workspace | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-018@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-019 | Task 支持多 Workspace | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-019@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-020 | AgentRun 支持多 Workspace | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-020@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-021 | AgentSpecBundle 基于 Workspace Graph 构建 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-021@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-022 | 全局拓扑 API | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-022@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-023 | 后续独立变更包边界 | fr/unmapped.md | 2026-05-28-component-as-workspace | duplicate-of-platform | archive-or-prune | FR-unmapped-023@2026-05-28-component-as-workspace |
| sillyspec | FR-unmapped-024 | Router 统一挂载 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | FR-unmapped-024@2026-05-29-harness-control-plane |
| sillyspec | FR-unmapped-025 | Workflow 状态流转 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | FR-unmapped-025@2026-05-29-harness-control-plane |
| sillyspec | FR-unmapped-026 | Spec Guardian 门禁 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | FR-unmapped-026@2026-05-29-harness-control-plane |
| sillyspec | FR-unmapped-027 | Policy 校验 | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | FR-unmapped-027@2026-05-29-harness-control-plane |
| sillyspec | FR-unmapped-028 | AuditLog | fr/unmapped.md | 2026-05-29-harness-control-plane | duplicate-of-platform | archive-or-prune | FR-unmapped-028@2026-05-29-harness-control-plane |
| sillyspec | FR-unmapped-029 | 创建 candidate | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | FR-unmapped-029@2026-05-29-knowledge-lifecycle |
| sillyspec | FR-unmapped-030 | Reviewer 确认 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | FR-unmapped-030@2026-05-29-knowledge-lifecycle |
| sillyspec | FR-unmapped-031 | 验证和推广 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | FR-unmapped-031@2026-05-29-knowledge-lifecycle |
| sillyspec | FR-unmapped-032 | 废弃 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | FR-unmapped-032@2026-05-29-knowledge-lifecycle |
| sillyspec | FR-unmapped-033 | 查询过滤 | fr/unmapped.md | 2026-05-29-knowledge-lifecycle | duplicate-of-platform | archive-or-prune | FR-unmapped-033@2026-05-29-knowledge-lifecycle |
| sillyspec | FR-unmapped-034 | runtime 注册 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | FR-unmapped-034@2026-05-29-local-runner-execution-loop |
| sillyspec | FR-unmapped-035 | heartbeat | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | FR-unmapped-035@2026-05-29-local-runner-execution-loop |
| sillyspec | FR-unmapped-036 | claim task | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | FR-unmapped-036@2026-05-29-local-runner-execution-loop |
| sillyspec | FR-unmapped-037 | 隔离执行环境 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | FR-unmapped-037@2026-05-29-local-runner-execution-loop |
| sillyspec | FR-unmapped-038 | 消息流上报 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | FR-unmapped-038@2026-05-29-local-runner-execution-loop |
| sillyspec | FR-unmapped-039 | 执行完成 | fr/unmapped.md | 2026-05-29-local-runner-execution-loop | duplicate-of-platform | archive-or-prune | FR-unmapped-039@2026-05-29-local-runner-execution-loop |
| sillyspec | FR-unmapped-040 | 创建沙箱 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | FR-unmapped-040@2026-05-29-server-sandbox-runner |
| sillyspec | FR-unmapped-041 | 文件快照 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | FR-unmapped-041@2026-05-29-server-sandbox-runner |
| sillyspec | FR-unmapped-042 | 执行任务 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | FR-unmapped-042@2026-05-29-server-sandbox-runner |
| sillyspec | FR-unmapped-043 | 导出结果 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | FR-unmapped-043@2026-05-29-server-sandbox-runner |
| sillyspec | FR-unmapped-044 | 清理 | fr/unmapped.md | 2026-05-29-server-sandbox-runner | duplicate-of-platform | archive-or-prune | FR-unmapped-044@2026-05-29-server-sandbox-runner |
| sillyspec | FR-unmapped-045 | 普通 repo 注册 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | FR-unmapped-045@2026-05-29-workspace-intake-spec-bootstrap |
| sillyspec | FR-unmapped-046 | 导入已有规范 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | FR-unmapped-046@2026-05-29-workspace-intake-spec-bootstrap |
| sillyspec | FR-unmapped-047 | 规范同步 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | FR-unmapped-047@2026-05-29-workspace-intake-spec-bootstrap |
| sillyspec | FR-unmapped-048 | 规范校验 | fr/unmapped.md | 2026-05-29-workspace-intake-spec-bootstrap | duplicate-of-platform | archive-or-prune | FR-unmapped-048@2026-05-29-workspace-intake-spec-bootstrap |
| sillyspec | FR-unmapped-049 | Kill 运行中的 Agent | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-049@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-050 | Diff 收集 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-050@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-051 | 进程注册表 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-051@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-052 | Stale Run 清理 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-052@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-053 | Allowed Paths 隔离 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-053@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-054 | 输出脱敏 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-054@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-055 | 前端 Agent Run 列表页 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-055@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-056 | 前端 Agent Run 详情页 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-056@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-057 | 前端 SSE 日志流 | fr/unmapped.md | 2026-05-30-agent-adapter | duplicate-of-platform | archive-or-prune | FR-unmapped-057@2026-05-30-agent-adapter |
| sillyspec | FR-unmapped-058 | tasks.md 模板生成 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | FR-unmapped-058@2026-05-30-change-writer |
| sillyspec | FR-unmapped-059 | verification.md 模板生成 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | FR-unmapped-059@2026-05-30-change-writer |
| sillyspec | FR-unmapped-060 | MASTER.md 格式增强 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | FR-unmapped-060@2026-05-30-change-writer |
| sillyspec | FR-unmapped-061 | batch-generate 传递 lease_id | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | FR-unmapped-061@2026-05-30-change-writer |
| sillyspec | FR-unmapped-062 | Git 提交并推送 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | FR-unmapped-062@2026-05-30-change-writer |
| sillyspec | FR-unmapped-063 | 创建 Pull Request | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | FR-unmapped-063@2026-05-30-change-writer |
| sillyspec | FR-unmapped-064 | PAT 安全处理 | fr/unmapped.md | 2026-05-30-change-writer | duplicate-of-platform | archive-or-prune | FR-unmapped-064@2026-05-30-change-writer |
| sillyspec | FR-unmapped-065 | 幂等创建（idempotency_key） | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | FR-unmapped-065@2026-05-30-execution-coordinator |
| sillyspec | FR-unmapped-066 | 执行恢复（resume_token） | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | FR-unmapped-066@2026-05-30-execution-coordinator |
| sillyspec | FR-unmapped-067 | 进度快照（checkpoint） | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | FR-unmapped-067@2026-05-30-execution-coordinator |
| sillyspec | FR-unmapped-068 | 乐观锁（optimistic_lock） | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | FR-unmapped-068@2026-05-30-execution-coordinator |
| sillyspec | FR-unmapped-069 | 审批门（approval_token） | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | FR-unmapped-069@2026-05-30-execution-coordinator |
| sillyspec | FR-unmapped-070 | 上下文一致性（context_fingerprint） | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | FR-unmapped-070@2026-05-30-execution-coordinator |
| sillyspec | FR-unmapped-071 | 重试控制 | fr/unmapped.md | 2026-05-30-execution-coordinator | duplicate-of-platform | archive-or-prune | FR-unmapped-071@2026-05-30-execution-coordinator |
| sillyspec | FR-unmapped-072 | ToolPolicy CRUD | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-072@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-073 | AgentRun 关联 ToolPolicy | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-073@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-074 | 策略校验 — 工具白名单 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-074@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-075 | 策略校验 — 路径限制 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-075@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-076 | 策略校验 — shell 命令黑名单 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-076@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-077 | 策略校验 — 资源限制 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-077@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-078 | run_tests 工具 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-078@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-079 | http_get 工具 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-079@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-080 | 审计双写 | fr/unmapped.md | 2026-05-30-tool-gateway | duplicate-of-platform | archive-or-prune | FR-unmapped-080@2026-05-30-tool-gateway |
| sillyspec | FR-unmapped-081 | spec-bootstrap 创建异步 AgentRun | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | FR-unmapped-081@2026-06-02-spec-bootstrap-agent-stream-interaction |
| sillyspec | FR-unmapped-082 | bootstrap 通过 ClaudeCodeAdapter 执行 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | FR-unmapped-082@2026-06-02-spec-bootstrap-agent-stream-interaction |
| sillyspec | FR-unmapped-083 | Agent 执行 init + scan + 验证 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | FR-unmapped-083@2026-06-02-spec-bootstrap-agent-stream-interaction |
| sillyspec | FR-unmapped-084 | Workspace 页面实时展示消息流 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | FR-unmapped-084@2026-06-02-spec-bootstrap-agent-stream-interaction |
| sillyspec | FR-unmapped-085 | 双入口用户确认/指导 | fr/unmapped.md | 2026-06-02-spec-bootstrap-agent-stream-interaction | duplicate-of-platform | archive-or-prune | FR-unmapped-085@2026-06-02-spec-bootstrap-agent-stream-interaction |
| sillyspec | FR-unmapped-086 | 后端 SSE 支持续传参数 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | FR-unmapped-086@2026-06-02-sse-reliable-stream |
| sillyspec | FR-unmapped-087 | SSE 事件携带 log_id | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | FR-unmapped-087@2026-06-02-sse-reliable-stream |
| sillyspec | FR-unmapped-088 | AgentRunStreamClient 连接管理 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | FR-unmapped-088@2026-06-02-sse-reliable-stream |
| sillyspec | FR-unmapped-089 | 断线自动重连 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | FR-unmapped-089@2026-06-02-sse-reliable-stream |
| sillyspec | FR-unmapped-090 | 断线日志回填 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | FR-unmapped-090@2026-06-02-sse-reliable-stream |
| sillyspec | FR-unmapped-091 | log_id 去重 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | FR-unmapped-091@2026-06-02-sse-reliable-stream |
| sillyspec | FR-unmapped-092 | Workspace 详情页集成 | fr/unmapped.md | 2026-06-02-sse-reliable-stream | duplicate-of-platform | archive-or-prune | FR-unmapped-092@2026-06-02-sse-reliable-stream |
| sillyspec | FR-unmapped-093 | 生成项目规范统一为 Bootstrap 流程并跳转详情页 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-093@2026-06-03-workspace-bootstrap-flow |
| sillyspec | FR-unmapped-094 | 进入详情页自动检测并恢复进行中的 Bootstrap 回显 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-094@2026-06-03-workspace-bootstrap-flow |
| sillyspec | FR-unmapped-095 | Bootstrap 执行期间防止重复触发 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-095@2026-06-03-workspace-bootstrap-flow |
| sillyspec | FR-unmapped-096 | Bootstrap 成功后自动创建子组件 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-096@2026-06-03-workspace-bootstrap-flow |
| sillyspec | FR-unmapped-097 | 完成后详情页刷新子组件计数 | fr/unmapped.md | 2026-06-03-workspace-bootstrap-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-097@2026-06-03-workspace-bootstrap-flow |
| sillyspec | FR-unmapped-098 | Gate 时机修正 — transition 时 gate=none | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-098@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-099 | complete_stage 统一入口 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-099@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-100 | rerun_stage 同阶段重跑 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-100@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-101 | verify→propose 回退边 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-101@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-102 | proposal-review 修正 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-102@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-103 | plan-review 修正 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-103@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-104 | human-test 修正 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-104@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-105 | archive-confirm API | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-105@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-106 | 前端 Gate 面板 comment | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-106@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-107 | 归档确认按钮修正 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-107@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-108 | 清理旧 UI 残留 | fr/unmapped.md | 2026-06-04-fix-agent-driven-change-center-flow | duplicate-of-platform | archive-or-prune | FR-unmapped-108@2026-06-04-fix-agent-driven-change-center-flow |
| sillyspec | FR-unmapped-109 | 日志区域宽度自适应 | fr/unmapped.md | 2026-06-05-agent-74b61b | duplicate-of-platform | archive-or-prune | FR-unmapped-109@2026-06-05-agent-74b61b |
| sillyspec | FR-unmapped-110 | 长日志行显示 | fr/unmapped.md | 2026-06-05-agent-74b61b | duplicate-of-platform | archive-or-prune | FR-unmapped-110@2026-06-05-agent-74b61b |
| sillyspec | FR-unmapped-111 | 小屏兼容 | fr/unmapped.md | 2026-06-05-agent-74b61b | duplicate-of-platform | archive-or-prune | FR-unmapped-111@2026-06-05-agent-74b61b |
| sillyspec | FR-unmapped-112 | 日志块内水平滚动 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | FR-unmapped-112@2026-06-08-2026-06-05-agent-log-width |
| sillyspec | FR-unmapped-113 | 页面无 X 轴滚动条 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | FR-unmapped-113@2026-06-08-2026-06-05-agent-log-width |
| sillyspec | FR-unmapped-114 | 日志内容完整性 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | FR-unmapped-114@2026-06-08-2026-06-05-agent-log-width |
| sillyspec | FR-unmapped-115 | 现有功能不受影响 | fr/unmapped.md | 2026-06-08-2026-06-05-agent-log-width | duplicate-of-platform | archive-or-prune | FR-unmapped-115@2026-06-08-2026-06-05-agent-log-width |
| sillyspec | FR-unmapped-127 | 守护进程注册 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-127@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-128 | 任务认领 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-128@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-129 | 任务执行 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-129@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-130 | 心跳续期 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-130@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-131 | 进度报告 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-131@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-132 | 任务完成 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-132@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-133 | 运行时管理 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-133@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-134 | 运行位置选择 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-134@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-135 | 优雅降级 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-135@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-136 | 密钥隔离 | fr/unmapped.md | 2026-06-09-local-daemon | duplicate-of-platform | archive-or-prune | FR-unmapped-136@2026-06-09-local-daemon |
| sillyspec | FR-unmapped-137 | Platform Admin 权限校验 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | FR-unmapped-137@2026-06-10-user-management |
| sillyspec | FR-unmapped-138 | 安全保护 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | FR-unmapped-138@2026-06-10-user-management |
| sillyspec | FR-unmapped-139 | 用户列表增强 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | FR-unmapped-139@2026-06-10-user-management |
| sillyspec | FR-unmapped-140 | 用户详情 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | FR-unmapped-140@2026-06-10-user-management |
| sillyspec | FR-unmapped-141 | 管理员重置密码 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | FR-unmapped-141@2026-06-10-user-management |
| sillyspec | FR-unmapped-142 | 审计日志 | fr/unmapped.md | 2026-06-10-user-management | duplicate-of-platform | archive-or-prune | FR-unmapped-142@2026-06-10-user-management |
| sillyspec | FR-unmapped-207 | 统一调度入口 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-207@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-208 | 废弃子进程直跑路径 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-208@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-209 | CLAUDE.md 不被覆盖 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-209@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-210 | 阶段配置完整 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-210@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-211 | AgentSpecBundle 含阶段上下文 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-211@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-212 | 状态同步 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-212@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-213 | 三字段边界 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-213@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-214 | 工作目录正确 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-214@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-215 | Transition Response Model | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-215@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-216 | 测试覆盖 | fr/unmapped.md | 2026-06-19-agent-stage-dispatch-superseded | duplicate-of-platform | archive-or-prune | FR-unmapped-216@2026-06-19-agent-stage-dispatch-superseded |
| sillyspec | FR-unmapped-236 | Codex runtime 创建 interactive session | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-236@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-237 | Codex 支持同一 session 多轮对话 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-237@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-238 | Codex 支持运行中 interrupt | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-238@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-239 | Codex 输出进入现有日志与 SSE | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-239@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-240 | Codex session 支持 end 与历史回看 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-240@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-241 | Codex 支持 reopen 与 daemon recovery | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-241@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-242 | frontend Codex runtime 不走 quick-chat | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-242@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-243 | Codex 普通 approval 策略与 Claude Code 一致 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-243@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-244 | Codex 用户输入请求复用现有 dialog 卡片 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-244@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-245 | Claude Code interactive 行为不回退 | fr/unmapped.md | 2026-06-23-2026-06-23-codex-interactive-session | duplicate-of-platform | archive-or-prune | FR-unmapped-245@2026-06-23-2026-06-23-codex-interactive-session |
| sillyspec | FR-unmapped-425 | TaskExecute 支持 file_urls 字段 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | FR-unmapped-425@2026-07-22-2026-07-22-task-execute-attachments |
| sillyspec | FR-unmapped-426 | 计划任务执行填报上传附件（按天） | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | FR-unmapped-426@2026-07-22-2026-07-22-task-execute-attachments |
| sillyspec | FR-unmapped-427 | 问题执行填报上传附件（按天） | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | FR-unmapped-427@2026-07-22-2026-07-22-task-execute-attachments |
| sillyspec | FR-unmapped-428 | 执行记录表回显附件 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | FR-unmapped-428@2026-07-22-2026-07-22-task-execute-attachments |
| sillyspec | FR-unmapped-429 | 跨天填报每天各自附件 | fr/unmapped.md | 2026-07-22-2026-07-22-task-execute-attachments | duplicate-of-platform | archive-or-prune | FR-unmapped-429@2026-07-22-2026-07-22-task-execute-attachments |
| sillyspec | FR-unmapped-647 | daemon 消费 SDK 任务生命周期消息（D-001@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-647@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-648 | 异步启动回执解析兜底（D-001@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-648@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-649 | [TASK_*] 持久日志行（D-002@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-649@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-650 | backend 事件 schema 扩展与透传（D-001@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-650@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-651 | 子代理日志跨轮归位（D-003@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-651@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-652 | 后台卡片全生命周期展示（D-005@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-652@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-653 | 子代理目录与会话块异步感知（D-005@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-653@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-654 | 空 prompt 注入防御（D-004@v1） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-654@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-655 | spike 验证 SDK 运行时发射（R-01） | fr/unmapped.md | 2026-08-27-background-subagent-progress | duplicate-of-platform | archive-or-prune | FR-unmapped-655@2026-08-27-background-subagent-progress |
| sillyspec | FR-unmapped-656 | Playwright 基础设施 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-656@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-657 | 测试身份与数据准备 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-657@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-658 | API 登录与会话注入 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-658@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-659 | 真实 UI 登录链路用例（auth.spec） | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-659@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-660 | 导航冒烟用例（navigation.spec） | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-660@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-661 | 本机运行文档与凭据卫生 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-661@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-662 | CI e2e job | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-662@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-663 | 双测试栈隔离与类型覆盖 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-663@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-664 | 依赖清理 | fr/unmapped.md | 2026-08-29-frontend-e2e-playwright | duplicate-of-platform | archive-or-prune | FR-unmapped-664@2026-08-29-frontend-e2e-playwright |
| sillyspec | FR-unmapped-665 | sillyspec 版本显示 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | FR-unmapped-665@2026-08-31-machine-sillyspec-version |
| sillyspec | FR-unmapped-666 | 手动远程升级 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | FR-unmapped-666@2026-08-31-machine-sillyspec-version |
| sillyspec | FR-unmapped-667 | 升级过程可见 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | FR-unmapped-667@2026-08-31-machine-sillyspec-version |
| sillyspec | FR-unmapped-668 | 运行期自动定期升级 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | FR-unmapped-668@2026-08-31-machine-sillyspec-version |
| sillyspec | FR-unmapped-669 | 数据链与兼容 | fr/unmapped.md | 2026-08-31-machine-sillyspec-version | duplicate-of-platform | archive-or-prune | FR-unmapped-669@2026-08-31-machine-sillyspec-version |
| sillyspec | FR-unmapped-670 | 统一 current_stage 枚举 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-670@agent-driven-change-center |
| sillyspec | FR-unmapped-671 | 新增 human_gate 字段 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-671@agent-driven-change-center |
| sillyspec | FR-unmapped-672 | 旧数据迁移 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-672@agent-driven-change-center |
| sillyspec | FR-unmapped-673 | Agent 驱动流转规则 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-673@agent-driven-change-center |
| sillyspec | FR-unmapped-674 | propose 文档确认 Gate | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-674@agent-driven-change-center |
| sillyspec | FR-unmapped-675 | proposal-review API | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-675@agent-driven-change-center |
| sillyspec | FR-unmapped-676 | plan 文档确认 Gate | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-676@agent-driven-change-center |
| sillyspec | FR-unmapped-677 | plan-review API | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-677@agent-driven-change-center |
| sillyspec | FR-unmapped-678 | execute 完成自动 verify | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-678@agent-driven-change-center |
| sillyspec | FR-unmapped-679 | verify 自动修复闭环 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-679@agent-driven-change-center |
| sillyspec | FR-unmapped-680 | human-test API | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-680@agent-driven-change-center |
| sillyspec | FR-unmapped-681 | 前端按 gate 渲染交互 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-681@agent-driven-change-center |
| sillyspec | FR-unmapped-682 | 简化新建变更 | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-682@agent-driven-change-center |
| sillyspec | FR-unmapped-683 | 归档 Gate | fr/unmapped.md | agent-driven-change-center | duplicate-of-platform | archive-or-prune | FR-unmapped-683@agent-driven-change-center |
| sillyspec | FR-unmapped-684 | 创建变更 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | FR-unmapped-684@change-center-redesign |
| sillyspec | FR-unmapped-685 | 变更列表展示阶段 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | FR-unmapped-685@change-center-redesign |
| sillyspec | FR-unmapped-686 | 启动变更执行 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | FR-unmapped-686@change-center-redesign |
| sillyspec | FR-unmapped-687 | 实时进度展示 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | FR-unmapped-687@change-center-redesign |
| sillyspec | FR-unmapped-688 | 查看变更文档 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | FR-unmapped-688@change-center-redesign |
| sillyspec | FR-unmapped-689 | 变更执行完成 | fr/unmapped.md | change-center-redesign | duplicate-of-platform | archive-or-prune | FR-unmapped-689@change-center-redesign |
| sillyspec | FR-unmapped-690 | 创建变更自动进入 clarifying 阶段 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | FR-unmapped-690@change-workflow-engine |
| sillyspec | FR-unmapped-691 | 状态机转换必须遵循合法转换规则 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | FR-unmapped-691@change-workflow-engine |
| sillyspec | FR-unmapped-692 | Agent 仅在 ready_for_dev 阶段可启动执行 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | FR-unmapped-692@change-workflow-engine |
| sillyspec | FR-unmapped-693 | 业务验收必须选择反馈分类 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | FR-unmapped-693@change-workflow-engine |
| sillyspec | FR-unmapped-694 | 归档必须通过 6 项门禁检查 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | FR-unmapped-694@change-workflow-engine |
| sillyspec | FR-unmapped-695 | 旧数据兼容迁移 | fr/unmapped.md | change-workflow-engine | duplicate-of-platform | archive-or-prune | FR-unmapped-695@change-workflow-engine |
| sillyspec | FR-unmapped-696 | 配置 spec_data_root | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | FR-unmapped-696@workspace-spec-root-managed-p0 |
| sillyspec | FR-unmapped-697 | 补建 spec_workspaces 记录 | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | FR-unmapped-697@workspace-spec-root-managed-p0 |
| sillyspec | FR-unmapped-698 | 迁移已有 scan 文档 | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | FR-unmapped-698@workspace-spec-root-managed-p0 |
| sillyspec | FR-unmapped-699 | ScanDocsService 从 spec_root 读取 | fr/unmapped.md | workspace-spec-root-managed-p0 | duplicate-of-platform | archive-or-prune | FR-unmapped-699@workspace-spec-root-managed-p0 |
| sillyspec | FR-unmapped-714 | 现有测试不回归 | fr/unmapped.md | workspace-spec-root-managed-p0 | unique | manual-domain-map | 本仓唯一真实条目（id+change 在另一仓无对应）——人工域映射后迁移 |

## 处置汇总

- platform/decisions/unmapped.md/manual-domain-map：135
- platform/decisions/unmapped.md/mark-draft-exclude：173
- sillyspec/decisions/unmapped.md/archive-or-prune：21
- sillyspec/decisions/unmapped.md/manual-domain-map：7
- sillyspec/decisions/unmapped.md/mark-draft-exclude：47
- sillyspec/fr/unmapped.md/archive-or-prune：208
- sillyspec/fr/unmapped.md/manual-domain-map：2

## 下一变更输入

### manual-domain-map（人工定域候选，共 144 条）

- platform D-unmapped-026@v1（2026-10-15-dsh-engine-acp）dsh 二进制发现策略——照 agent-detector 先例
- platform D-unmapped-027@v1（2026-10-15-dsh-engine-acp）dsh 版本门语义——最低版本门 + 警告（不硬拒）
- platform D-unmapped-028@v1（2026-10-15-dsh-engine-acp）驱动层实现方式——自研 ACP 驱动（方案 A）
- platform D-unmapped-029@v1（2026-10-15-dsh-engine-acp）落选——官方 @agentclientprotocol/sdk 客户端包（方案 B）
- platform D-unmapped-030@v1（2026-10-15-dsh-engine-acp）落选——headless --json 短命进程批处理通道（方案 C）
- platform D-unmapped-031@v1（2026-10-15-dsh-engine-acp）执行期任务边界合并——task-03 驱动与 task-04 注册的类型依赖
- platform D-unmapped-032@v1（2026-10-15-dsh-engine-acp）执行期任务边界修正——task-07 单一源实为 runtimes.ts
- platform D-unmapped-036@v1（2026-10-15-server-logs-panel）日志源=应用侧落文件+轮转（用户亲选）
- platform D-unmapped-037@v1（2026-10-15-server-logs-panel）展示形式=结构化+自动刷新（用户亲选）
- platform D-unmapped-038@v1（2026-10-15-server-logs-panel）下载范围=单文件可选历史（用户亲选）
- platform D-unmapped-039@v1（2026-10-15-server-logs-panel）权限=复用 system_status:read（用户亲选）
- platform D-unmapped-040@v1（2026-10-15-server-logs-panel）日志落盘实现=单点插入文件写入（用户亲选，方案 A）
- platform D-unmapped-041@v1（2026-10-15-server-logs-panel）页面布局=日志卡满宽居底（用户亲选）
- platform D-unmapped-042@v1（2026-10-15-server-logs-panel）日志条数参数与轮转参数的可配口径（AI 定案，可否决）
- platform D-unmapped-043@v1（2026-10-15-zcode-engine-appserver）ZCode 引擎发现策略——三段式探测（env 覆盖 → PATH → Desktop 固定路径）
- platform D-unmapped-044@v1（2026-10-15-zcode-engine-appserver）会话数据隔离边界——配置面 per-session 隔离，会话库接受机器共享
- platform D-unmapped-045@v1（2026-10-15-zcode-engine-appserver）模型路由——平台 LlmProvider 接管（per-session provider_config.json 注入）
- platform D-unmapped-046@v1（2026-10-15-zcode-engine-appserver）版本门语义——最低版本门 + 警告（不硬拒）
- platform D-unmapped-047@v1（2026-10-15-zcode-engine-appserver）驱动层实现方式——自研 ZCode 私有协议驱动（无备选，落选项登记）
- platform D-unmapped-048@v1（2026-10-15-zcode-engine-appserver）落选——等待官方 ACP/SDK 支持面（事实性落选登记）
- platform D-unmapped-049@v1（2026-10-15-zcode-engine-appserver）驱动承载形态——独立驱动 + 独立轻量信封层 + 每会话一进程（方案 A）
- platform D-unmapped-050@v1（2026-10-15-zcode-engine-appserver）执行期三类协议形状修正（实测驱动，task-08 冒烟抓出）
- platform D-unmapped-057@v1（2026-10-16-backend-mem-polling）落选——方案 C（进程内卸载 + 拉长轮询 + 缓存）
- platform D-unmapped-060@v1（2026-10-16-fix-auth-random-logout）sessions 表增 family_id 列建模会话族
- platform D-unmapped-061@v1（2026-10-16-fix-auth-random-logout）refresh 复用检测从全用户吊销改为族级吊销
- platform D-unmapped-062@v1（2026-10-16-fix-auth-random-logout）grace 宽限窗默认 60s → 300s
- platform D-unmapped-063@v1（2026-10-16-fix-auth-random-logout）前端 doRefresh 按状态码分流——5xx 抛错不清会话
- platform D-unmapped-064@v1（2026-10-16-fix-auth-random-logout）根因一实现方案选 A（会话族吊销 + 宽限窗加大）
- platform D-unmapped-065@v1（2026-10-16-fix-auth-random-logout）方案 B（只加大宽限窗，不加族系列）
- platform D-unmapped-066@v1（2026-10-16-fix-auth-random-logout）方案 C（复用检测只拒绝不吊销）
- platform D-unmapped-067@v1（2026-10-16-fix-auth-random-logout）族吊销必须内部 commit（执行期裁决，纠正 design 笔误）
- platform D-unmapped-075@v1（2026-10-16-session-decision-pill）rejected 方案 B——后端聚合端点 GET /sessions/{id}/decisions
- platform D-unmapped-118@v1（2026-10-20-session-page-dsh-alignment）参考粒度＝交互模型与数据口径，不移植 DSH 插件化客户端架构
- platform D-unmapped-119@v1（2026-10-20-session-page-dsh-alignment）动机＝日常主力工作台 + 对外演示可用 + 与 DSH 直接对标（非「会话规模爆炸」驱动）
- platform D-unmapped-120@v1（2026-10-20-session-page-dsh-alignment）视图模型不在对话里拍板——先出 HTML 原型看效果再定（用户选 C）
- platform D-unmapped-121@v1（2026-10-20-session-page-dsh-alignment）原型出「A/B 双形态对比」单页（我的判断）
- platform D-unmapped-122@v1（2026-10-20-session-page-dsh-alignment）成功标准延后到原型确认后定稿（草案 SC-01..SC-05 随原型呈现）
- platform D-unmapped-123@v1（2026-10-20-session-page-dsh-alignment）方案定稿推迟到原型确认轮；原型出 A/C 双形态（修订 D-005 的 A/B 组合）
- platform D-unmapped-124@v1（2026-10-20-session-page-dsh-alignment）原型形态升级为 dev 预览路由（直接渲染真实会话组件）
- platform D-unmapped-125@v1（2026-10-20-session-page-dsh-alignment）「继续用静态 prototype:build 复刻会话页」被否决
- platform D-unmapped-126@v1（2026-10-20-session-page-dsh-alignment）静态交付形态＝真实组件树的 SSR 快照 + 内联 CSS（交互仍走 dev 路由）
- platform D-unmapped-127@v2（2026-10-20-session-page-dsh-alignment）视觉基线＝真实页面的**结构**（三主题并存，不把深色当基线）〔取代 D-015@v1〕
- platform D-unmapped-128@v1（2026-10-20-session-page-dsh-alignment）视觉稿必须由真实组件产出（手绘 HTML 只作参考，不作定稿）
- platform D-unmapped-129@v1（2026-10-20-session-page-dsh-alignment）静态原型导出必须「浏览器水合后序列化 DOM」，禁止抓 SSR HTML
- platform D-unmapped-130@v1（2026-10-20-session-page-dsh-alignment）此前三次「效果不咋地 / 看不出区别」的判定，基于缺正文的残缺稿，需在修复稿上重判
- platform D-unmapped-131@v1（2026-10-20-session-page-dsh-alignment）删除轮间 1px hairline，仅以留白分隔轮次（用户方向）
- platform D-unmapped-132@v1（2026-10-20-session-page-dsh-alignment）对比加强（答案压过过程）——四组参数定稿
- platform D-unmapped-133@v1（2026-10-20-session-page-dsh-alignment）轨迹视图形态＝泳道时间轴（共享绝对时间轴 × 输入/模型/工具），账本降为「调用」档
- platform D-unmapped-134@v1（2026-10-20-session-page-dsh-alignment）过程行采用 DSH 式语义标签（思考 / 运行命令 / 收到任务消息…），daemon 采集缓发
- platform D-unmapped-135@v1（2026-10-20-session-page-dsh-alignment）1b 快照落库点修正——interactive 轮走 `close_run_steps`，不走 `lease/service.complete_lease`〔2026-10-21 execute 期实证〕
- platform D-unmapped-136@v1（2026-10-20-session-page-dsh-alignment）1b 读模型落点＝`GET /sessions/{id}/runs`（SessionRunRead），`TurnOutlineItemRead` 不加字段〔2026-10-21 execute 期裁决〕
- platform D-unmapped-137@v1（2026-10-20-session-page-dsh-alignment）后到快照必须在「run 已终态」的二次上报里补写侧表（否则 1b 对 interactive 全废）〔2026-10-21 execute 期实证〕
- platform D-unmapped-138@v1（2026-10-20-session-page-dsh-alignment）前端降级判据以 capability 为准；`snapshot=null` 且 `capability` 也缺＝「未接线」，不出卡〔2026-10-21 execute 期裁决〕
- platform D-unmapped-139@v1（2026-10-20-session-page-dsh-alignment）TTFT/attempt 实际只能 `basis="approx"`（三引擎均无「模型请求起点」事件）；attempt 沿用近似起点而非只记终点〔2026-10-21 execute 期实证〕
- platform D-unmapped-140@v1（2026-10-20-session-page-dsh-alignment）迁移链尾锚测试随新迁移一并前移（提交 hook 强制连带）〔2026-10-21 execute 期登记〕
- platform D-unmapped-141@v1（2026-10-20-session-page-dsh-alignment）`partial` 且无文件清单时出「一行提示卡」——不得静默成「本轮无改动」〔2026-10-21 execute 期独立审查阻断项修复〕
- platform D-unmapped-151@v1（2026-10-22-trajectory-view-redesign）轨迹面板以 dsh（deepseek-harness）ui-trajectory 为视觉与交互基准
- platform D-unmapped-152@v1（2026-10-22-trajectory-view-redesign）顶部固定布局——工具栏与时间线不随账本滚动
- platform D-unmapped-153@v1（2026-10-22-trajectory-view-redesign）工具栏四项语义与行为
- platform D-unmapped-154@v1（2026-10-22-trajectory-view-redesign）账本形态——无表头两列紧凑表格
- platform D-unmapped-155@v1（2026-10-22-trajectory-view-redesign）详情面板——多标签 + 可调宽
- platform D-unmapped-156@v1（2026-10-22-trajectory-view-redesign）采用组件族拆分方案（B）
- platform D-unmapped-157@v1（2026-10-22-trajectory-view-redesign）否决「原地重构 trajectory-view.tsx」（方案 A）
- platform D-unmapped-158@v1（2026-10-22-trajectory-view-redesign）否决「直接移植 dsh 组件」（方案 C）
- platform D-unmapped-159@v1（2026-10-22-trajectory-view-redesign）总览缩略条随 D-017 一并裁剪，实际时长保留缩放/平移/双击重置
- platform D-unmapped-160@v1（2026-10-22-trajectory-view-redesign）设计方案与真码原型定稿
- platform D-unmapped-161@v1（2026-10-22-trajectory-view-redesign）搜索时折叠整体失效，时间线不做降透明
- platform D-unmapped-162@v1（2026-10-22-trajectory-view-redesign）折叠/搜索隐藏选中行时清空选中，键盘只遍历可见行
- platform D-unmapped-163@v1（2026-10-22-trajectory-view-redesign）工具行参数/结果字段来源（允许 from-turn-views 小改）
- platform D-unmapped-164@v1（2026-10-22-trajectory-view-redesign）等宽模式为只读概览
- platform D-unmapped-165@v1（2026-10-22-trajectory-view-redesign）D-007 覆盖 D-005 的 Schema 子项
- platform D-unmapped-166@v1（2026-10-22-trajectory-view-redesign）时长偏好为全局偏好
- platform D-unmapped-199@v1（2026-10-23-session-network-context）每轮注入【网络环境】前导段，不动首轮一次性策略
- platform D-unmapped-200@v1（2026-10-23-session-network-context）同网段判定双源——后端观测 daemon 请求源 IP 为 ground truth，daemon 自报网卡列表用于拼访问地址
- platform D-unmapped-201@v1（2026-10-23-session-network-context）共享机器的内网 IP 对借用人可见
- platform D-unmapped-202@v2（2026-10-23-session-network-context）共享机器权威口径 = grants 表（supersedes D-005@v1）
- platform D-unmapped-203@v1（2026-10-23-session-network-context）注入去重——内容快照变化才重注 + 会话内最短间隔兜底
- platform D-unmapped-204@v1（2026-10-23-session-network-context）排队/steering 轮注入语义——入队存用户 IP，派发时重算判定
- platform D-unmapped-205@v1（2026-10-23-session-network-context）快照 60s 窗口语义——不吞变化，到点补注
- platform D-unmapped-206@v1（2026-10-23-session-network-context）心跳契约扩展须同步四个钉子测试文件
- platform D-unmapped-207@v1（2026-10-23-session-network-context）daemon_instances 加 JSON 列 + Alembic 迁移，链尾锚测试前移一行
- platform D-unmapped-208@v1（2026-10-23-session-network-context）实现方案选定——方案 A 平台自动注入（每轮 CIDR 判定 + 前导段注入）
- platform D-unmapped-209@v1（2026-10-23-session-network-context）落选方案 B——agent 按需查询工具（get_network_info MCP 工具）
- platform D-unmapped-210@v1（2026-10-23-session-network-context）落选方案 C——仅前端展示网络徽标不注入
- platform D-unmapped-230@v1（2026-10-25-trajectory-source-model）按 dsh 引擎机制做全套（消息来源标记 + 请求头快照），跨三端
- platform D-unmapped-231@v1（2026-10-25-trajectory-source-model）系统提示词行做「配置面快照」口径（引擎全文不可得）
- platform D-unmapped-232@v1（2026-10-25-trajectory-source-model）存量历史会话如实呈现（无标记 → 用户行），不做启发式兜底
- platform D-unmapped-233@v1（2026-10-25-trajectory-source-model）revert 已提交的启发式代码（77ba0588b / c93aafc84）
- platform D-unmapped-234@v1（2026-10-25-trajectory-source-model）采用方案 A——复用日志通道（metadata 盖戳 + 新 channel 快照 + submit 透传修复）
- platform D-unmapped-235@v1（2026-10-25-trajectory-source-model）否决「独立快照表 + REST 上报」（方案 B）
- platform D-unmapped-236@v1（2026-10-25-trajectory-source-model）否决「纯前端不落库」（方案 C）
- platform D-unmapped-237@v1（2026-10-25-trajectory-source-model）设计定稿——三段式（注入盖戳 / daemon 快照 / 前端行）+ 真码原型
- platform D-unmapped-238@v1（2026-10-25-trajectory-source-model）新注入类归 turn_trigger 体系（非独立 sender 键）
- platform D-unmapped-239@v1（2026-10-25-trajectory-source-model）变更检测在 daemon 侧，只报 initial/change（非每轮落快照）
- platform D-unmapped-247@v2（2026-10-25-explorer-git-status）忽略条目按顶层聚合展示，不递归展开（措辞精度修订）
- platform D-unmapped-248@v1（2026-10-25-explorer-git-status）diff 基线一律 HEAD，不区分暂存区；untracked/已删除特例展示
- platform D-unmapped-249@v1（2026-10-25-explorer-git-status）explorer 树着色不改点击行为，diff 入口仅修改集合视图
- platform D-unmapped-250@v1（2026-10-25-explorer-git-status）状态采集沿用 git_log 既有三层链路，daemon 新增两个平名能力
- platform D-unmapped-251@v1（2026-10-25-explorer-git-status）落选——方案 B（explorer 契约内嵌状态字段）— rejected
- platform D-unmapped-252@v1（2026-10-25-explorer-git-status）落选——方案 C（daemon watch + 实时推送）— rejected
- platform D-unmapped-253@v1（2026-10-25-explorer-git-status）untracked diff 采集用局部 execFile 读退出码（exit 0/1 均成功）
- platform D-unmapped-254@v1（2026-10-25-explorer-git-status）porcelain v2 解析契约——末段 rejoin、u 条目按 modified、祖先蓝点不含 ignored
- platform D-unmapped-255@v1（2026-10-25-explorer-git-status）并行变更遗留红测试的就地对齐（turn-timeline 断言恢复）
- platform D-unmapped-257@v1（2026-10-26-session-stage-progress）否决方案 B——后端推断式（零 daemon 改动）
- platform D-unmapped-258@v1（2026-10-26-session-stage-progress）否决方案 C——心跳快照轮询
- platform D-unmapped-259@v1（2026-10-26-session-stage-progress）超时阈值=前端常量 30s（非用户/服务端配置）
- platform D-unmapped-260@v1（2026-10-26-session-stage-progress）轮内阶段由客户端从已有事件映射，不发新事件
- platform D-unmapped-261@v1（2026-10-26-session-stage-progress）阶段上报失败静默降级，不阻塞会话主流程
- platform D-unmapped-262@v1（2026-10-26-session-stage-progress）断线/刷新后阶段未知→回退现有兜底文案，不做持久化
- platform D-unmapped-266@v1（2026-10-26-turn-phase-orphan-fallback）回退安全性前提=单会话单活跃 run 不变式(反例排查)
- platform D-unmapped-269@v1（2026-10-26-session-change-progress-hover）轻量变更耗时口径=总时长
- platform D-unmapped-270@v1（2026-10-26-session-change-progress-hover）全量异常态=异色圈+状态字
- platform D-unmapped-271@v1（2026-10-26-session-change-progress-hover）进度展示位置=下拉项内嵌+入口旁单个总进度圈
- platform D-unmapped-272@v1（2026-10-26-session-change-progress-hover）数据链路=方案A后端投影扩展
- platform D-unmapped-273@v1（2026-10-26-session-change-progress-hover）execute 阶段圈口径=Task 表 n/m
- platform D-unmapped-274@v1（2026-10-26-session-change-progress-hover）brainstorm→thin 分流态归轻量渲染
- platform D-unmapped-275@v1（2026-10-26-session-change-progress-hover）升厚变更切换全量渲染+标注
- platform D-unmapped-276@v2（2026-10-26-session-change-progress-hover）轻量数据通道=daemon heartbeat 载荷扩展+条目 workspace 维度+backend 全新逐变更写入路径
- platform D-unmapped-277@v1（2026-10-26-session-change-progress-hover）入口圈选取=前端显式 updated_at 重排
- platform D-unmapped-278@v1（2026-10-26-session-change-progress-hover）heartbeat thin_flow 写入不刷 changes.updated_at
- platform D-unmapped-279@v1（2026-10-26-session-change-progress-hover）已归档项不渲染进度行
- platform D-unmapped-280@v1（2026-10-26-session-change-progress-hover）落选方案B（前端按需拉详情）
- platform D-unmapped-281@v1（2026-10-26-session-change-progress-hover）落选方案C（daemon SSE 实时推）
- platform D-unmapped-291@v1（2026-10-27-archive-reparse-oom-governance）治本目标定为增量方案（又快又稳）
- platform D-unmapped-292@v1（2026-10-27-archive-reparse-oom-governance）mem_limit 再上调只作方案附录建议，不在本次实施
- platform D-unmapped-293@v1（2026-10-27-archive-reparse-oom-governance）治本方案选定方案C（scoped 增量承接归档 + 探针对账兜底）
- platform D-unmapped-294@v1（2026-10-27-archive-reparse-oom-governance）方案A（免 reparse 靶向改库）落选
- platform D-unmapped-295@v1（2026-10-27-archive-reparse-oom-governance）方案B（全量合并窗治理）落选
- platform D-unmapped-296@v1（2026-10-27-archive-reparse-oom-governance）双通道时效分档（结构性立即 / 普通推送 2 分钟合并窗）
- platform D-unmapped-297@v1（2026-10-27-archive-reparse-oom-governance）漂移探针只告警不自动修复
- platform D-unmapped-298@v1（2026-10-27-archive-reparse-oom-governance）bundle gzip 构建加同版本 single-flight
- platform D-unmapped-299@v1（2026-10-27-archive-reparse-oom-governance）structural 触发撞在途 reparse 时尾随改「完成回调即时补发」
- platform D-unmapped-300@v1（2026-10-27-archive-reparse-oom-governance）bundle 等待者 Future 失败传播 + 降级自建
- platform D-unmapped-317@v1（2026-10-29-engine-live-perception）落选——估算并入既有 usage_update 通道
- platform D-unmapped-318@v1（2026-10-29-engine-live-perception）落选——纯前端等待态分级（不动 daemon）
- sillyspec D-unmapped-002@v1（change 未记录）: 平台共享智能体绑定的守护进程取管理员自己名下
- sillyspec D-unmapped-003@v2（change 未记录）: 平台共享智能体会话——源码只读 + 指定目录可写
- sillyspec D-unmapped-004@v2（change 未记录）: 共享机器/智能体由用户在会话中显式选择
- sillyspec D-unmapped-005@v1（change 未记录）: 实现方案选 B——统一授权表 daemon_runtime_grants
- sillyspec D-unmapped-006@v1（change 未记录）: 打破 daemon 零改动 Non-Goal——session 级 overlay roots 写守卫增量（spike-02 B 裁决）
- sillyspec D-unmapped-007@v1（change 未记录）: platform grant 的 pinned runtime 不经共享档案直接钉定 → 404
- sillyspec D-unmapped-084@v1（change 未记录）: PPM 个人工作台头像维持首字占位（用户头像功能非目标）
- sillyspec FR-unmapped-001（2026-05-27-platform-native-sillyspec）普通项目可创建 Workspace
- sillyspec FR-unmapped-714（workspace-spec-root-managed-p0）现有测试不回归

### archive-or-prune（平台重复裁剪候选，按仓计数见处置汇总）

### mark-draft-exclude（模板底稿，建议加 draft 状态并从防复潮候选排除）
