---
author: flow-machine-draft
created_at: 2026-10-09T01:16:29.488Z
---
# 需求规格（Requirements）— 2026-10-09-release-3-32-2

## 功能需求

### FR-01: package.json version=3.32.2；quick-retired 测试 R5 版本锚同步（assert + 注释）；历史事实锚不动

- package.json version 必须升至 3.32.2；quick-retired 测试 R5 版本锚必须同步（assert 期望值与注释文案同步为 3.32.2）；历史事实锚（如 run-quick.md v3.31.0 起的事实记述）禁止改动。

#### 场景：R5 锚同步

- Given package.json version=3.32.2；When quick-retired 测试运行；Then R5 断言 pkg.version === '3.32.2' 通过

### FR-02: quick-retired 测试绿 + lint 绿

- 发版时点 quick-retired 测试必须全绿（0 失败）且仓库 lint 必须通过；全量套件必须在 pre-push 钩子复跑绿。

#### 场景：发版前实测

- Given 版本面落盘；When 运行 quick-retired 测试与 lint；Then 25 用例全过、lint 零报错

### FR-03: npm publish 成功且 npm view sillyspec version=3.32.2（latest 核验）

- 必须 npm publish 成功，且 npm view sillyspec version 必须回读为 3.32.2（latest tag 核验）。

#### 场景：latest 核验

- Given npm publish 完成；When npm view sillyspec version；Then 输出 3.32.2

### FR-04: 发版规格工件随归档留档，推送 origin/main

- 发版规格工件必须随 flow done 归档留档，全部提交必须推送 origin/main。

#### 场景：推送核验

- Given 归档与留痕提交完成；When git push origin main；Then origin/main 与本地一致（pre-push 全量复跑绿）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 package.json 版本 3.32.2（init 按版本差刷新存量 AGENTS.md）」
FR-02: test/quick-retired.test.mjs「✅ 通过: 25 ❌ 失败: 0」；lint 由收口实测门覆盖
FR-03: 不适用：npm publish/view 是外部副作用核验，无仓内测试面（留痕见 requirements 核验注记）
FR-04: 不适用：推送为 git 远端操作，无仓内测试面（pre-push 钩子全量复跑即核验）
