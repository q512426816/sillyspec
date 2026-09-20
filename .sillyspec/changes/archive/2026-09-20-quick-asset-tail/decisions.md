---
author: qinyi
created_at: 2026-09-20 11:46:31
generated_by: sillyspec-fourpiece-init
change: 2026-09-20-quick-asset-tail
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

<!-- 背景：autocompact 对撞实证——薄通道（brainstorm→linked quick）快（39.5min/17.2M 追平 OpenSpec）
     但零资产：四件套躺僵尸目录（current_stage 卡 brainstorm），FR/决策永不进 knowledge；纯 quick
     482 条存量的根因知识躺在流水账里。资产义务不能随仪式定价——机器能榨的不向 agent 要字。 -->

## D-001@v1: 蒸馏尾内联 quick --done（单一入口），不设独立收口命令
- type: architecture
- status: accepted
- 问题: 薄通道的资产产出点缺失；若做成 `sillyspec quick-close` 独立命令，终态又靠 agent 自觉记命令——autocompact 实证没人记得收口。
- 选定: quick `--done` 门禁过后内联跑：linked 变更有 requirements.md/decisions.md → decision-distill + fr-index（幂等）+ lite 归档（rename + unregisterChange）。
- alternatives: 独立收口命令（否决——自觉=僵尸再现）；archive-lite 独立阶段（否决——同自觉问题）。
- normalized_requirement: 薄通道资产+终态在 quick --done 单点闭合，agent 零新增命令。
- impacts: [FR-01]
- evidence: autocompact 变更 current_stage=brainstorm 僵尸实证
- 故障面: quick --done 收尾变重——蒸馏函数纯内存秒级，lite 归档一次 rename；fail-open 不拦。
- 退役判据: 无。

## D-002@v1: 蒸馏挂点必须在质量闸后（防未实现设计进索引）
- type: correctness
- status: accepted
- 问题: 薄通道四件套在 brainstorm 末就存在——quick 中途废弃时若已蒸馏，活规格进了从未实现的需求。
- 选定: 只在 quick test+lint 门禁 action !== 'fail' 时跑蒸馏尾；废弃 quick 永不 --done → 永不蒸馏。
- alternatives: brainstorm 收尾时蒸馏（否决——实现未落地）。
- normalized_requirement: 蒸馏时点 = quick 门禁通过后。
- impacts: [FR-01]
- evidence: 重通道对照（蒸馏在 verify 后的 archive）
- 故障面: 门禁降级跳过（纯doc）时蒸馏照跑——doc 类 quick 无 FR 场景，可接受。
- 退役判据: 无。

## D-003@v1: FR needs_review 标记（module-map 同款模式），非 L3 门禁
- type: architecture
- status: accepted
- 问题: 钩子#1 只记遥测——quick 改 FR 覆盖行为后索引腐烂不可见，信号躺在 jsonl 无人消费。
- 选定: 钩子#1 命中时升级为条目级标记：fr-index 新函数 markFrNeedsReview 在触达域 active 条目写「待复核：<ql-id>」行；digest 透传 needsReview；brainstorm 注入行带 ⚠️；承接翻 superseded 自然清除。零 quick 写作义务。
- alternatives: 强制 mini-承接行（否决——给 quick 加字=仪式税回归）；纯遥测（否决——只报不修）。
- normalized_requirement: quick 触达 FR 域 → 条目标记非阻断信号；承接清除。
- impacts: [FR-02]
- evidence: module-map needs_review 先例；L3 声明义务边界（D-002 L1 设计）
- 故障面: 误标（触达≠行为变更）——advisory 信号人裁，注入行明示"待复核非失效"。
- 退役判据: L3 门禁上线时升级为声明义务。

## D-004@v1: lite 归档轻实现（9 处重门全跳，S2 核数勘误），不复用 archiveChangeDirectory
- type: architecture
- status: accepted
- 问题: archiveChangeDirectory 含 6 处 exit(1) 重门（未 apply 交付面等 worktree 导向）——linked quick 变更无 worktree 语义会被误拦。
- 选定: 新导出 liteArchiveChange：所有权 assert（复用 assertChangeOwnership）→ destName 命名（复用归档约定）→ rename → unregisterChange → 打印。跳过 module-impact/ROADMAP/delta 重件。
- alternatives: 给 archiveChangeDirectory 加 lite 分支（否决——重门缠织风险大于收益）。
- normalized_requirement: 终态语义（archive/ + unregister）与重通道一致，过程件豁免。
- impacts: [FR-01]
- evidence: archiveChangeDirectory:573 现场核读（重门清单）
- 故障面: rename 失败中途态——unregister 前 rename，失败时 change 留 active 可重试（顺序保证）。
- 退役判据: 无。

## D-005@v1: 纯 quick 机械件三样零写作义务，fail-open 全链
- type: scope
- status: accepted
- 问题: 纯 quick 482 条存量的根因知识/模块触达记录躺在流水账，检索面缺失。
- 选定: ①changelog 边车机械追加（changedFiles×module-map join，边车存在才 append）②根因 INDEX 关键词命中打一行确切 classify 命令（--cause 原文 CLI 手上有）③needs_review（D-003）。三样全机器推导。
- alternatives: 强制归类（否决——advisory 疲劳）；季度批量蒸馏（否决——死库存延续）。
- normalized_requirement: 纯 quick 收尾零新增 agent 义务，机械件全 fail-open。
- impacts: [FR-03]
- evidence: docSyncHint 先例（一行提示形态）
- 故障面: 边车不存在静默跳过（不建卡——建卡是 scan 职责）。
- 退役判据: 无。
