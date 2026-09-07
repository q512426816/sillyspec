---
author: qinyi
created_at: 2026-09-07T08:30:00+08:00
---

# 决策记录（Decisions）

## D-001@v1: 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 端点 before/after 基线的采集时机与消费时机？
- answer: 用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。
- normalized_requirement: 基线幂等不覆盖；diff 为 method+path 对集合运算；contract-matrix/verify 探针零改动
- impacts: [FR-01, FR-02, FR-03]
- 模块域: core-engine, runtime, cli-entry
- evidence: 用户清理债批次指令（2026-09-07）；P3d delta.md After 段提示机制；proposal 分析轮实证 contract-matrix 无 before 数据

## D-002@v1: Grill 修正——worktree 主仓锚定/normalizePath/changed 不配对/降级门控
- type: consistency
- priority: P1
- status: accepted
- source: design-grill
- question: 快审 gap-1（中）+ 3 低如何修？
- answer: ①gap-1 CLI 复用 detectWorktreeSpecDrift+git-common-dir 主仓根（endpoints 族同形坑先例，防默认 worktree 模式静默失效）；②gap-2 diff key 套 normalizePath（生态既有参数归一，防改名假报）；③gap-3 changed 不配对独立行渲染（显式声明）；④gap-4 降级门控保留 backendEndpoints>0。组装层复用 scanBackendEndpoints（:217，审查实证已存在未低估）。
- normalized_requirement: 基线采集/落盘/归档读取全部主仓根；diff 归一含 normalizePath；changed 独立行
- impacts: [FR-01, FR-02]
- 模块域: core-engine, cli-entry
- evidence: .sillyspec/.runtime/stage-reviews/brainstorm-review-eb/review.json；src/endpoint-extractor.js:217/:372；src/index.js:976-984
