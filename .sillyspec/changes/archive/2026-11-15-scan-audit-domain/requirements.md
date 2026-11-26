---
author: flow-machine-draft
created_at: 2026-11-14T16:09:30.194Z
---
# 需求规格（Requirements）— 2026-11-15-scan-audit-domain

## 功能需求

### FR-01: 子项目对账只统计本项目责任域内的未归属文件（backend 项目不再把 frontend 等其他项目文件算进 uncovered）

- 必须：`specBase/projects/` 注册项目数 >1 时，`audit.uncoveredFiles`/`totalIndexed`/`coverageRatio` 只统计本项目 scope 首段域内的文件；域外文件不出现在对账报告。

#### 场景：多项目仓子项目对账

Given projects/ 注册 2 个项目，本项目 map paths=[backend/**]，索引清单含 backend/orphan.py（域内未归属）、frontend/app.tsx（域外）、backend/api.ts（域内已归属）
When computeIncrementalPlan 计算对账
Then uncoveredFiles=[backend/orphan.py]（域外 frontend 文件不计入），totalIndexed=2（域内 2 个），报告正文不含 frontend/app.tsx

### FR-02: 单项目仓对账行为不变（multi-agent-platform 根项目仍报 1 未归属）

- 必须：注册项目数 ≤1（含 projects/ 目录缺失）时不启用域过滤，根级散文件仍计入未归属（行为与上游变更逐字一致）。

#### 场景：单项目仓根级散文件仍是盲区

Given 单项目仓（projects/ 仅 1 个 yaml 或缺失），map paths=[src/**]，索引清单含 src/a.js、sync_tool.py（根级散文件）
When computeIncrementalPlan 计算对账
Then uncoveredFiles=[sync_tool.py]（不因域过滤被藏掉）

### FR-03: 既有 scan-incremental 单测零回归+新增域过滤用例

- 必须：上游 12 用例零改动零失败；新增域过滤正反例（多项目域内/域外/单项目不变）。

#### 场景：回归与新增

Given 上游 test/scan-incremental.test.mjs 12 用例全绿
When 新增域过滤用例并入该文件后全量跑
Then 全部用例通过（既有用例断言值不变——单项目 fixture 不受影响）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/scan-incremental.test.mjs「对账域过滤：多项目仓子项目只统计域内未归属」
FR-02: test/scan-incremental.test.mjs「对账域过滤：单项目仓不启用（根级散文件仍报）」+既有「对账：listIndexFiles mock…报告落盘」（断言值不变）
FR-03: test/scan-incremental.test.mjs 全套（新增 2 用例后 14 用例全绿）
