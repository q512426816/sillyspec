---
author: flow-machine-draft
created_at: 2026-10-07T14:18:21.980Z
---
# 需求规格（Requirements）— 2026-10-07-release-3-32-0

## 功能需求

### FR-01: 版本号 3.32.0 发布

必须：package.json version=3.32.0；quick-retired 测试 R5 版本锚同步（assert 与注释）；历史事实锚（run-quick.md「v3.31.0 起」）不动；quick-retired 测试绿。

#### 场景：锚同步

Given 版本升至 3.32.0
When quick-retired 测试运行
Then R5 断言 pkg.version === '3.32.0' 通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/quick-retired.test.mjs「R5 版本锚」
