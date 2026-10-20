---
author: flow-machine-draft
created_at: 2026-10-20T16:30:00.000Z
---
# 需求规格（Requirements）— 2026-10-20-closeout-roundtrip-slim

## 功能需求

### FR-01: reviewedAgainst 注记容忍与归一化（必须）

flow-review.js 的 reviewedAgainst 校验必须容忍注记形态：字段值含 7-40 位 hex 词元（首个匹配）即通过，且 review 对象中归一化为纯 sha（字符串形态/workspace 键/repos 各仓键三处同规）；字段无任何 hex 词元时必须维持整串拒收（错误文案不变）。归一化只在内存对象上（校验器只读不回写文件）。

#### 场景：主路径——sha+注记

Given reviewedAgainst = "e5c97358...52（git rev-parse HEAD 实测；区间零交集）"
When validateReviewJson
Then ok=true 且 v.review.reviewedAfter…… reviewedAgainst 归一化为 "e5c97358...52" 纯 sha。

#### 场景：边界——纯垃圾

Given reviewedAgainst = "就是随便写的"
Then ok=false，错误文案仍为 7-40 位 hex 提示。

### FR-02: dirty-gap 阻断文案快速通道（必须）

flow.js patch 子步的未提交交付缺口阻断文案必须追加指引句：脏文件全属并行会话在途/运行残渣且不在本变更交付面时，直接重跑带 --accept-dirty-gap（显式 pathspec 提交面已隔离归属；属本变更的文件必须走①提交）。阻断语义不变。

#### 场景：主路径——共享仓常态

Given 共享仓有并行会话在途文件，agent 收到阻断
When 读文案
Then 知道非己面脏文件可直接带 --accept-dirty-gap 重跑，省一轮试探。

### FR-03: 测试覆盖与新口径自验（必须）

新增测试必须断言：注记容忍矩阵（字符串/对象 workspace/对象 repos 三处 × 纯 sha/sha+注记/无 hex 三态）、归一化值、错误文案不变、dirty-gap 文案锚。变更测试面+lint 必须绿（新口径自验，不跑全量）。

#### 场景：主路径

Given 改动落盘
When node --test 新测试 + lint
Then 全过零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/review-anchor-annotation-tolerance.test.mjs「注记容忍矩阵+归一化+纯垃圾拒收」
FR-02: test/review-anchor-annotation-tolerance.test.mjs「dirty-gap 文案快速通道锚（源读）」
FR-03: test/review-anchor-annotation-tolerance.test.mjs（新口径自验：变更面+lint）
