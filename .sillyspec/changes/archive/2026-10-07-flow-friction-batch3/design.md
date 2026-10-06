---
author: flow-machine-draft
created_at: 2026-10-06T16:13:04.411Z
---
# 设计记录（Design Record）— 2026-10-07-flow-friction-batch3

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四件指路/前置化修复，全部延续「同源规则复用 + fail-soft + advisory 不改执法语义」路线：① gate 口径分裂——runGate 默认档（execute/verify）补 `stage-review-hint` informational 检查：复用 --full 档的 getLatestStageReviewRunId 只读探测（marker 存在性，秒级），缺 review.json 时 warning 带 register-stage-review 指引、在场静默；独立 check id 不与 full-stage-review 碰撞，error 语义仍归 --full 与 --done 本体。② 幻觉路径不指路——design-facts 新增 suggestClosePaths（受控 BFS：跳重目录、8000 文件上限、basename 全等、≤3 条按路径长度升序），checkAgainstRoot 报错按根参数化附加「相近既有路径」段（主仓/跨仓根同享）；无命中不附段零加噪。③ Wave 冲突手工拆踩坑——同 Wave 共享文件 error 补 plan-adopt-waves 一键重排指引（伪并行串行链报错既有指引不动）。④ 死信回填脚本化——complete-handlers 新增 fillModuleImpactSkipped（与 verify 门 extractPendingDocSyncRows 同一节段解析口径），并入既有 module-impact case 的 --fill-skipped 分支（复用变更骨架 case，不新增命令）。⑤ visual-evidence 发现时机——ui-visual 新增 uiEvidenceExecuteAdvisory（runUiVisualProbe 包装：UI 触达且证据缺失才返回提示串），gates execute 收口的 module-impact advisory 同款位置接线 console.warn，verify 的 error 档执法不动。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

CLI 新增 flag：`sillyspec module-impact --change <名> --fill-skipped [--reason "<一句话>"]`（并入既有骨架 case，互不干扰；缺文件/无「更新结果」表 exit 2；幂等）。新导出：complete-handlers.js `fillModuleImpactSkipped(mdPath, {reason})`、ui-visual.js `uiEvidenceExecuteAdvisory({changeDir, specBase})`。行为变更三处（均有回归钉住）：① gate execute/verify 默认档 checks 数组多一个 informational `stage-review-hint`（ok 恒 true，envelope 结论与 exit code 不变——informational 不参与综合 ok）；② design_file_ref_invalid 报错 message 尾部可能有「相近既有路径：…」段（错误结构 {path,message} 不变，只是文案增长）；③ 同 Wave 共享 error 文案含 adopt-waves 指引（纯文案）。execute 收口新增两条 console.warn（module-impact 死信现补 fill-skipped 指引行；UI 证据缺失 advisory）——warn 不阻断，gates 判定不变。无端点、无 schema、无配置键、无文件格式变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：无事件流。全部是只读探测（marker 存在性/目录扫描）或幂等整文件重写（fill-skipped 重跑零改动）；suggestClosePaths 是无状态 BFS，结果只依赖扫描时刻的目录快照。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

fill-skipped 与并发编辑 module-impact.md 的竞争：整文件 read-modify-write，后写胜（与 agent Edit 同一语义）；最坏是并发方新写入的 pending 行未被本轮回填——verify 门会再拦（fail-closed 兜底），无损坏。stage-review-hint/suggestClosePaths/advisory 均纯只读。gate informational 检查不写盘。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

fill-skipped 中断于写盘前=零效果（原文在），写盘是单次 writeFileSync 无中间态；其余四项不落任何状态。hint 探测在 review 注册前后读到的都是当时的真值（提示语义，无缓存）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

suggestClosePaths 按传入根参数化（主仓/跨仓注册根各自扫各自的），建议带仓根相对路径不跨仓混suggest；fill-skipped 按 change 隔离（路径含 change 名）；hint 探测按 change+stage 寻址 marker；advisory 读变更目录自身文件。均无跨 change 共享态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：②的建议可能「答非所问」——basename 全等命中只覆盖「缺目录前缀/移动了位置」这类幻觉（postmortem 实证主力形态），对完全虚构的文件名无效（此时无建议段，回到现状）；BFS 8000 上限在大仓深目录下可能截断扫描漏掉真候选——建议是锦上添花，截断只意味着少一条提示不误报。第二个风险：④把「批量跳过」合法化可能被滥用为「一键清债不思考」——reason 是必填审计面的弱化（可选参数）；缓解：CLI 输出明示「reason 是审计面请确认真实」+ verify 门只认文件不认命令，agent 仍可手写。试过但放弃：a) 把 stage-review 检查并进默认档 error 语义——那会让 gate 默认档 FAIL 而 --done 才是执法点，两道门抢执法权造成新分裂（informational 是唯一不破口径的位置）；b) suggestClosePaths 用模糊匹配（编辑距离/前缀）——误建议比无建议更害（agent 照抄错路径再撞一轮门），basename 全等是零误报下限；c) visual-evidence 在 execute 收口硬拦——执法点在 verify 是分级门设计（ui_visual_gate 配置），execute 只该提醒不该抢。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/machine-interface.js | runGate 默认档 stage-review-hint informational 检查 |
| 修改 | src/design-facts.js | suggestClosePaths + checkAgainstRoot 报错附加相近路径段；import relative |
| 修改 | src/stages/plan-postcheck.js | 同 Wave 共享 error 补 plan-adopt-waves 指引 |
| 修改 | src/run/complete-handlers.js | fillModuleImpactSkipped（与 extractPendingDocSyncRows 同源口径） |
| 修改 | src/index.js | 既有 module-impact case 并入 --fill-skipped 分支 + usage 更新 |
| 修改 | src/ui-visual.js | uiEvidenceExecuteAdvisory 导出 |
| 修改 | src/run/gates.js | execute 收口 module-impact fill 指引行 + UI 证据前置 advisory 接线 |
| 修改 | docs/sillyspec/platform-interface-map.md | 行号锚同步 7 处（本变更插入所致漂移） |
| 修改 | package.json | 三个新测试收录 test:core |
| 新增 | NEW:test/gate-stage-review-hint.test.mjs | H1/H1b/H2 三契约 |
| 新增 | NEW:test/design-ref-suggest.test.mjs | S1/S2 指路 + U1/U2 advisory |
| 新增 | NEW:test/flow-friction-batch3.test.mjs | W1 指路 + F1/F2 回填 |
