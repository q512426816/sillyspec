---
author: flow-machine-draft
created_at: 2026-10-13T03:33:36.784Z
---
# 需求规格（Requirements）— 2026-10-13-batchtick-evidence-domain-hint

## 功能需求

### FR-01: 单拍多格勾选且哨兵证据完备（status=complete，每格已勾任务均有 token 提交/review.json）时 flow done 降级 advisory 放行并留痕 flow-state batch_ticked，无需 --allow-batch-tick

- flow done MUST 在单拍多格勾选被事件流检出且哨兵证据完备（detectFakeCheckCompletion status=complete——每格已勾任务均有 token 提交/review.json 证据）时降级为 advisory 放行，MUST 同时写 flow-state batch_ticked: true 留痕，禁止在此形态要求 --allow-batch-tick。

#### 场景：证据完备一把勾（反馈实证形态）

Given 三任务各有 token 交付提交，agent 一次 Edit 翻三格（watcher 观测单拍跳 0→3），未带 --allow-batch-tick
When flow done 执行
Then 不拒收（advisory 提示节奏信号面失真），flow-state 含 batch_ticked: true，收口继续走完

### FR-02: 证据不完备的单拍保持硬拒；--allow-batch-tick 旁路、哨兵面未知 fail-open、机器代勾解释整跳三态语义与优先序不变

- 证据不完备（status≠complete）的单拍 MUST 保持硬拒；决策优先序 MUST 不变：flag 旁路 > 哨兵面未知 fail-open > evidence-complete 降级 > 机器代勾解释整跳 > reject。

#### 场景：零证据一把勾

Given 任务全勾但 baseline..HEAD 提交零 task token 且无 review.json
When flow done 执行
Then 勾选证据哨兵先拒（假完成主张）；事件流门对 status≠complete 仍 reject

### FR-03: flow start 对 --input 提及路径输出模块域预判行：命中已登记模块点名 FR 将落 fr/<域>；未命中点名将落伪域 auto-<段>（与 distill 分段投票同源实现）并给登记指引

- flow start MUST 在模块图在场且 --input 提及路径时输出域预判行：命中已登记模块的路径点名「FR 蒸馏将落 fr/<模块 id>」；未命中的路径 MUST 经已导出的 resolveTouchedDomains（内部即 pseudoDomainFromPaths+词典守卫，与 distill 同一伪域回退链）计算预判伪域名点名 auto-<段>，并附模块图登记指引（收口模块门仍会兜底）。

#### 场景：命中与未命中双态

Given 模块图登记 mod1 覆盖 src/foo/，input 提及 src/foo/a.js 与 src/other/b.js
When flow start 执行
Then 输出含 fr/mod1 命中点名与 auto-other 未命中点名＋登记指引

### FR-04: --input 未提及路径时 flow start 输出零新增行（逐字节不变）；绿地路径经 flow start 绿地草案自动建图后预判照常输出（草案域点名）

- --input 未提及任何路径（或路径全被在场/图内过滤出局）时，flow start 横幅 MUST 零新增行（与改动前逐字节一致）；绿地形态由 flow start 既有绿地草案自动起草 _module-map.yaml（本变更前已有行为），预判对草案域照常点名 fr/<草案域>——零新增行的判定面是「无路径可判」，不是「无图」。

#### 场景：零路径

Given 模块图在场但 --input 为纯文字无路径提及
When flow start 执行
Then 输出不含域预判段

#### 场景：绿地/零路径

Given 无 _module-map.yaml 的仓（或 input 无路径提及）
When flow start 执行
Then 输出不含域预判段

### FR-05: 既有回归全绿：batch-tick-gate/sentinel-wiring 既有断言零改动通过；flow done distill 域路由与收口模块门行为零改动

- batch-tick-gate/sentinel-wiring 既有断言 MUST 零改动通过（四态语义与优先序回归锚）；flow done distill 域路由与收口模块门行为 MUST 零改动（fr-index.js 零编辑——预判经已导出函数复用同一实现）。

#### 场景：回归锚

Given 既有测试套件
When 全量跑
Then batch-tick-gate/sentinel-wiring 相关断言全绿，distill 路由产物与本变更前一致

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/batch-tick-gate.test.mjs「②d evidenceComplete 降级态（纯函数+接线钉）」＋ e2e 证据完备一把勾放行
FR-02: test/batch-tick-gate.test.mjs「②b 决策纯函数行为级」扩展断言（reject/旁路/未知/代勾优先序不变）
FR-03: test/batch-tick-gate.test.mjs「④ flow start 域预判：命中点名/未命中伪域+指引」（e2e）
FR-04: test/batch-tick-gate.test.mjs「④ …绿地与零路径零新增行」断言
FR-05: test/batch-tick-gate.test.mjs/sentinel-wiring.test.mjs 既有断言零改动跑绿＋全量回归
