---
author: flow-machine-draft
created_at: 2026-10-21T07:38:16.101Z
---
# 需求规格（Requirements）— 2026-10-21-review-dispatch-answer-salvage

## 功能需求

### FR-01: worker 把 review JSON 放 answer 正文（artifacts 空/不可解析）时，--status 能经第三通道回收落盘 review.json（channel=platform 落款不变）

- 必须：`extractReviewFromArtifacts(artifacts, answer)` 增第三通道——artifacts 双通道（kind 命中 / 文本兜底）全失败时，从 answer 原文文本扫描首个平衡 JSON 对象并返回；三通道全失败才返回 null。第二参可缺省（既有调用零改动语义不变）。
- 必须：review-dispatch status 链（主线 runReviewDispatch 与影子 dispatchShadowReview）把 `getWorkerResult` 返回的 answer 原文传入提取函数；经第三通道回收的 review 走既有 persistStageReview 落盘（reviewer.channel=platform 落款与 docHash 机械重算不变）。

#### 场景：answer 正文回收（dsh 实证形态）

- Given：worker completed，`get_worker_result` 返回 artifacts 为空数组（或全部不可解析），answer 原文里含完整 review JSON（裸 JSON 或 ```json 块、前后带说明文字）
- When：`review-dispatch --status`
- Then：三通道提取命中 answer 扫描 → review.json 照常落盘 + 在途记录清理 + verdict 回显（与 artifacts 命中路径行为一致）

#### 场景：向后兼容

- Given：调用方只传 artifacts（不传 answer）
- When：`extractReviewFromArtifacts(artifacts)`
- Then：行为与改前逐字一致（双通道，null 语义不变）

### FR-02: getWorkerResult 返回值含 answer 原文且既有消费方零回归（既有测试全绿）

- 必须：`SillyHubMcpClient.getWorkerResult` 返回值增 `answer` 字段——取 tool 返回值的 `answer` 字段，缺省兜底 `result` 字段（均为字符串原文；两者皆缺 → null）。既有 `workerId`/`status`/`artifacts` 字段解析与透传语义不变（不裁剪）。
- 必须：unavailable 三分支（未配置 / 调用失败 null / tool isError）返回 `{workerId: null, status: 'unavailable', artifacts: [], answer: null}`——best-effort 不抛语义不变。

#### 场景：answer 透传

- Given：tool 返回 `{worker_id, status: 'completed', artifacts: [...], answer: "…review JSON…"}`
- When：`getWorkerResult({missionId, workerId})`
- Then：返回 `answer` 为该字符串原文；仅含 `result` 字段时同兜底为 `result` 原文

#### 场景：既有消费方零回归

- Given：改前存在的调用方（review-dispatch 主线/影子提取链）与既有测试断言
- When：契约扩展（返回 shape 加字段）后跑既有测试面
- Then：仅 shape 精确断言（deepEqual）按新契约同步更新，行为断言全部保持绿

### FR-03: completed-no-artifact 文案含 --salvage/--from 两步指引、不含「--kill 降级」

- 必须：status 链 worker completed 但三通道提取全失败时，guidance 为两步文案——① `sillyspec review-dispatch --status --salvage --change <名>`（自动落盘 worker-answer.md 并提示 `register-stage-review --from` 回收）；② 确认平台确无结果才按通道优先序降级（renderFallbackGuidance 渲染）。
- 禁止：该失败文案出现「--kill 降级」混写（--kill 是清在途记录+平台处置指引，与通道降级是两件事）；bad-review（提取到但 schema 不过）分支的「--kill 后降级」同类混写一并去除，改为指向 worker-answer.md 修整 + `--from` 回收。

#### 场景：失败指引改写

- Given：worker completed 且三通道提取全失败
- When：`review-dispatch --status`
- Then：guidance 含 `--salvage` 与 `--from` 字样、含降级兜底（②），不含「--kill」；退出码语义不变（非零）

### FR-04: --status --salvage 落盘 worker-answer.md 于 stage-reviews run 目录

- 必须：CLI 增 `--salvage` flag（仅与 `--status` 组合合法，单独使用报用法错误）；status 链 worker completed 时把终态原文（answer 优先，缺省序列化 artifacts 原文）落盘 `.runtime/stage-reviews/<stage>-<reviewRunId>/worker-answer.md`（与 review.json 同 run 目录；writeAtomicSync 原子写，失败不阻断回收主线）。
- 必须：completed 终态原文落盘不依赖 --salvage flag——正常回收路径同样 best-effort 落盘 worker-answer.md（证据链：结构化 review.json + 原文 worker-answer.md 并存）；--salvage 形态下提取仍失败时，返回值带 salvagePath 且 guidance 给出「修整出 review.json 后 `register-stage-review --change <名> --stage <stage> --from <文件>` 回收；确无结果才降级」。

#### 场景：salvage 兜底

- Given：plain --status 已报 completed-no-artifact（在途记录仍在）
- When：`review-dispatch --status --salvage --change <名>`
- Then：worker-answer.md 落盘 run 目录，输出含 salvagePath 与 --from 回收指引；在途记录保留（可再次 salvage / 人工处置）

#### 场景：正常回收也留原文

- Given：三通道提取成功，review.json 落盘
- When：status 回收完成
- Then：同 run 目录存在 worker-answer.md（原文证据），回收返回值不受其写失败影响

### FR-05: 任务书含 json 块指引；新增+受影响测试全绿 + lint 绿

- 必须：`buildReviewerTaskBook` 产出方式段补一条——宿主/平台不支持 artifacts 回传时，把完整 review.json 文本放进回答正文的**首个 ```json 代码块**（CLI 回收链会从回答正文扫描兜底）。既有四要素（清单/契约/产出方式/铁律）不变。
- 必须：新增行为均有测试覆盖（见测试绑定），本变更测试面 + FR 关联回归全绿，lint 绿。

#### 场景：任务书双出口

- Given：buildReviewerTaskBook 组装 workerPrompt
- When：渲染产出方式段
- Then：同时含 artifacts 通道指引（既有）与「回答正文首个 ```json 块」兜底指引（新增）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/review-dispatch.test.mjs「extractReviewFromArtifacts 第三通道：answer 文本扫首个平衡 JSON（裸 JSON/```json 块/缺省参数向后兼容）」
FR-01: test/review-dispatch.test.mjs「status 链 e2e：artifacts 空 + answer 正文带 JSON → 第三通道回收落盘 review.json（channel=platform）」
FR-02: test/sillyhub-mcp-platform-fixes.test.mjs「getWorkerResult 增返 answer/result 原文（answer 优先 / result 兜底 / 双缺 null / unavailable answer:null / 既有断言同步新 shape）」
FR-03: test/review-dispatch.test.mjs「completed-no-artifact 文案：含 --salvage/--from 两步指引、不含 --kill、含降级兜底」
FR-04: test/review-dispatch.test.mjs「--salvage：worker-answer.md 落盘 run 目录 + salvagePath/--from 指引；正常回收路径亦留原文」
FR-05: test/review-dispatch.test.mjs「任务书产出段含 ```json 块兜底指引（既有 artifacts 指引不丢）」
