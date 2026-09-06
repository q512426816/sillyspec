---
author: qinyi
created_at: 2026-09-07T02:30:00+08:00
---

# 决策记录（Decisions）

## D-001@v1: P3b 范围 = verify 结论表机器半边 + 探针一致性抽查 + claims 三层标注
- type: boundary
- priority: P1
- status: accepted
- source: docs
- question: P3b 覆盖 IR 提案哪些点位？
- answer: 种子稿 §4 三点全部落地：①验证结论表的机器半边（CLI 全权生成 verify-facts.json：探针命令行+首跑关键指标快照）②探针复跑抽查（verify gate 重跑对比防篡改）③claims 三层分级标注（确定性检查/可复跑探针/人工判断）。不做 verify.facts.yaml 的 agent 半边（agent 手写 IR 是已知前科风险，判断层保持 verify-result.md 散文）。
- normalized_requirement: verify-facts.json 仅由 CLI 写入；探针一致性检查挂 verify gate；verify-result.md 骨架章节加层标注
- impacts: [FR-01, FR-02, FR-03]
- evidence: docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md §4；P3a 遗留观察（探针命令未持久化）

## D-002@v1: 方案A——facts.json 审计底稿 + gate 重跑对比正文预填段（防篡改不依赖底稿）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 探针复跑抽查的判定硬度与对比基准？
- answer: 用户预授权自主抉择方案A（2026-09-07「做完 p3a 就继续 p3b」轮）：①verify-facts.json=CLI 全权写的审计底稿（探针命令行+首跑关键指标+时间戳，供事后复跑，agent 勿手改）；②gate 一致性检查=重跑 runVerifyProbes 对比 verify-result.md 正文预填段——对比基准是正文而非 facts.json（删底稿绕不过防篡改）；③分级：探针1命中数/探针6删除清单不符或预填段缺失=ERROR（确定性高），探针3/5 指标不符=WARNING（测试文件列表/端点 parity 环境敏感）。拒绝B（全 ERROR 环境变化假红）与C（无门禁力，违背「防声称测过」意图）。
- normalized_requirement: facts.json 仅 CLI 写入；一致性检查挂 verify gate（--done 链）；对比基准=verify-result.md 正文；分级语义如上
- impacts: [FR-02, FR-03]
- 模块域: core-engine, runtime, stages
- evidence: 用户连续推进指令（2026-09-07）；种子稿 §4「探针命令可由 CLI 复跑抽查」

## D-003@v1: Design Grill 修正——子节定界锚点/probe5 锚规格/判别子/HEAD 前进子案/签名补参
- type: consistency
- priority: P1
- status: accepted
- source: design-grill
- question: 独立审查（brainstorm-review-p3b）2 P1 + 3 P2 gap 如何修正？
- answer: ①G1 判别子：#### 探针子节任一存在=新格式；全缺时 facts 在场→ERROR、不在场→存量 skip（全删残余降级如实声明）。②G2 probe5 锚改 summary 行存在性/missing 计数（FAIL 形态计数不进渲染）。③G3 checkProbeConsistency 签名补 specBase/runtimeRoot（P3a 先例口径）。④G4/G8：#### 子节定界防探针 2/4 碰撞；R-05 落盘；R-06=init→done 间 HEAD 前进时 probe6 漂移降 WARNING。⑤G5-G9：envelope code 统一三个、层标注含结论章节、后缀形式进规格、facts 语义改「最近一次 init 快照」。
- normalized_requirement: 一致性检查以 #### 探针子节为定界、锚点正则与渲染同源导出、分级判定含判别子与 HEAD 前进子案
- impacts: [FR-02, FR-03]
- 模块域: core-engine, runtime
- evidence: .sillyspec/.runtime/stage-reviews/brainstorm-review-p3b/review.json（10 项 checklist）；src/verify-probes.js:215-290
