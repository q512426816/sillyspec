---
author: flow-machine-draft
created_at: 2026-10-21T17:30:00.000Z
---
# 需求规格（Requirements）— 2026-10-21-docref-checkapproval-reanchor

## 功能需求

### FR-01: 平台接口图 checkApproval 锚重锚（必须）

docs/sillyspec/platform-interface-map.md:L84 的 checkApproval 位置锚必须更新为 shared.js:1316（checkApproval 当前定义行，src/run/shared.js:1316）——修复前 shared.js:1274 因 protocol-tax 重构越界（关键词窗口 [start-2,end+5] 无 checkApproval/syncMod）。doc-ref-check 必须全绿。

#### 场景：重锚后校验

- Given：L84 锚为 shared.js:1316
- When：node --test test/doc-ref-check.test.mjs
- Then：0 失败（本机临时 known_failures 豁免已摘除，无豁免兜底）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/doc-ref-check.test.mjs「doc-ref-check: 引用校验全绿（含 L84 checkApproval 锚）」
