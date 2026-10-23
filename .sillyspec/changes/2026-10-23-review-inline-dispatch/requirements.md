---
author: flow-machine-draft
created_at: 2026-10-23T00:04:07.531Z
---
# 需求规格（Requirements）— 2026-10-23-review-inline-dispatch

## 功能需求

### FR-01: review_inline_wait 配置键与平台单调用派发

- local.yaml 新键 `review_inline_wait: <秒>`（readFlowConfig 逐键正则，正整数 1-600 有效；缺省/0/坏值=off）必须在 flow done review 缺席分支生效：键有效时经 SillyHubMcpClient probe 平台，可用则把薄道评审任务书全文（renderReviewerTaskbook 产物）作为 workerPrompt 派发（createMission→dispatchWorker→有界轮询至键值秒数或 300s 帽）→getWorkerResult 三通道提取 review JSON（artifacts 文件/kind、artifacts 文本、answer 正文）→validateReviewJson 通过→写 changeDir/review.json（reviewer='platform-inline'）→同调用继续既有登记块（不 exit，missing→PASS 往返消灭）。

#### 场景：单调用回收

Given 键=60 且平台在 60s 内完成评审并回传合规 review；When 运行 flow done（review.json 缺席、定档必评）；Then CLI 派发→回收→校验→落盘→同调用输出评审结论并继续 probes/distill/archive，全程一次协议调用；missionId/workerId 随输出留痕。

### FR-02: 回退面零损失（任何失败回退现状任务书面）

- 以下任一情形必须回退现状行为（打印一行 inline 尝试结果留痕后，按原样打印评审任务书+appendTelemetry+reportMidFail+exit 1）：键 off、平台 probe 不可用、createMission/dispatchWorker 失败、轮询超时未完成、worker failed/killed、三通道提取不到 JSON、validateReviewJson 违规。既有承诺词必评/评审 P1 拦截/任务书逐字形态等既有测试零改动全绿。

#### 场景：键未配置零回归

Given 键未配置；When 必评变更收口；Then 行为与改动前逐字一致（任务书+exit 1，无 inline 尝试行）。

#### 场景：超时回退

Given 键=5 且平台 5s 未完成；When 收口；Then 打印一行超时留痕（含 missionId 指引）后任务书面照常 exit 1。

### FR-03: 提取与登记单一源

- inline 提取的 review.json 必须走既有 validateReviewJson+登记判定（复用登记块，无第二套判定路径）；reviewer 字段如实 'platform-inline'；reviewedAgainst 照任务书标注（评审员产物原样，CLI 不改写）。

#### 场景：同源登记

Given inline 回收 verdict=FAIL+P1；Then 走既有 FAIL 拦截分支（不许归档），与子代理路径同判定。

### FR-04: 测试矩阵

- 新增测试必须覆盖：unit fake client（成功回收落盘+reviewer 标注/probe 不可用回退/超时回退/坏 JSON 回退）＋e2e 键未配置零回归（任务书面原样 exit 1）；readFlowConfig 键三态 unit（未配置 0/合法值/坏值 0）。

#### 场景：矩阵

Given fake client 与 temp 仓各场景；When 分别执行；Then 断言各自成立。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/review-inline-dispatch.test.mjs「①fake client 成功单调用回收（落盘+reviewer+同源登记消费）」
FR-02: test/review-inline-dispatch.test.mjs「②probe 不可用回退」「③超时回退」「⑤e2e 键未配置零回归」
FR-03: test/review-inline-dispatch.test.mjs「④坏 JSON 回退（validateReviewJson 同一源拒收）」
FR-04: test/review-inline-dispatch.test.mjs「①-⑤＋readFlowConfig 键三态 unit」
