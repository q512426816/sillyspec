---
author: flow-machine-draft
created_at: 2026-11-03T23:20:30.331Z
---
# 需求规格（Requirements）— 2026-11-04-activity-watchdog-race

## 功能需求

### FR-01: fireTurnActivityWatchdog 在 await interrupt() 之后复查守卫（status=running 且 currentRunId 仍为布防轮），失配静默跳过：不覆写新轮 running 态、不清新轮排队计数、不回调 onTurnActivityTimeout

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: 新增回归测试：interrupt 慢 resolve（受控 deferred）期间 result 收尾 + 新 inject 切轮交错，断言新轮 running 态保持、pendingInjectCount 保留、回调未触发；修复前该用例必红（状态被覆写）

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 既有 turn-activity-watchdog 测试组全部保持绿

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-02: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-03: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
