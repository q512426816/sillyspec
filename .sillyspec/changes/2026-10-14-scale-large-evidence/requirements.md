---
author: flow-machine-draft
created_at: 2026-10-14T02:07:28.825Z
---
# 需求规格（Requirements）— 2026-10-14-scale-large-evidence

## 功能需求

### FR-01: brainstorm Step 8 规模评估的 large 判据含反判据：跨多端/多仓/多文件不是 large 依据（thin 支持多文件与跨仓交付）；任务间顺序依赖不是 Wave 证据（Wave 证据=可真并行且单会话吃不下的任务簇）

brainstorm「生成规范文件」步的规模评估指引必须（MUST）在 large 判据处显式给出反判据：跨多端/多仓/多文件不构成 large 依据（轻量道支持多文件与跨仓交付）；任务间顺序依赖（B 等 A 的契约/产物）不构成 Wave 证据——Wave 证据定义为「可真并行的任务簇」且「单会话上下文吃不下」两条同时成立。

#### 场景：措辞锁（getStageSteps 渲染面）

Given 已初始化仓
When 读取 brainstorm Step 8「生成规范文件」渲染 prompt
Then 含「跨多端/多仓」反判据、「顺序依赖不是 Wave 证据」、「真并行」措辞（test/brainstorm-exit-thin-default.test.mjs ④）

### FR-02: 判 large 时要求在 design.md 写明 Wave 证据（哪些任务可真并行/单上下文为何吃不下），写不出即 small

Step 8 指引必须（MUST）要求判 large 时在 design.md（总体方案/Phase-Wave 处）写明 Wave 证据——哪些任务簇可真并行、单会话上下文为何吃不下；并必须（MUST）给出兜底「写不出 Wave 证据 = 改判 small」。

#### 场景：Wave 证据落盘要求措辞

Given 已初始化仓
When 读取 Step 8 渲染 prompt
Then 含「Wave 证据」×「design.md」关联要求与「写不出…small」兜底措辞（④）

### FR-03: Step 8 明确要求按定稿方案实质重判，不沿用 Step 2 早期筛查印象（方案缩水是常态）

Step 8 指引必须（MUST）要求按定稿方案实质重判（方案在澄清中缩水——砍建表/砍迁移/砍端点——后不沿用 Step 2 早期筛查印象）；Step 2 收尾注必须（MUST）同步「方案缩水后按定稿重判、本步印象不作数」指路。

#### 场景：定稿重判措辞双落点

Given 已初始化仓
When 读取 Step 8 与 Step 2 渲染 prompt
Then Step 8 含「定稿…重判」与「早期筛查印象/早期印象」措辞（④）；Step 2 含「缩水后按定稿重判，本步印象不作数」（实现面）

### FR-04: design-init 骨架的 scale TODO 提示行同步反判据口径

generateDesignSkeleton 的 `scale: ""` TODO 注释行必须（MUST）含反判据口径（Wave 真并行/上下文分片=large 须写明 Wave 证据；跨端/多仓/顺序依赖不算），且 `scale: ""` 留空语义与 readDesignScale 三态必须（MUST）不变。

#### 场景：TODO 口径与语义不变

Given design-init 骨架生成
Then TODO 注释含「跨端/多仓…不算」口径（①）；`scale: ""` 仍读作 null（未标→收编默认，② 既有用例回归）

### FR-05: docs/prompt 提取产物与源逐字一致（_extract/_sync/_verify 链路）

brainstorm 源改动后必须（MUST）经 _extract→_sync→_verify 流水线再生成 docs/prompt/brainstorm.md 与 _extracted.json，brainstorm 阶段 fence 与源逐字一致（verify 阶段等存量容忍项不在本变更范围）。

#### 场景：流水线一致性

Given brainstorm.js 已改
When node _extract.mjs && node _sync.mjs brainstorm && node _verify.mjs
Then Step 8 fence 已替换且校验通过（实现面执行记录）；brainstorm 阶段零 miss

### FR-06: 全量 npm test 零失败

本变更交付必须（MUST）不引入新测试失败：目标措辞锁用例 4/4 绿、lint 绿；全量 npm test 的已知 1 失败（knowledge-inject A/B 字节对比）必须（MUST）可归因到并行会话在途变更（guide-anchor 引入的内容依赖锚文件名）——回退本变更全部文件后失败复现即为归因成立。

#### 场景：归因验证

Given 全量 npm test 存在 1 失败
When 仅回退本变更文件（git stash -- 本变更 5 文件）重跑该测试
Then 失败依旧（归因并行在途变更，非本变更引入）；恢复后目标用例 4/4 绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/brainstorm-exit-thin-default.test.mjs「④ large 反判据：跨端/多仓/顺序依赖不算 Wave 证据；判 large 须落 Wave 证据；按定稿重判」
FR-02: test/brainstorm-exit-thin-default.test.mjs「④ large 反判据（Wave 证据落 design.md/写不出 small 断言）」
FR-03: test/brainstorm-exit-thin-default.test.mjs「④ large 反判据（定稿重判/早期印象断言）」
FR-04: test/brainstorm-exit-thin-default.test.mjs「① design-init 骨架不预填 large（TODO 反判据口径断言）」
FR-05: 不适用：docs/prompt 流水线是文档生成步骤（node _extract/_sync/_verify exit 0、Step 8 fence 替换成功为实现面执行记录），无独立可执行断言面；逐字一致性由 _verify.mjs 自身承担
FR-06: test/brainstorm-exit-thin-default.test.mjs「①~④ 全绿」+ 全量 npm test 归因验证（回退复现）
