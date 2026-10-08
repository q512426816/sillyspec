---
author: flow-machine-draft
created_at: 2026-10-08T00:58:10.015Z
---
# 需求规格（Requirements）— 2026-10-08-release-3-32-1

## 功能需求

### FR-01: 版本号 3.32.1 发布（载四个已归档修复）

必须：package.json version=3.32.1；quick-retired 测试 R5 版本锚同步（assert 与注释）；历史事实锚（run-quick.md「v3.31.0 起」）不动；quick-retired 测试绿。本版内容 = main 上四个已归档变更：2026-10-07-scope-audit-thin-patch-replay（归档 thin 变更对账读兼容）、2026-10-07-unify-close-trace（双通道收尾留痕统一）、2026-10-08-thin-done-dirty-gate-and-paren-attribution（收尾链三洞+实测门自埋雷）、并行会话的 2026-10-08-knowledge-stats-fr-only。

#### 场景：锚同步

Given 版本升至 3.32.1
When quick-retired 测试运行
Then R5 断言 pkg.version === '3.32.1' 通过

### FR-02: npm 发布与核验

必须：npm publish 成功且 npm view sillyspec version=3.32.1（latest 标签核验）；发版规格工件随归档留档并推送 origin/main（pre-push 钩子 lint+全量+docs gate 复跑绿）。

#### 场景：发布核验

Given 工作区版本面与测试绿
When npm publish && npm view sillyspec version
Then 输出 3.32.1；推送后 origin/main 与本地一致

实测留痕（2026-10-08）：`npm publish` → `+ sillyspec@3.32.1`（shasum 1fb613c0…，328 files，unpacked 13.2 MB）；`npm view sillyspec version`=3.32.1、`dist-tags`={ latest: '3.32.1' }。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 版本锚」
FR-02: 不适用：发布核验为外部动作（npm registry + origin 远端），非本仓测试面——核验输出随归档 verify 留痕
