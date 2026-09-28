---
author: flow-machine-draft
created_at: 2026-09-28T14:57:31.392Z
---
# 需求规格（Requirements）— 2026-09-28-sentinel-waiver-hardening

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 镜像豁免仅在区间提交非空时生效——零提交＋镜像全勾仍拒收（空转变更不许过门）
Given 系统就绪
When 镜像豁免仅在区间提交非空时生效——零提交＋镜像全勾仍拒收（空转变更不许过门）
Then 行为符合本条标准描述

### FR-02: flow-state 锚定基线文件 sha256（start/adopt 快照时点）
Given 系统就绪
When flow-state 锚定基线文件 sha256（start/adopt 快照时点）
Then 行为符合本条标准描述

### FR-03: flow done 校验哈希不符→按无基线从严＋篡改告警文案
Given 系统就绪
When flow done 校验哈希不符
Then 按无基线从严＋篡改告警文案

### FR-04: 混合面（镜像＋覆写带 token）、重编号从严、CRLF 归一等已验行为零回归
Given 系统就绪
When 混合面（镜像＋覆写带 token）、重编号从严、CRLF 归一等已验行为零回归
Then 行为符合本条标准描述

### FR-05: 单测覆盖零提交从严/篡改从严/哈希锚定
Given 系统就绪
When 单测覆盖零提交从严/篡改从严/哈希锚定
Then 行为符合本条标准描述

### FR-06: live 复测 A 与 C 双通过（零提交形态与基线篡改形态均被拒收）
Given 修复后的 CLI
When 实弹复测角度 A（镜像全勾且区间零提交）与角度 C（篡改基线伪装镜像）
Then 两者均被哨兵断言拒收（角度 C 另有哈希不符告警行）

### FR-07: npm test 与 test:core 全绿
Given 系统就绪
When npm test 与 test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「⑥ 零提交不豁免」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「⑦ 锚定验证读取器（篡改检出/按无基线从严）」＋src/flow.js 三写入点首写者胜守卫（接线钉：rg baseline_sha256）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①②③④」＋test/sentinel-wiring.test.mjs「形态 A/A2/B/B2/C」回归

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-wiring.test.mjs「① 形态 A/A2」＋watcher 端到端「⑤」回归

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「⑥⑦」（零提交从严/哈希锚定与篡改从严单测）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：live 实弹复测非单测面——证据在会话记录（角度 A/C 双拒收输出）与 verify-result 留档

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
npm run test:core 221/221（定向五文件 44/44；npm test 全量失败项逐项归因均为预存/并行面，零落本变更触及面）
