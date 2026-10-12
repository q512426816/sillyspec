---
author: flow-machine-draft
created_at: 2026-10-12T14:28:08.645Z
---
# 需求规格（Requirements）— 2026-10-12-thick-taskbook-cli

## 功能需求

### FR-01: 新渲染函数 renderStageReviewerTaskbook（stage-review.js，避 import 环）：角色（干净上下文独立评审员）+ 评审对象主文档 + REVIEW_CHECKLISTS[stage] 检查单（逐条 pass/gap/fail）+ 项目评审探针（assembleProbeLinesForScope scope=thick，未配置零注入）+ 请求预算硬帽 12 次 + 只读纪律 + 产物路径（含 docHash 占位与 --refresh-hash 代填指引）+ 完成后动作（重跑 run <stage> --done）

- stage-review.js **必须**新增导出 `renderStageReviewerTaskbook({ stage, changeDir, changeName, reviewRunId, reviewPath, probeLines })`：内容含①角色行（独立评审员·干净上下文·未参与实现）②评审对象（主文档绝对路径 + reviewType）③REVIEW_CHECKLISTS[stage] 全量检查单（带序号，逐条 pass/gap/fail + 证据锚点口径）④项目评审探针段（probeLines 非空时渲染、缺省/空数组零注入）⑤请求预算硬帽 12 次行（超帽标 cannot_verify 列缺件）⑥只读纪律（禁改文件禁 git 写）⑦产物路径行（review.json 写到 reviewPath；docHash 占位 TODO + register-stage-review --refresh-hash 代填指引）⑧完成后动作行（主会话重跑 run <stage> --done --change <名>）。review.json 契约**必须**复用 renderReviewJsonContract 单源渲染（禁止第二套手写 schema 摘要——防契约漂移）。

#### 场景：主路径

Given stage=brainstorm、probeLines 两条；When renderStageReviewerTaskbook；Then 输出含检查单全部条目（带序号）、探针两行、预算 12 行、reviewPath、--refresh-hash 指引、run brainstorm --done 行与契约的 schemaVersion/specVerdict 字段说明。probeLines 缺省时**无**探针段。

### FR-02: 接线出口一：printStageReviewResult 失败路径——仅当失败原因是「缺少 stage review.json」（tier=independent 未产）时，在既有提示后打印完整任务书（其他失败原因如 docHash 失配不打印，防噪音）

- printStageReviewResult errors 分支**必须**条件打印任务书：仅当错误含「缺少」与「review.json」（即独立评审未产出、待派发形态）且有 reviewRunId 时，在既有提示（review.json 路径/register 命令/降级条款）之后打印；docHash 失配/schema 错等其他失败**禁止**打印（防重复撞门噪音）。探针装配**必须** fail-soft（specBase 由 dirname(runtimeRoot) 推导，装配失败零注入零阻断）。

#### 场景：条件性双态

When printStageReviewResult 收到「缺少 execute 阶段 stage review.json」错误 + 完整 context；Then stderr 含完整任务书（检查单+预算+产物路径）。When 收到 docHash 失配错误；Then **不含**任务书面（既有提示原样）。

### FR-03: 接线出口二：register-stage-review 生成骨架成功时打印同款任务书（派发前获取点，免撞门）

- register-stage-review 命令在**新生成骨架**时（--from adopt 与 --refresh-hash 刷新**不**打印——评审已在途或已完成）**必须**打印同款任务书；--json 模式**禁止**打印（机器可读面不混人类文案）。

#### 场景：骨架生成打印

Given 变更含 design.md；When `register-stage-review --change <名> --stage brainstorm`（非 --json）；Then stdout 含任务书与「下一步」既有行。When 带 --refresh-hash 或 --from；Then 无任务书面。

### FR-04: 平台通道（review-dispatch/buildReviewerTaskBook）零变化；步骤指引模板零触碰

- review-dispatch.js 的 buildReviewerTaskBook 及其两处调用点**禁止**变化；stages/*.js 步骤指引模板**禁止**触碰（本变更只增打印出口，不动既有渲染链）。

#### 场景：零变化

When 对照 git diff；Then review-dispatch.js 与 src/stages/ 零改动。

### FR-05: 新增单测：渲染面（检查单/探针注入与未配置零注入/预算行/产物路径/完成后动作）+ 门失败打印条件性（缺 review.json 打印/docHash 失配不打印）+ register-stage-review 出口打印（骨架打印/--refresh-hash 不打印）+ 既有 stage-review 回归族全绿

- **必须**新增 test/thick-taskbook-cli.test.mjs 覆盖上述场景（渲染单测 + printStageReviewResult 捕获断言 + CLI 级 register-stage-review 骨架/刷新双态）；既有 stage-review-gate-echo / stage-review-register / stage-review-contract / review-dispatch 回归族**必须**全绿。

#### 场景：主路径

When `node --test test/thick-taskbook-cli.test.mjs test/stage-review-gate-echo.test.mjs test/stage-review-register.test.mjs test/stage-review-contract.test.mjs test/review-dispatch.test.mjs`；Then 全部 pass。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thick-taskbook-cli.test.mjs「renderStageReviewerTaskbook 渲染面（检查单/探针双态/预算/产物/完成动作/契约单源）」
FR-02: test/thick-taskbook-cli.test.mjs「门失败条件性打印（缺件打印/docHash 失配不打印）」
FR-03: test/thick-taskbook-cli.test.mjs「register-stage-review 骨架打印 / --refresh-hash 不打印（CLI 级）」
FR-04: test/thick-taskbook-cli.test.mjs「review-dispatch 与 stages 模板零变化（git diff 面断言由评审核——测试面以 review-dispatch 回归族全绿替代）」
FR-05: test/thick-taskbook-cli.test.mjs「全量用例 + 四族回归」
