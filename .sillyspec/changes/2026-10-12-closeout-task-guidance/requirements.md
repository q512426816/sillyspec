---
author: flow-machine-draft
created_at: 2026-10-13T00:38:15.807Z
---
# 需求规格（Requirements）— 2026-10-12-closeout-task-guidance

## 功能需求

### FR-01: flow start 主横幅（src/flow.js ~809-816 任务面段）与 resume/adopt 横幅（~537-538）各追加一行任务拟法指引：收口/推送/发布类动作不单列 task（协议本身承担，成功标准照写 requirements）；若确需单列，勾选前先有消息预埋 task-NN token 的交付提交（回执类证据写进提交消息）

- flow start 主横幅任务面段与 resume/adopt 横幅任务面段**必须**各追加一行：「任务拟法：收口/推送/发布类动作不单列 task（提交、归档、推送是 flow start→done 协议自身承担的动作，成功标准照写 requirements 而非搬进任务清单）；确需单列的收口/操作型任务，勾选前先做消息预埋 task-NN token 的交付提交——回执类证据（push/publish 回执、构建日志路径）写进提交消息，勿依赖勾选后补」。追加行**必须**为纯新增行，既有横幅行**禁止**改动。

#### 场景：主路径

Given flow start / resume 渲染；When 读任务面段；Then 含「任务拟法」行且语义含三要素（不单列/协议承担、成功标准归 requirements、单列则先 token 提交后勾选）。

### FR-02: 既有横幅行零改动（追加新行，钉死测试子串「任务面归你」等不受影响）

- 两处横幅的既有行**必须**逐字不变（git diff 仅见新增行）；既有钉死断言（flow-tick-prototype 的「任务面归你」、thin-workunits 的计数）**必须**保持通过——thin-workunits 对「任务面归你」计数若按出现次数断言，追加行不含该词则计数不变。

#### 场景：零回归

When node --test test/flow-tick-prototype.test.mjs test/thin-workunits.test.mjs test/tick-loop-nudge.test.mjs test/flow-redline-frontload.test.mjs；Then 全绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-tick-prototype.test.mjs「横幅含任务拟法行（新增断言随本变更加入该族或新用例）」
FR-02: test/flow-tick-prototype.test.mjs 等「横幅回归族全绿（既有断言零改动通过）」
