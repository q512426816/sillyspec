---
author: qinyi
created_at: 2026-08-12T01:09:00+08:00
---

# 决策台账（Decisions）— SillySpec 跨仓 task 支持

> 本次变更的决策台账（非长期术语表）。只记录有实现/验收影响的决策。长期术语 archive/scan 时再提升到 glossary.md。

## D-001@v1 仓库识别 = workspace 注册表
- type: architecture
- status: accepted
- source: user (brainstorm step3)
- question: 跨仓 task 声明 repo: 后 CLI 怎么找到那个仓库的本地路径？
- answer: workspace 注册表——task 卡片写 repo: sillyspec，仓路径在 local.yaml repos: 段注册绝对路径，CLI 查表解析。
- normalized_requirement: local.yaml 新增 repos: 段（Map<key, absolutePath>）；main 隐式=cwd 不用注册。
- impacts: §5.1, §7.3, FR-02
- evidence: 用户 brainstorm step3 拍板（三选项：workspace 注册表/task 卡片直接写路径/约定默认+覆写）
- priority: P0

## D-002@v1 apply 去向 = 跨仓改动落跨仓仓主干（机制由 D-009 修正为 no-op）
- type: architecture
- status: accepted (superseded 机制 by D-009)
- source: user (brainstorm step3) + Grill Blocker1
- question: 跨仓 task 的代码改动 apply 到哪个仓主干？
- answer: 跨仓改动落跨仓仓主干（不进主仓）。机制由 D-009 修正为 no-op：跨仓 commit 由子代理直接落主干，apply 只校验不复用 patch。
- normalized_requirement: 跨仓 task apply=no-op（校验 review.head 真实 + 跳过 wm.cleanup）；主仓 task 走原 apply。
- impacts: §5.4, §6, R-02
- evidence: 用户 brainstorm step3 + Design Grill Blocker1 源码实证（applyWorktree:223-535 耦合主仓 worktree 模型）
- priority: P0

## D-003@v1 进度库归属 = 主仓统一存
- type: architecture
- status: accepted
- source: user (brainstorm step3)
- question: 跨仓 task 的 review.json + execute run 产物写在哪？
- answer: 主仓统一存——所有 task review.json 在主仓 execute-runs/<runId>/tasks/，单一 runId 管所有 task，不侵入跨仓仓建进度库。
- normalized_requirement: 跨仓仓不建 .sillyspec/；review.json 物理在主仓但 base/head 是跨仓仓 commit；verifyReviewGitEvidence 按 repo 切 gitDir。
- impacts: §5.4, §8, NG-1, FR-06
- evidence: 用户 brainstorm step3 拍板（三选项：主仓统一/跨仓分散/混合）
- priority: P0

## D-004@v1 verify 跨仓测试 = 跨仓仓跑跨仓 npm test
- type: architecture
- status: accepted
- source: user (brainstorm step3)
- question: verify 怎么对账跨仓仓的测试？
- answer: per-repo cwd——跨仓仓有 package.json 则在该仓 cwd 跑 npm test，无则跳过 warn。跨仓仓不参与 module 子集策略。
- normalized_requirement: runVerifyTestCheck per-repo cwd；跨仓仓 full npm test only。
- impacts: §5.4, §6 (verify-postcheck), FR-08
- evidence: 用户 brainstorm step3 拍板
- priority: P0

## D-005@v1 实现方案 = 方案 B MultiRepoContext
- type: architecture
- status: accepted
- source: user (brainstorm step4)
- question: 跨仓支持选哪个实现方案（A/B/C）？
- answer: 方案 B 运行时多仓执行上下文（否决 A 分层抽象 / C 跨仓适配层）。基于架构评审子代理读 7 源码模块的评分（B 31 > C 25 > A 24）。
- normalized_requirement: MultiRepoContext 收口 7 个单仓假设点，每处 1-3 行（ctx.resolve(repo) 替换硬编码）；单仓退化单值 map 零回归。
- impacts: §5 全文
- evidence: 架构评审子代理报告 + 用户 brainstorm step4 拍板
- priority: P0

## D-006@v1 约束① 跨仓 head 实时取 git + base/head 双锡点
- type: constraint
- status: accepted
- source: Grill 约束1 + 用户 Blocker2 拍板
- question: 跨仓仓无 meta.json，base/head 怎么取？同 Wave 多 task 改同仓 HEAD 漂移怎么办？
- answer: resolveHead 实时 git rev-parse（CLI 派发/回收时取）；base+head 双锡点（task 卡 base_commit + head_commit，CLI 派发前落 base/回收前落 head）。
- normalized_requirement: 跨仓仓 base/head 不读 meta；task review base/head 读锡点非瞬时 HEAD。
- impacts: §5.3, R-01, D-010
- evidence: 子代理报告约束1 + Design Grill Blocker2
- priority: P0

## D-007@v1 约束② 未注册 repo / 跨仓 git 不可用 fail-closed
- type: constraint
- status: accepted
- source: Grill 约束2
- question: local.yaml repos 未注册的 repo: 或跨仓仓 git 不可用怎么处理？
- answer: fail-closed 阻断 execute 启动，不降级 warning（跨仓 apply 走错仓=数据所有权事故；跨仓 git 不可用是配置错误，不沿用主仓 unavailable 降级）。
- normalized_requirement: MultiRepoContext 构造时校验 declaredRepos ⊆ repoRegistry + 跨仓 git rev-parse 可达，否则抛错阻断。
- impacts: §5.3, §9, R-05, FR-04, NFR-01
- evidence: 子代理报告约束2
- priority: P0

## D-008@v1 约束③ pathOwners (repo,path) 聚合 + design §6 分段
- type: constraint
- status: accepted
- source: Grill 约束3
- question: 跨仓 task 与主仓 task 同名路径怎么避免误判冲突？
- answer: pathOwners 冲突检测按 (repo, path) 二元组聚合；validateDesignFileCoverage 支持 design §6 按仓分段（D-014 选定段头 ## <repo> 仓变更）。
- normalized_requirement: plan-postcheck pathOwners Map<repo+|+path, owners>；design §6 分段 parser。
- impacts: §5.3, R-03
- evidence: 子代理报告约束3
- priority: P0

## D-009@v1 G1 跨仓 apply = no-op
- type: architecture
- status: accepted
- source: Grill Blocker1
- question: 跨仓 apply「跨仓仓工作区→跨仓仓主干」具体什么机制？（原 design 含糊，自相矛盾）
- answer: no-op——跨仓 commit 已由子代理直接落跨仓仓主干，apply 只校验 review.head 是跨仓真实 commit + 跳过 wm.cleanup，无 patch 可打。源码依据：applyWorktree:223-535 深度耦合主仓 worktree+meta+分支模型，跨仓仓三者皆无（NG-1/NG-3），A5 patch 路径不可复用。
- normalized_requirement: applyWorktree 按 ctx 区分主仓/跨仓；主仓走原 A5，跨仓 no-op。
- impacts: §5.4, §6, R-02, supersedes D-002 机制
- evidence: Design Grill Blocker1 源码实证
- priority: P0

## D-010@v1 base+head 双锡点机制
- type: architecture
- status: accepted
- source: Grill Blocker2 (user) + 复审 head 精度
- question: 同 Wave 多 task 改同一跨仓仓时 base 锚点怎么定？（约束①实时取 vs R-01锁定快照矛盾）
- answer: task-local 双锡点——task 卡片 base_commit + head_commit，CLI 派发前落 base、回收 review 前落 head。用户拍板选 task-local 锡点（非共享 base / 非 plan 约束串行）。复审补 head 锡点（避免并行同 Wave 同跨仓不同文件 task 的 head 含他 task 改动）。
- normalized_requirement: task 卡 frontmatter base_commit + head_commit 字段；CLI 两时机落盘。
- impacts: §5.3, §7.2, R-01
- evidence: Design Grill Blocker2 用户拍板 + 复审 head 精度
- priority: P0

## D-011@v1 dogfood 不自指
- type: scope
- status: accepted
- source: Grill Blocker3
- question: 本仓=sillyspec，dogfood 跨仓 task 改 sillyspec 自指怎么破？
- answer: dogfood 改本仓代码全走单仓 task（无 repo:）；跨仓链路端到端验证改用 multi-agent-platform（主）↔ sillyspec（跨仓）真实场景，在 multi-agent-platform 仓建 change 验证。
- normalized_requirement: task-11 改 multi-agent-platform 场景；本仓改动走单仓 task。
- impacts: §2 GOAL-5, R-08, task-11
- evidence: Design Grill Blocker3
- priority: P0

## D-012@v1 buildWavePrompt per-task workdir
- type: architecture
- status: accepted
- source: Grill 架构矛盾
- question: execute.js:466/571 单 Wave 单 worktreePath，同 Wave 内主仓+跨仓 task 怎么各自切 workdir？
- answer: per-task Task 调用——buildWavePrompt 从「单 Wave 一段 prompt」改「按 task 逐个 Task 调用」，各 task 传 workdir（主仓=worktreePath，跨仓=跨仓仓根）。同 Wave 允许主仓+跨仓混合（各独立 Task 调用）。
- normalized_requirement: worktreeSection 单值改多值表；execute 调度模型不改（:607-699）。
- impacts: §6, R-09
- evidence: Design Grill 架构矛盾（execute.js 源码实证）
- priority: P0

## D-013@v1 G2 构造时机 = execute 启动建一次进程级贯穿
- type: architecture
- status: accepted
- source: Grill G2 gap
- question: MultiRepoContext 何时构造？execute 启动一次还是每次 gate 重建？
- answer: execute 启动时构造一次，进程级缓存贯穿 execute/apply/verify（不重建）。4 调用点（applyWorktree/validateTaskReviews/runVerifyTestCheck/generateTaskReviewDrafts）签名都加 ctx 参数。
- normalized_requirement: ctx 单例贯穿；调用点签名扩展。
- impacts: §7.2
- evidence: Design Grill G2
- priority: P1

## D-014@v1 G3 design §6 分段格式 = markdown 段头
- type: convention
- status: accepted
- source: Grill G3 gap
- question: design §6 按仓分段的具体 markdown 格式？
- answer: 段头格式 `## <repo> 仓变更`（非 frontmatter repo 标签，非豁免）。
- normalized_requirement: validateDesignFileCoverage parser 识别 ## <repo> 仓变更 段头。
- impacts: §5.3 约束③
- evidence: Design Grill G3
- priority: P1
