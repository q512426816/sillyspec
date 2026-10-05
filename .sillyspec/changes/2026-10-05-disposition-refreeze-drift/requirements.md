---
author: flow-machine-draft
created_at: 2026-10-05T13:20:44.274Z
---
# 需求规格（Requirements）— 2026-10-05-disposition-refreeze-drift

## 功能需求

### FR-01: 冻结后窗口内出现本变更名后缀交付提交时，重跑 flow done 检出漂移：输出审计时点漂移警告并自动重冻结（change.patch 含处置提交面，无需手动 --refreeze）

- patch 子步幂等跳过前必须检测漂移：change-patch.json.head（冻结锚）..HEAD 窗口内存在本变更名后缀提交时，必须输出「审计时点漂移」警告并自动重冻结（落回冻结体按 baseline..HEAD 最新面重建）——禁止归档件停在处置前时点。

#### 场景：主路径

- Given: flow done 已冻结 patch（锚 H1），此后有本变更名后缀的处置提交落 HEAD
- When: 重跑 flow done
- Then: 输出审计时点漂移警告（含本变更提交计数），change.patch 重冻结含处置提交面

### FR-02: review 已有结论（review.json 在场）时漂移触发隔离：旧件改名 review.json.superseded 留档，review 子步标记重置，本次重新定档/重评

- 漂移触发时 review.json 若在场必须隔离（改名 review.json.superseded 留档不删除），review 子步标记必须重置（盘写 + 本函数内存快照同步）——评审结论对着旧冻结面不作数，重跑走重新定档/重评任务书。

#### 场景：主路径

- Given: 评审 FAIL 拦截后处置提交落盘，review.json（FAIL）在场
- When: 重跑 flow done 触发漂移
- Then: review.json → review.json.superseded，重评任务书再现（exit≠0 @ review）

### FR-03: 窗口内仅他侧提交或无新提交时不触发（幂等跳过行为不变；归属判定按提交 message 变更名后缀）

- 漂移归属判定必须按提交 message 变更名后缀（既成事实）：仅他侧后缀提交、裸提交或冻结锚==HEAD 时不得触发——幂等跳过行为与现状一致；检测自身失败按无漂移（fail-safe 不新造阻断面）；冻结锚缺失（旧冻结件无 head）不触发。

#### 场景：主路径

- Given: 冻结锚..HEAD 仅含他侧后缀/裸提交，或锚==HEAD
- When: detectPatchDrift 判定
- Then: drifted=false，patch 子步幂等跳过

### FR-04: 单测覆盖归属判定三形态（本变更后缀触发/他侧后缀不触发/裸提交不触发）+ e2e 锁定处置重入链路（漂移警告+重冻结+隔离+重评任务书再现）

- 必须有单测锁定归属三形态（含锚==HEAD 与锚缺失两边界），与 e2e 全链路（真实 CLI 三轮 flow done：任务书→FAIL 拦截→处置提交→漂移重冻结+隔离+任务书再现）。

#### 场景：主路径

- Given: git fixture / 临时仓夹具
- When: 单测与 e2e 执行
- Then: 归属三形态断言与处置重入链路断言各自成立

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flowdone-disposition-drift.test.mjs「② e2e：处置重入——漂移警告 + 自动重冻结 + review.json 隔离 + 重评任务书再现」
FR-02: test/flowdone-disposition-drift.test.mjs「② e2e：…review.json.superseded 隔离与任务书再现」
FR-03: test/flowdone-disposition-drift.test.mjs「① detectPatchDrift 归属三形态：本变更后缀触发 / 他侧与裸提交不触发」
FR-04: test/flowdone-disposition-drift.test.mjs「① + ② 双件齐备（含锚==HEAD/锚缺失边界）」
