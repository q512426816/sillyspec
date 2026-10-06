---
author: flow-machine-draft
created_at: 2026-10-06T14:20:51.352Z
---
# 需求规格（Requirements）— 2026-10-06-verify-docs-prefill

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: sillyspec gate verify --change <名> --docs-only 输出含 verify-test/verify-lint 的 informational 跳过说明、不执行测试命令、其余检查照跑；--docs-only 与 --full 并存 exit 2

`gate verify --docs-only` 必须把 verify-test/verify-lint 置为 informational 占位（warnings 含 --docs-only 档位说明、data.status='docs-only-skip'）且不执行测试命令，其余检查（artifacts/transition 等）必须照跑；--docs-only 与 --full 并存必须 exit 2（互斥，先于变更存在性检查）。

#### 场景：docs-only 预检

Given 任一 verify 阶段变更 / When `sillyspec gate verify --change <名> --docs-only` / Then verify-test/verify-lint 为 informational 占位且本地测试命令未被触发，文档契约类检查（如 verify-result.md 缺失）照常出现在 errors。

#### 场景：互斥

Given 任一变更名 / When `gate verify --change <名> --docs-only --full` / Then exit 2 且报错含互斥说明。

### FR-02: 探针 7 对 testFiles 为空的卡注入 FR 关联回归测试候选（渲染「既有用例」注记行，有归属卡的格子不受影响）；无 FR 知识/无命中时行为与现状逐字一致

runVerifyProbes 的探针 7 必须对三源归属（allowed_paths 测试模式/review changedFiles/依赖卡）为空的卡，把 collectFrLinkedTests 的 FR 关联测试文件注入其 testFiles 并在渲染中给出「既有用例候选（FR 关联回归面，本变更未改动）」注记行（existingTests 字段）；有归属的卡禁止注入（零噪音）；FR 索引不可读或零命中时行为必须与现状逐字一致。

#### 场景：无归属卡获得候选

Given 变更触碰 src/lib.js、知识库有 active FR 覆盖该文件且绑定 test/existing.test.mjs、task-01 卡 allowed_paths 无测试路径 / When runVerifyProbes / Then task-01 的 testFiles 含 test/existing.test.mjs 且渲染含既有用例注记行；有自身测试归属的 task-02 的 existingTests 为空。

#### 场景：无 FR 知识

Given 知识库无 FR 索引 / When runVerifyProbes / Then 无归属卡 testFiles 仍为空、无注记行（现状一致）。

### FR-03: local.yaml 配 plan.fill_batch_min_tasks: 3 后 buildCoordinatorStep 文案含「≤3」；未配置时含「≤8」（现状一致）

buildCoordinatorStep 必须读取 specBase 的 local.yaml `plan.fill_batch_min_tasks`（integer ≥1）并插值进协调器 prompt 的两处阈值口径；未配置或非法值（0/负数/非整数/坏 YAML）必须回退内置 8。

#### 场景：配置生效

Given local.yaml 含 plan.fill_batch_min_tasks: 3 / When buildCoordinatorStep / Then 文案含「≤3」且不含「≤8」/「>8」。

#### 场景：缺省与非法回退

Given 无 local.yaml 或键值非法 / When buildCoordinatorStep / Then 文案含「≤8」（与现状一致）。

### FR-04: backupVerifyResult 传 changeName 时备份文件名含 change 段；parseDesignApiTable 对「非零端点」返回 declared=null；refreshProbeSections 后手写 #### 子节存活

backupVerifyResult 传 changeName 时备份文件名必须含 change 段（verify-result-backup-<change>-<ts>.md，缺省不带向后兼容）；parseDesignApiTable 对「非零端点」措辞必须返回 declared=null（(?<!非) 前瞻，正向「零端点」仍认 0）；refreshProbeSections 的段边界必须认任意 1-4 级标题——含占位探针段之后的手写 #### 子节在刷新后必须存活。

#### 场景：三项清偿

Given 变更一评审 P3 三项形态（多 change 备份归属/非零端点散文/占位段后手写子节）/ When 各自调用 / When 定向刷新 / Then 备份名含 change 段、declared=null、手写子节标题与正文存活。

### FR-05: 写新 step guide 后，同步骤旧指纹 guide 文件被清理、仍被任一 state 引用的文件保留

pruneStaleStepGuides 必须以「keepAbsPaths ∪ 仍被任一 state 文件引用的 guidePath」为白名单删除同步骤前缀的其余 guide 文件，返回删除计数；目录缺失必须返回 0 不抛（fail-soft）。

#### 场景：白名单清理

Given guideRoot 有同步骤三份不同指纹 + 他步骤一份，state 引用其中一份 / When 清理（keep=新文件）/ Then 未引用旧指纹被删、被引用文件与他步骤文件保留。

### FR-06: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

新增四个测试文件（gate-docs-only/probe7-fr-prefill/plan-fill-batch-config/step-guide-prune）必须收录进 package.json 的 test:core 清单；收口时 test:core 必须全绿（290 用例 0 失败）且 npm run lint 必须 0 报错。

#### 场景：主路径

Given 本变更全部实现合入 / When `npm run test:core` 与 `npm run lint` / Then 均零失败退出（CLI 冒烟另证：--docs-only 秒级出文档缺项清单、test/lint informational 占位）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/gate-docs-only.test.mjs「D1 docsOnly：verify-test/verify-lint informational 占位，测试命令不执行，artifacts 照跑」「D3 CLI 互斥：--docs-only 与 --full 并存 exit 2（先于变更存在性检查）」「D2 对照：完整档走真实决策路径（非 docs-only 占位；跳过时有 CLI 自身的 dynamic-empty 理由）」
FR-02: test/probe7-fr-prefill.test.mjs「P1 无归属卡 + FR 命中：既有用例进 testFiles 且渲染注记行」「P3 无 FR 知识：行为与现状一致（无注入、无注记）」
FR-03: test/plan-fill-batch-config.test.mjs「B1 未配置：文案含「≤8」（缺省，现状一致）」「B2 配 plan.fill_batch_min_tasks: 3：文案两处口径均插值为 3」「B3 非法值回退 8」
FR-04: test/verify-probes-refresh-backup.test.mjs「P3-1 清偿：backupVerifyResult 传 changeName 时备份文件名含 change 段」「P3-2 清偿：「非零端点」不再被零端点同义正则误命中」「P3-3 清偿：含占位段后的手写 #### 子节在定向刷新后存活」
FR-05: test/step-guide-prune.test.mjs「G1-G3：旧指纹清理 / state 引用保留 / 他步骤不动」「目录缺失：返回 0 不抛（fail-soft）」
FR-06: test/step-guide-prune.test.mjs「目录缺失：返回 0 不抛（fail-soft）」（连同全量 test:core 290 用例 0 失败 + lint 0 报错，见变更提交链）
