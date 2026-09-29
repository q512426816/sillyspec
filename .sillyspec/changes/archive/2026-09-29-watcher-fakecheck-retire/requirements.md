---
author: flow-machine-draft
created_at: 2026-09-29T08:47:31.957Z
---
# 需求规格（Requirements）— 2026-09-29-watcher-fakecheck-retire

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: ruleFakeCheck 与 fake-check-cleared 消解机制从 watcher.j
Given 系统就绪
When ruleFakeCheck 与 fake-check-cleared 消解机制从 watcher.js 移除（含 state.fakeCheckPending 
Then 行为符合本条标准描述

### FR-02: 其余 watcher 规则零改动
Given 系统就绪
When 其余 watcher 规
Then 零改动

### FR-03: watcher-alerts/watcher-timeline/watcher 测试中 fake-c
Given 测试 相关模块就绪
When watcher-alerts/watcher-timeline/watcher 测试中 fake-check 相关 fixture 与断言适配，全量 npm t
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 test/sentinel-rules.test.mjs「R1 已退役…」「R1 退役钉…」+ test/watcher.test.mjs「fake-check 生成器已退役…」 -->
test/sentinel-rules.test.mjs「R1 已退役…」「R1 退役钉…」+ test/watcher.test.mjs「fake-check 生成器已退役…」

<!--AGENT:测试绑定FR-02 test/sentinel-rules.test.mjs R2 全系（20/20 复活佐证——helper 误伤修复后零回归） -->
test/sentinel-rules.test.mjs R2 全系（20/20 复活佐证——helper 误伤修复后零回归）

<!--AGENT:测试绑定FR-03 npm test 全量 679/0 + test:core fail 0 + lint 绿 -->
npm test 全量 679/0 + test:core fail 0 + lint 绿
