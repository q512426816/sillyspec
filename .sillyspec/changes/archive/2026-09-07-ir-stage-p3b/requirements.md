---
author: qinyi
created_at: 2026-09-07T03:32:51+08:00
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI（机器） | --init 落 facts 底稿；--done 重跑探针对比正文分级判定 |
| 审阅者 | 按 claims 分层读报告；用 facts 命令行独立复跑 |
| agent | 只写人工判断章节；预填段与 facts 勿动 |

## 功能需求

### FR-01: verify-facts.json 机器底稿
覆盖决策：D-001@v1
Given verify-probes --init 执行
When 骨架生成
Then 变更目录同步落 verify-facts.json（schemaVersion/change/generatedAt/四探针 command+metrics），CLI 全权、重新 init 覆盖为最近快照

### FR-02: 探针一致性抽查（checkProbeConsistency）
覆盖决策：D-002@v1, D-003@v1
Given verify-result.md 存在预填探针段
When verify --done gate
Then 重跑四探针对比正文（#### 探针子节定界锚点）：probe1/6 不符=ERROR（HEAD 前进子案降 WARNING）；probe3/5=WARNING；子节全缺且 facts 在场=ERROR、不在场=存量 skip；重跑异常=降级；接线于 reconcile 之后、信封 code 三值、落盘 verify-runs

### FR-03: claims 三层标注与 prompt 纪律
覆盖决策：D-001@v1
Given 骨架渲染
When 生成 verify-result.md
Then 章节标题行后缀层标注（人工判断/可复跑探针/确定性检查），不新增行不破坏结论提取；Step 7 prompt 增预填禁篡改与 facts 禁改两条

## 非功能需求
- 兼容性：存量旧报告 WARNING 跳过零红门禁；SillyHub 仅 additive
- 可回退：全部 additive，回退=移除接线与落盘
- 可测试：锚点 round-trip、篡改/漂移/存量/HEAD 前进各场景断言

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-03 | 范围与不做 agent 半边 |
| D-002@v1 | FR-02 | 分级+正文基准 |
| D-003@v1 | FR-02 | Grill 修正五项 |
