---
author: flow-machine-draft
created_at: 2026-11-02T16:30:00.000Z
---
# 需求规格（Requirements）— 2026-11-02-slot4-harvest-retire

## 功能需求

### FR-01: harvestSlot4Decision 改为恒返回 {harvested:false, reason}，不再写 decisions.md；函数保留签名（flow.js 调用点兼容）但 flow.js 摘除收割调用与日志

harvestSlot4Decision 必须停止写盘——恒返回 {harvested:false, reason:'底稿收割已下线（2026-11-02-slot4-harvest-retire）——风险分析保留在 design.md 归档冻结件，不再合成伪决策条目'}；flow.js 必须摘除收割调用与日志输出（函数导出签名不变，零调用方兼容风险）。

#### 场景：不再产 decisions.md

Given design.md 有实质风险段作答且变更无 decisions.md
When flow done 收口
Then decisions.md 不被创建（风险分析已在 design.md 归档件保全）

#### 场景：幂等

Given 变更已有 decisions.md
When 调用
Then 返回 {harvested:false, reason 含'已在场'} 不写不覆盖

### FR-02: 测试：slot4-distill-fix.test.mjs 和 decision-anchor-backfill.test.mjs 适配（收割相关断言改为验证不写盘/幂等跳过；anchorBackfillCandidate 纯函数保留——蒸馏端还消费）

两个测试文件必须适配：收割写盘断言改为「不写盘」断言；anchorBackfillCandidate 纯函数测试保留（decision-distill 端还消费）；distill 端字段解析测试保留。

#### 场景：空实现判据

Given 恢复收割写盘
When 跑新测试
Then 「不写盘」断言必红

### FR-03: 存量底稿不动（已无行为影响，后续数据治理清理）

已入 knowledge/unmapped 的存量底稿条目（本仓 47+ 条）必须不动——底稿资格门已使其不获 deathPath（行为面已根治），数据面清理由后续变更处理。

#### 场景：存量零变化

Given 本变更完成
When 跑 eval
Then 六探针 GREEN 五面零回归

### FR-04: 验收：全量 npm test 零红 + eval 六探针 GREEN + lint 绿 + 显式 pathspec 提交

验收必须全绿：全量 npm test 零红、eval 六探针 GREEN、lint 通过、改动以显式 pathspec 提交。

#### 场景：全量零红

Given 变更完成
When npm test
Then fail=0

## 测试绑定（每条 FR 至少一行——「FR-NN: test/路径「用例名」」；空行/待填在 flow done 拒收）

FR-01: test/slot4-distill-fix.test.mjs「收割不写盘（改造后）」
FR-02: test/slot4-distill-fix.test.mjs + test/decision-anchor-backfill.test.mjs「适配回归」
FR-03: 不适用：存量不动（零行为面）
FR-04: test/slot4-distill-fix.test.mjs + test/decision-anchor-backfill.test.mjs 回归
