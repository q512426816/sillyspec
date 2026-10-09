---
author: zcode-verify-friction
created_at: 2026-10-09T15:30:00+08:00
---
# 提案书（Proposal）— 2026-10-09-verify-reuse-friction

## 动机

multi-agent-platform 2026-10-09-tombstone-conflict-root-fix 变更 verify 阶段实测 13 轮 × ~3.5 分钟（累计 ~45 分钟，总耗时 72 分钟）。经 sqlite 会话记录 + `.runtime` 取证（质量扫描记录 `usedSnapshot=false`、13 份 test-result、green-cache 落盘时间线、主仓提交时间线交叉比对），13 轮重复实测归因于四个独立机制，另发现一个比效率更严重的正确性风险：

1. **快照口径死循环（4 轮纯浪费）**：verify 阶段每次 step `--done` 在 noAI 亲测步 pending 时强制亲跑质量扫描（complete.js 批量对齐前补亲测）；passed 幂等复用闸要求 `usedSnapshot === plannedSnapshot`，而快照创建慢性失败时记录恒为 `usedSnapshot=false`、planned 恒为 true——闸永不收敛，每轮全量重跑。
2. **正确性风险（同源）**：快照失败静默回退主仓口径实测，而变更代码 apply 前主仓 HEAD 不含变更代码——实测的是「无变更代码」的基线且结论可被 `--done` 复用消费（本案靠对账门侥幸拦截）。快照失败无高可见告警、无摩擦记账。
3. **指纹含 HEAD，文档提交即击穿（2-3 轮）**：两类复用指纹（green-cache / 质量扫描）均含 HEAD 分量；收口窗口内每笔声明修正 commit（哪怕纯文档）都换 HEAD → 缓存必 miss。实证：纯文档未提交态（13:31-13:33）三轮秒过，提交后必重测。
4. **跨仓 task 主仓视角三缺陷（4 轮实测失败 + apply 拉锯 ~15 分钟）**：trace 行不携 repo 归属，悬空判定与残差执行按主仓 cwd 解析跨仓路径恒悬空；对账锚点 `HEAD~1..HEAD` 对多笔提交假信号；wt-commit 的 cwd 推断把跨仓 worktree 名 `<change>--<repoKey>` 整段当变更名。
5. **便宜门在实测门之后**：target_files 对账（纯 git 事实、秒级）排在 test/lint 实测门之后——每处声明偏差先付 3.5 分钟测试再被拦。
6. **复用判定不可观测**：test-result/质量扫描记录不落指纹与复用判定原因，本次取证全靠 sqlite 考古。

## 变更范围

修复上述六个根因，四个 Wave：W1 快照口径死循环+失败可见性（正确性优先）；W2 指纹代码树内容键化+复用观测补全；W3 收口纯事实门前移；W4 跨仓 per-repo 解析（trace/锚点/wt-commit）。

设计红线（用户约束）：**禁止以枚举定义开放世界**——语言/框架/runner/目录约定一律不写死枚举，沿用就近祖先探测既有机制，非代码判据沿用既有路径口径（`.sillyspec/`、`docs/`、`*.md`）；**不限语言框架**——所有判定基于 git 对象与路径事实；跨平台 Windows/Linux/macOS 兼容。

## 成功标准（可验证）

1. 快照创建连续失败场景下，passed 幂等复用闸第二轮起命中复用（死循环断根）；快照失败有高可见 ⚠️ 告警并记摩擦事件（gate_snapshot_fallback）。
2. 纯文档提交（零代码面变化）不击穿 green-cache 与质量扫描复用指纹；代码提交必击穿；两类指纹消费同一单点代码面口径模块。
3. verify 收口在 target_files 声明缺失时秒级失败且零测试执行（对账门先于实测门）。
4. 跨仓 task 的 trace 行携 repo 归属，悬空判定/残差执行按行 repo 根解析（存量无 repo 行回退主仓零迁移）；跨仓对账锚点窗口覆盖多笔提交；wt-commit 在跨仓 worktree 内可正确推断变更名。
5. test-result.json 携指纹与复用判定（layer/hit/reason），质量扫描记录携 miss 原因——复用链路不再依赖 stdout 考古。
6. 新增回归测试全绿 + 既有测试面回归绿（本仓 `npm run test:core` + FR 关联回归）。

## 不在范围内（Non-Goals）

- 快照创建慢性失败的根因修复（createVerifyGateSnapshot 为何返回 null）——本机无现存复现环境，本变更只保证失败可见 + 复用不死循环 + 口径如实标记；根因待复现环境出现另开变更。
- 轻量道（flow done）的摩擦记账与聚合清单接入——独立缺口（本次取证顺带发现），与厚档机制分属不同管线，另行立项。
- gate verify 预检命令的缓存层接入与 --docs-only 默认化——低优尾巴，不阻塞主线。
- 测试面推断/runner 探测机制的改动——沿用就近祖先探测既有实现，本变更不触碰。
