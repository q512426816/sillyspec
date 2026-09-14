---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — hooks

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-904@v1 hook 零未声明依赖（测试直接 ESM 导入）
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/hooks/worktree-guard.js
最近确认：71a7fe6
理由：src/hooks/ 下 hook 会被测试直接以 ESM 导入——不得引入 package.json 未声明的外部包，简单本地配置解析优先用项目内已有实现或标准库，否则 `npm test` 在导入阶段即失败（ql-20260604-001-7a4c）。

## D-007@v1 refresh 编辑拍 × scan 覆盖保护=guard 握手（mode+refreshDocs 白名单前置分支，顺带修 7/40 位错配）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：握手机制三件：①refresh ①拍**原子写** scan-guard.json 为刷新会话态：{ name_zh: '增量刷新守卫', mode: 'scan-refresh', refreshDocs: ['docs/<p>/scan/<doc>.md', ...]（相对 specRoot 的 POSIX 路径）, sourceCommit: <7 位短 HEAD——与盖章同格式>, startedAt: now, forceRescan: false }；②worktree-guard.js shouldBlockScanDocOverwrite 在 guard 读取后加**前置分支**：guard.mode==='scan-refresh' 且目标文档相对路径 ∈ refreshDocs → 放行；不在白名单的 scan 文档继续走原保护（非本次刷新面不放松）；③顺带修存量 bug：check-1 比对前双方归一为 7 位短哈希（String(x).slice(0,7)），恢复「同基线放行/异基线拦截」的设计本意（现 7 vs 40 恒拦）。不做 draft 暂存区方案（agent 写 .runtime 草稿 + CLI apply——复杂度不成比例且 postcheck 时序别扭）；不滥用 forceRescan=true（会全局解除保护到下次 scan，攻击面过大）。--done 后 guard 不清理（沿用现状「下次 run scan 重写」语义，与 scan 会话同款生命周期）。
