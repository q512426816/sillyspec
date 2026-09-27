---
author: flow-machine-draft
created_at: 2026-09-27T14:15:28.923Z
---
# 需求规格（Requirements）— 2026-09-27-watcher-push-endpoint

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: watcher 推送改走 POST {base}/api/changes/{name}/events
Given api 相关模块就绪
When watcher 推送改走 POST {base}/api/changes/{name}/events 单条契约（kind/rule/severity/provi
Then 行为符合本条标准描述

### FR-02: 推送失败语义保持 best-effort（失败即弃本地 jsonl 兜底），去重回退 ts+rule
Given 系统就绪
When 推送失败语义保持 best-effort（失败即弃本地 jsonl 兜底），去重回退 ts+rule 语义不变
Then 行为符合本条标准描述

### FR-03: watcher 测试套件同步更新并通过
Given 测试 相关模块就绪
When watcher 测试套件同步更新并通过
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/watcher.test.mjs :: toPlatformChangeEvents: 单事件契约映射——六键/stage 并入 detail 前缀/告警带 rule+severity/ts ISO UTC/无 id（去重回退 ts+rule）；pushEventsToPlatform: 打点 /api/changes/{name}/events + Bearer 凭据 + 单条映射体逐条 POST

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/watcher.test.mjs :: pushEventsToPlatform: best-effort 降级三态——非 2xx / 无配置 / 逃生阀，均不抛；local.yaml platform 段凭据通道（env 缺省时回落）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/watcher.test.mjs 全 17 用例通过（node --test，2026-09-27 实测）；另全量回填 30 变更事件到远程平台库成功（链路级实证）
