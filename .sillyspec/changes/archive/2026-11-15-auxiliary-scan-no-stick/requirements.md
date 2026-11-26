---
author: flow-machine-draft
created_at: 2026-11-15T00:05:38.077Z
---
# 需求规格（Requirements）— 2026-11-15-auxiliary-scan-no-stick

## 功能需求

### FR-01: 活跃变更在场时 run scan / run explore 不再被轻量跑道升厚同意门拦截（直接执行辅助阶段）

- 必须：stage ∈ {scan, explore} 时 command.js 的 effectiveChange 解析置空——不吸附活跃变更、不进混跑回退 --upgrade-thick 同意门（原行为 exit 2 拦截），辅助阶段直接执行。

#### 场景：活跃变更在场跑 scan

Given 仓内有活跃轻量变更（flow-state.yaml 在场，progress.currentChange 指向它）
When 运行 `sillyspec run scan`（无 --change）
Then 不输出「⛔ 本变更在轻量跑道上」、不 exit 2——scan 启动段正常执行（输出 Scan Profile/路径判定/步骤推进）

### FR-02: quick/archive 保持原路由（有变更归属语义不豁免）

- 禁止：本变更改动 quick/archive 的变更吸附与路由行为（quick 会话/archive 收口锚定变更语义不变）。

#### 场景：quick/archive 路由零变化

Given 同上活跃变更在场
When 运行 `run quick` / `run archive`
Then 行为与本变更前逐字一致（quick/archive 继续按变更路由）

### FR-03: multi-agent-platform 真机（活跃变更在场）run scan 可正常输出路径判定

- 必须：multi-agent-platform 仓（活跃变更 2026-11-13-turn-watchdog-bgtask-hardening 在场）跑 `run scan` 不再被拦，输出含「⚡ 增量路径」或「🛡️ 全量路径」路径判定行。

#### 场景：真机集成验证

Given multi-agent-platform 仓（活跃变更在场+codegraph 索引就绪）
When `node sillyspec/bin/sillyspec.js run scan --standard`
Then 输出 Scan Profile 与各项目路径判定行（不再出现 ⛔ 升厚门拦截与 libuv 崩溃退出）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/auxiliary-scan-no-stick.test.mjs「scan/explore 豁免吸附：effectiveChange 置空不进升厚门」
FR-02: test/auxiliary-scan-no-stick.test.mjs「quick/archive 不豁免：路由行为零变化（源码断言豁免集不含二者）」
FR-03: 不适用：集成面——multi-agent-platform 真机回执（flow done 集成验证回执记录命令/退出码/输出锚点；本仓 fixture 难以复刻活跃变更+索引+多项目完整环境）
