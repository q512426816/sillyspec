---
author: flow-machine-draft
created_at: 2026-10-06T14:20:51.352Z
---
# 设计记录（Design Record）— 2026-10-06-verify-docs-prefill

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

五件各自对症，延续变更一（2026-10-06-verify-friction-fix）的「同源规则复用 + fail-soft」路线：① gate verify 轻量预检档——runGate 加 docsOnly 参数，verify 阶段的 verify-test/verify-lint 两执行类检查以 informational 占位（warnings 明示档位语义与完整核验通道），artifacts/transition 等文档契约检查照跑；CLI --docs-only 接线并与 --full 互斥（先于变更存在性检查，exit 2）；verify 阶段步骤指引补「收口前预检」提示。选占位而非删除检查条目：消费方（driver/agent）按 check.id 订阅，占位保形不破契约。② 探针 7 既有用例候选——runVerifyProbes 在 probe7 块内变更级一次调 collectFrLinkedTests（FR 索引不可读 fail-soft 为 null），只对三源归属（allowed_paths/review/依赖卡）为空的卡注入 FR 关联测试文件到 testFiles（hints/预填/trace 自然受益），新增 existingTests 字段渲染注记行「既有用例候选（FR 关联回归面，本变更未改动）」；有归属卡零注入零噪音。③ 填卡阈值配置化——buildCoordinatorStep 从 changeDir 推导 specBase 读 local.yaml plan.fill_batch_min_tasks（integer ≥1，非法/缺省回退 8），prompt 文案两处口径插值；config-schema 注册 plan 段。④ 变更一评审 P3 清偿——backupVerifyResult 加 changeName 参数进文件名（缺省不带向后兼容）；零端点同义正则加 (?<!非) 前瞻防「非零端点」误命中；splitProbeSectionRanges 段边界从 #{1,3} 放宽到 #{1,4}（手写 #### 子节不再被并入探针段吞掉）。⑤ step-guide 旧指纹清理——pruneStaleStepGuides 纯函数（guideRoot 白名单=新写文件∪state 引用文件，删同前缀其余），prompt.js 落盘分支接线。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

CLI 新增一个 flag：sillyspec gate <stage> --change <名> --docs-only（与 --full 互斥 exit 2；verify 阶段生效，其他阶段该 flag 无行为差异——只在 verify 分支分流）。local.yaml 新配置键 plan.fill_batch_min_tasks（integer ≥1，缺省 8，非法回退 8）。新导出：run/prompt.js pruneStaleStepGuides({guideRoot,stateRoot,stageName,stepIndex,keepAbsPaths})→number。行为变更四处（均有回归钉住）：① docsOnly 下 verify-test/verify-lint 为 informational + data.status='docs-only-skip'（完整档不变）；② probe7 无归属卡的 testFiles 可能含 FR 关联既有用例 + 新增 existingTests 字段与注记行（消费方按数组读取向后兼容；无 FR 知识时逐字一致）；③ backupVerifyResult 文件名在传 changeName 时含 change 段（verify-probes --force/--refresh-probes 的 CLI 调用均传）；④ parseDesignApiTable 对「非零端点」不再返回 0（返回 null）。无端点、无 schema、无既有配置键语义变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：无事件流。docsOnly 是单次只读查询内的分支；collectFrLinkedTests 每次全量重算无状态；pruneStaleStepGuides 在 guide 落盘之后同分支执行（新文件必在 keep 集，不存在「先删后写」窗口）；refresh 段边界放宽只影响纯函数的段切分，输入是同一份现文快照。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

guide 清理与并发写新 guide 的竞争：白名单读取 state 列表与删除之间，另一进程可能刚写了新 state+guide——其 guide 若不在本次白名单可能被误删；后果是该变更复入时 existsSync 回退全量重印（fail-soft 既有机制），无数据损坏。备份/探针/阈值读取均只读或幂等写，语义同变更一。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

docsOnly 不写任何状态（gate 只读契约 D-002@v1 不破）；probe7 注入只影响渲染与 trace 候选行（candidate/confirmed_by=null 语义不变）；prune 中断最坏留下旧指纹文件（下次写入再清）；fill 阈值每次渲染重读，配置中途变更即时生效无缓存态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

collectFrLinkedTests 以 specBase 为根（FR 知识按仓隔离）；probe7 跨仓卡不注入 FR 候选（FR 索引是本仓知识面，files 为仓根相对路径，只对本仓卡有意义——跨仓卡既有 crossRoots 机制不受影响）；guide 清理白名单按 stage-stepIndex 前缀圈定，不跨步骤误删；备份 change 段使多 change 并行时备份归属按文件名可辨。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：②的候选注入是变更级近似（frHits 无逐卡文件映射面，无法精确到「这张卡的 acceptance 连哪个 FR」）——无归属卡收到的是全部 FR 关联文件的并集，可能含无关用例。缓解：只注入无归属卡（有归属卡零噪音）、注记行明示「候选，命中≠结论，判定由你复核」、判定枚举仍由 agent 改写；宁可多给候选不回到「无归属测试——大概率 uncovered」的零信息预填。第二个风险：①的占位检查可能被 driver 误读为「测试通过」——warnings 三处明示「本档不含测试客观核验，以完整 gate/--done 为准」，exit code 语义不变（占位 ok=true 但整 envelope 的 ok 仍由 artifacts 等真检查决定）。试过但放弃：a) docsOnly 用命令子形态（gate docs <stage>）——与既有 --full flag 家族不一致；b) probe7 逐卡精确映射（requirement_ids→active FR）——本变更新 FR 与知识库 active FR 是两个编号系，映射需标题相似度启发（frTitleOverlap），误配代价高于并集噪音；c) guide 清理按 mtime 过期——时间窗语义在多变更并行下比引用白名单更粗暴。另：本变更撤销了最初计划的「评审三档」——档位机器已存在（review-tier S0/S1→self + flow-review 五路证据定档 + 1/4 抽样校准），再加 self 档会破坏抽样校准机制；55 万 token 病根是厚流程选道错位（运维修复应走轻量道），属选道纪律非档位缺失。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/machine-interface.js | runGate docsOnly 档（verify-test/lint informational 占位） |
| 修改 | src/index.js | gate --docs-only flag + --full 互斥 + usage；备份调用传 changeName |
| 修改 | src/verify-probes.js | probe7 既有用例注入 + 注记行；P3 清偿三项（备份名/前瞻/段边界）；import fr-index |
| 修改 | src/stages/plan.js | fillBatchMin 配置读取 + 文案插值；import js-yaml |
| 修改 | src/config-schema.js | plan 段注册（fill_batch_min_tasks） |
| 修改 | src/run/prompt.js | pruneStaleStepGuides 导出 + 落盘分支接线；import rmSync |
| 修改 | src/stages/verify.js | 探针 7 既有用例说明 + 收口前 docs-only 预检提示 |
| 修改 | docs/sillyspec/platform-interface-map.md | 12 处行号锚同步（本变更 7 处 + 并行变更 9e0a8c4d 遗留 5 处 command.js 锚） |
| 修改 | package.json | 四个新测试收录 test:core |
| 新增 | NEW:test/gate-docs-only.test.mjs | docs-only 三契约（占位/分支区分/互斥） |
| 新增 | NEW:test/probe7-fr-prefill.test.mjs | 既有用例注入三态 |
| 新增 | NEW:test/plan-fill-batch-config.test.mjs | 阈值配置三态（含非法回退） |
| 新增 | NEW:test/step-guide-prune.test.mjs | 清理白名单语义 |
| 修改 | test/verify-probes-refresh-backup.test.mjs | 变更一评审 P3 三项清偿回归追加 |
