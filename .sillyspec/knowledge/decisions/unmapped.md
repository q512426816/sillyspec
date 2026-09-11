# 决策知识 — unmapped

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-001@v1 : 本变更范围 = IR 提案 P3a，不含 P3b/c/d
状态：implemented
变更：2026-09-06-ir-stage-p3a
锚点：未记录
最近确认：11aa319
理由：仅 P3a（种子稿第 6 节）：plan 侧 task 卡 target_files 声明 + execute 侧机器对账（scope creep 检出）。P3b（verify 结论表）、P3c（design facts）、P3d（archive delta 回灌）各自独立变更立项。

## D-001@v1 : P3b 范围 = verify 结论表机器半边 + 探针一致性抽查 + claims 三层标注
状态：implemented
变更：2026-09-07-ir-stage-p3b
锚点：未记录
最近确认：6d72aca
理由：种子稿 §4 三点全部落地：①验证结论表的机器半边（CLI 全权生成 verify-facts.json：探针命令行+首跑关键指标快照）②探针复跑抽查（verify gate 重跑对比防篡改）③claims 三层分级标注（确定性检查/可复跑探针/人工判断）。不做 verify.facts.yaml 的 agent 半边（agent 手写 IR 是已知前科风险，判断层保持 verify-result.md 散文）。

## D-001@v1 quick ownFiles 须并入 baselineFiles
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：否。`review.changedFiles`（shared.js:1313? push）在 shared.js:1313? `if (isBaselineFile(file)) continue` 处排除了 baseline 文件——而多 agent 脏工作树起 quick 时，baselineFiles 正是本会话预存改动。仅用 changedFiles 会把自身预存文件误报为他者（§1 core 场景直接失效）。

## D-002@v1 execute ownFiles 源优先级链 + in-place 噪音决策
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：不可接受「空」。in-place 模式（`meta.mode==='in-place-fallback'`，gates.js:744 / complete-handlers.js:744）下主仓 git status 含本会话 src/ 交付文件，空 ownFiles 会把自身交付全报他者。worktree 模式下主仓看不见交付文件，空 ownFiles 无害。

## D-004@v1 detectConcurrentChanges 强制 safeGit trim:false
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：

## D-005@v1 「活跃变更目录」术语澄清
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：

## D-007@v1 verify/archive --done 排除理由
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：

## D-003@v1 quick 钩子 review=null brownfield 兜底
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：complete-handlers.js:1081 `let review = null`，仅 `if(guard)` 内赋值。brownfield 无 guard 时 review=null → `review.changedFiles` 抛 TypeError。design §5 只给 execute「取不到则空」兜底，quick 缺。

## D-006@v1 措辞「写操作前预检」vs 实际「完成时报告」
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：
