---
author: sillyspec-fr-index
created_at: 2026-09-20T15:18:10.810Z
---

# FR 索引 — stages

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/stages.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-stages-001 单一 frontmatter 解析源
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given task 卡内容（任意形态：无 frontmatter / 合法 / 非法 YAML）；When plan-postcheck 与 verify-probes 解析其 frontmatter；Then 两者消费同一实现（src/taskcard-frontmatter.js），提取与 jsYaml 解析行为一致（CRLF 容错）
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-01
最近确认：2a9e4a5f

## FR-stages-002 plan 门禁硬校验（fail-closed）
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
待复核：recent-quick
依据决策：D-001@v2
场景正文：
- 场景：默认场景 — Given task 卡 frontmatter 非法 YAML（jsYaml 抛错）；When validatePlanFeasibility 运行（plan 门单点拦截，D-001@v2——先于契约校验同 pass）；Then 返回 ok=false，errors 含 `frontmatter 非法 YAML（<file>:<行>:<列> <message>）`（行=js-yaml m
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-02
最近确认：2a9e4a5f

## FR-stages-003 探针 7 如实文案
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given task 卡 frontmatter 非法 YAML；When 探针 7 构建+渲染；Then 输出 `- ⚠️ frontmatter 非法 YAML（...）` 行而非「卡无 acceptance——防御，plan-postcheck 已拦」；真无 a
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-03
最近确认：2a9e4a5f

## FR-stages-004 零回归
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given 合法 task 卡（有/无 provides、expects_from、acceptance 字段）；When 全链路（parseTaskContracts / validateCrossTaskContracts / parseTaskAcceptance / 探针 7；Then 行为与现状一致（parseTaskContracts 仅 additive 新增 yamlError 键）
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-04
最近确认：2a9e4a5f

## FR-stages-005 plan 并批默认与护栏提醒
变更：2026-09-21-r5-efficiency-batch1
状态：active
摘要：文件正交任务默认并批；postcheck 正交未并批提示；护栏缺口提示
依据决策：D-002@v1
场景正文：
- 场景：文件正交任务默认并批 — Given plan 生成阶段，Wave 内存在 target_files 互斥且无 provides/expects_from 契约链的任务 ≥2 个；When 编排 agent 按 plan 步骤指令拆 Wave；Then 指令要求默认并批 2–4 任务/批，且并批后整 Wave 批数 ≥ min(3, 该 Wave 任务数)（N≥3 即至少 3 批）
- 场景：postcheck 正交未并批提示 — Given tasks/plan 已落盘，某 Wave 任务文件正交但全未并批；When plan-postcheck 运行 checkBatchAdvisory；Then 产出 warning 级提示（code=batch_orthogonal_unbundled），不阻断 --done
- 场景：护栏缺口提示 — Given 某 Wave 存在并批信号（批注行或卡 batch 字段）且并批后批数 < min(3, 任务数)；When plan-postcheck 运行 checkBatchAdvisory；Then 产出 warning 级提示（code=wave_inflight_below_floor），不阻断；返回数组支持多 Wave 各自命中——单 Wave 内两码
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch1/requirements.md#FR-01
最近确认：33d66c90

## FR-stages-006 execute 任务材料包（只摘不译）
变更：2026-09-21-r5-efficiency-batch1
状态：active
摘要：两段式装配；上限截尾；派发引用
依据决策：D-002@v1、D-003@v1
场景正文：
- 场景：两段式装配 — Given 变更目录含 design.md（「接口定义」「文件变更清单」节）与 tasks/task-NN.md；When 调用 assembleExecuteTaskMaterials；Then 落盘 materials/task-NN.md：稳定段（固定节名机械选取原文 + 签名锚点）在前、专属段（task 要点 + allowed_paths + 符
- 场景：上限截尾 — Given 材料包超过 24576B；When 装配完成
- 场景：派发引用 — When buildWavePrompt 渲染；Then 「子代理 prompt 要点」含材料包路径行与「先读材料包、按锚点回源核对」指令
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch1/requirements.md#FR-02
最近确认：33d66c90

## FR-stages-007 派发契约（轮数纪律 / 返回契约 / 回收瘦身）
变更：2026-09-21-r5-efficiency-batch1
状态：active
摘要：轮数纪律注入；子代理返回契约；回收瘦身
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：轮数纪律注入 — When buildWavePrompt 渲染；Then 派发要点含三行：相邻同文件改动合并单次 Edit / TodoWrite 阶段边界用不中途连发 / 测试验证合并单次 Bash 跑完
- 场景：子代理返回契约 — When 编排 agent 组装子代理 prompt；Then 含返回契约：≤25 行结构化摘要（verdict=done|blocked / 触碰文件数 / 测试一行结果 / 偏差说明），细节不贴正文
- 场景：回收瘦身 — When 回收约定段渲染；Then 含「审查回收输出 = verdict 一行 + blockers + review.json 路径，细节按需 Read 工件」；git diff 对账逻辑零改动
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch1/requirements.md#FR-03
最近确认：33d66c90

## FR-stages-008 错键探针套件
变更：2026-09-21-r5-efficiency-batch1
状态：active
摘要：错键形态可判
依据决策：D-002@v1
场景正文：
- 场景：错键形态可判 — Given fixtures 含三类 R4 真实错键形态（键名单复数错配 / 前后端 payload 键漂移 / 路径段后缀错配）；When 测试以 fixtures 喂 verify-probes 键原语（extractPayloadKeys / extractFrontendPayloadFiel；Then 原语对错键形态判不匹配/不覆盖（防线敏感性机械可证）
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch1/requirements.md#FR-04
最近确认：33d66c90
