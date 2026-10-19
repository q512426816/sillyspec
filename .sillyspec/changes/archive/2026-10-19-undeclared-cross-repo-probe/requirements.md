---
author: flow-machine-draft
created_at: 2026-10-19T10:18:55.430Z
---
# 需求规格（Requirements）— 2026-10-19-undeclared-cross-repo-probe

## 功能需求

### FR-01: 无跨仓规范标注且 local.yaml 注册仓非空时，收口探测各注册仓窗口（cross_baselines..工作树），有交付改动即点名仓键/文件数并给出规范标注三选一指引

- 系统 MUST 在 design 清单无任何跨仓 repo 标注且 local.yaml 注册仓非空时，逐仓探测 `cross_baselines..工作树` 窗口；某仓存在交付改动（filterDeliverableFiles 后非空）时 MUST 输出 advisory，点名仓键与文件数，并给出规范标注三选一写法。

#### 场景：命中未标注跨仓交付

- Given 注册仓 libx 在 flow start 后新增交付文件、design 无文件变更清单段
- When `flow done` 走 patch 子步
- Then 输出「注册跨仓窗口内有交付改动」并点名 libx（N 文件），收口不阻断

### FR-02: 探测为 advisory 不阻断；纯文档变更/单仓工作区/跨仓窗口零改动时零输出

- 探测 MUST NOT 阻断收口；注册仓窗口无交付改动、未注册任何仓、或清单已有规范 repo 标注时 MUST 零输出（不新增噪音）。

#### 场景：零改动

- Given 注册仓存在但窗口内零改动
- When `flow done` 走 patch 子步
- Then 无探测告警，收口正常

### FR-03: 新增用例覆盖命中与零触发两态，既有空面门/跨仓冻结测试全绿

- 变更 MUST 交付命中/零触发两态 e2e 用例，且既有空面门、跨仓冻结、存在性复查测试 MUST 零回归。

#### 场景：验证面

- Given 实现完成
- When 运行 test/thin-empty-face-crosscheck.test.mjs 与相邻回归套件
- Then 全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓有交付 → 窗口探测点名（advisory 不阻断）」
FR-02: test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓零改动 → 探测零输出」
FR-03: test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓有交付 → 窗口探测点名（advisory 不阻断）」；test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓零改动 → 探测零输出」；test/cross-repo-baseline-anchor.test.mjs 全文件
