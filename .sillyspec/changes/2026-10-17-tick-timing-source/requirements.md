---
author: flow-machine-draft
created_at: 2026-10-16T16:30:30.520Z
---
# 需求规格（Requirements）— 2026-10-17-tick-timing-source

## 功能需求

### FR-01: detectTickTiming 纯函数：时戳分散→spread；挤尾窗且变更存活≥10×跨度→concentrated；单格/无观测/无锚各有态，缺锚 fail-open

- 系统 MUST 提供 `detectTickTiming({ ticks, lifespanMs, clusterWindowMs = 120_000, ratio = 10 })` 纯函数（零 IO、不读 git）：`ticks` 为空 → `no-ticks`；仅 1 格 → `single`；时戳跨度 > `clusterWindowMs` → `spread`；跨度 ≤ `clusterWindowMs` 且 `lifespanMs ≥ ratio × max(跨度, 1ms)` → `concentrated`；`lifespanMs` 非有限或 ≤0 → `no-anchor`（fail-open 不判）；挤短窗但存活比不足 → `spread`（快变更快勾是合法形态）。返回值 MUST 含 `count` 与 `spanMs`。

#### 场景：判定序与阈值

Given 侧车时戳清单与变更存活时长
When 调用 detectTickTiming
Then 按 no-ticks → single → no-anchor → spread（跨度超窗）→ concentrated（挤窗且存活比足）→ spread（挤窗但存活比不足）的判定序返回，阈值可用 opts 覆写

### FR-02: 压扁形态回归：侧车时戳分散的变更在 git 历史被压扁后 flow done 不再出一把勾警告（结构性误报消除）

- flow done 勾选时点判定 MUST 以 task-ticks.jsonl 侧车墙钟时戳为判据源（替换「tasks.md git 首次提交 == 收口最后提交」旧判据）：侧车时戳分散（跨度 > 120s）的变更即使 tasks.md 的 git 历史呈压扁形态（首提交 == HEAD），MUST NOT 输出一把勾警告，MUST 输出边干边勾确认行；侧车时戳集中 ≤120s 且变更存活 ≥10×跨度时 MUST 输出末尾集中勾选 advisory（不阻断）；勾选节奏门已检出单拍跳/突发时时点判定 MUST 让位（不双报）；侧车无观测时 MUST 只输出一行 task tick 教学指引，MUST NOT 再输出「untracked 直至归档」结构性警告。

#### 场景：压扁形态不再误报

Given 变更侧车含 ≥2 格分散时戳（跨度 > 120s）且 tasks.md 仅有收口时点一次 git 提交（压扁形态）
When flow done
Then 无「一把勾」警告，输出「边干边勾确认（判据=task-ticks 侧车墙钟时戳，不受 git 压扁影响）」确认行

#### 场景：末尾集中仍提醒

Given 变更侧车时戳集中在 ≤120s 窗内且变更存活 ≥10×跨度
When flow done
Then 输出「勾选时点：N 格勾选时戳集中在收口前 …s 内（末尾集中勾选）」advisory，流程放行不被阻断

### FR-03: task tick 翻格成功回显含可抄提交命令（消息模板带 task-NN、pathspec 含 tasks.md 与 task-ticks.jsonl）

- task tick 翻格成功（非幂等跳过）后 MUST 在回显中给出可抄提交命令模板：消息占位含本任务 task-NN token，pathspec 含本变更 tasks.md 与 task-ticks.jsonl（侧车存在时）；已勾 ≥2 格且 tasks.md 无任何 git 提交时 MUST 追加一行「此前勾选未随交付入库」提醒；git 不可用（非 git 目录/git 失败）时 MUST 跳过提醒只给命令。命令模板与提醒均为 best-effort 教学面：MUST NOT 影响翻格结果与 exit code。

#### 场景：回显与提醒

Given git 仓内在途变更，task-01 已勾、tasks.md 零 git 提交
When task tick --task task-02
Then 回显含 `git commit -m "<本任务交付概括> (task-02)"` 且 pathspec 含 tasks.md 与 task-ticks.jsonl，并输出未入库提醒行

### FR-04: 横幅/教学/拒收文案明确勾选修改与任务交付同一提交入库口径

- flow start 横幅（勾选证据行与交付纪律行）、brainstorm 收编教学行、任务未全勾拒收文案 MUST 写明「对应提交」的完整口径：提交消息带 task-NN token 且 pathspec 带上本变更 tasks.md（勾选修改与任务交付同一提交入库），并指向 task tick 回显的现成命令——消除「消息带 token 即合规」与「tasks.md 修改本身须入库」双判据歧义。

#### 场景：文案口径一致

Given 任意 thin 变更执行 flow start / task 未全勾触发拒收
When 读取横幅与拒收输出
Then 三处文案均含「pathspec 带上本变更 tasks.md（同一提交入库）」口径与 task tick 现成命令指引

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/tick-timing-source.test.mjs「detectTickTiming 判定序与阈值（含覆写/快变更放行）」
FR-02: test/tick-timing-source.test.mjs「flow done 时点判定换源——压扁形态回归与末尾集中 advisory」
FR-03: test/task-tick.test.mjs「tick 回显提交命令模板与未入库提醒」
FR-04: test/tick-timing-source.test.mjs「教学文案口径断言（横幅/收编教学/拒收行）」
