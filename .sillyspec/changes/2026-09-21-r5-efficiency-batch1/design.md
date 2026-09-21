---
author: qinyi
created_at: 2026-09-21 11:26:05
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-21-r5-efficiency-batch1

## 背景

R4 对照实验（round4/r4-final-report.html）实测：大任务账单当量 2.4× 于小任务，差额构成 = 缓存体量 55% + 扇出冷启动 26% + 输出差 19%（交付厚度不砍）。db 级验靶（round4/b1-b1-target-validation.md）进一步实证：**扇出面 41.77M 名义 tokens 中新鲜内容仅 1.34M（3.2%）**——体量是「轮数 × 轮均上下文」的缓存重发积，读取行为本身零越界。杠杆因此锁定两个乘数：压上下文（B-④ 材料包）、压轮数（B-⑥ 轮数纪律）+ 主会话侧回收瘦身（C-1 B1/B2）+ plan 并批摊平重复重建（B-③）。同时 R5 验收协议（round4/optimization-plan.md v3.2）的防线回归硬门需要可机械执行的判法——错键类探针套件（v3.2 新增第 1 批必达项）。

## 设计目标

1. **B-③**：plan 阶段把「文件正交任务默认并批」写进生成指令 + postcheck 机械提醒（warning 级），并批后单 Wave 在飞子代理数 ≥ min(3, 该 Wave 任务数) 护栏防墙钟回退。
2. **B-④**：execute 实现子代理获得 CLI 裁好的材料包（design 契约节原文摘录 + 接口签名锚点 + 目标文件锚点），替代通读全量 design/文档；两段式装配（稳定段先行）兑现统一前缀缓存收益。
3. **B-⑥ + C-1**：execute 派发 prompt 注入轮数纪律三行与子代理返回契约（≤25 行结构化摘要）；审查回收输出瘦身（verdict 一行 + blockers + review.json 路径）。
4. **探针套件**：错键类 fixtures 断言 verify-probes 既有键原语对错键形态报不匹配——R5 防线回归硬门的机械判法。

## 非目标

（范围红线依据 decisions.md D-002@v1：五项轻机制为界，以下显式排除）
- 不动四道防线（审查/门禁/核验/资产）判定语义；不动四律请求钳；不动 allowed_paths 门禁。
- 不做 B-② 调研 digest（第 3 批完整流程）、C-2 handoff enrich、C-3 自动分段、B-⑤ 模型分级。
- 不改状态机/阶段流转/DB schema。
- 不做 CLI 渲染增量化（B3a 审计候选 C1，属主会话渲染面，另项处理）。

## 拆分判断

四模块共享「派发/计划 prompt 面」上下文（同读 plan-postcheck 与 execute.js 的波次装配），跨模块拆分会重复建立同一理解；且全部为轻机制改动，合为一个变更按 Wave 分任务执行。探针套件（M4）与前三个模块文件域零交集，独立 Wave 可并行。

## 总体方案

**Wave 1（M1+M2+M3，同属 stages/dispatch prompt 面）**

- task-01（M1 B-③）：`src/stages/plan.js` plan 生成步骤指令（src/stages/plan.js:142 prompt 段）追加并批默认（不变式表述，避免公式歧义）：文件正交（无共享 target_files、无 provides/expects_from 契约链）的任务默认并批 2–4 任务/批，**且并批后整 Wave 批数 ≥ min(3, 该 Wave 任务数)**（N≥3 即至少 3 批——批大小上界由此不变式约束，如 5 任务 → 2+2+1 三批而非 3+2 两批）；并批不跨风险级；护栏为 warning 级，S-F 型小任务（token 优先于墙钟）可显式接受提示。`src/stages/plan-postcheck.js` 新增 advisory 检查（warning 不阻断，复用 collectTaskDepMap src/stages/plan-postcheck.js:460 / parseTargetFiles src/stages/plan-postcheck.js:118 先例）：文件正交但全未并批 → 提示考虑并批；并批后某 Wave 批数 < min(3, 任务数) → 提示护栏缺口（同口径不变式）。
- task-02（M2 B-④）：`src/review-material-pack.js` 新增 `assembleExecuteTaskMaterials`：输入 changeDir + task 卡，输出材料包文件落 `.sillyspec/.runtime/execute-runs/<runId>/materials/task-NN.md`。内容两段式：**稳定段**（design.md 固定节名清单机械选取——「接口定义」「文件变更清单」两节**原文摘录**（缺节跳过）+ 接口签名锚点 file:line）→ **专属段**（task 卡要点 + allowed_paths + 关键符号锚点）。上限 24576B：专属段尾部优先截；稳定段自身超限时按节优先级（接口定义 > 文件变更清单）逐节截断，每节保留节头 + 首个代码块/表格 + 回源指引行（锚点永不丢）；**只摘不译**（摘录原文锚点，不做语义转写——D-003 防错键正典）。`src/stages/execute.js` 派发「子代理 prompt 要点」段（src/stages/execute.js:1316 附近）新增一条：先读材料包路径，按锚点回源核对。
- task-03（M3 B-⑥+C-1）：`src/stages/execute.js` 同段注入：①轮数纪律三行——相邻同文件改动合并为单次 Edit / TodoWrite 阶段边界用不中途连发 / 测试验证合并单次 Bash 跑完；②B1 返回契约——子代理返回 ≤25 行结构化摘要（verdict=done|blocked / 触碰文件数 / 测试一行结果 / 偏差说明），细节不贴正文；③B2 回收瘦身——回收约定段补一行：审查回收输出 = verdict 一行 + blockers + review.json 路径，细节按需 Read 工件。**git diff 对账机制零改动**（B2 只瘦身转述，不碰对账真相源）。

**Wave 2（M4 探针套件，与 Wave 1 文件域正交）**

- task-04：`test/probe-suite/wrong-key.fixtures.mjs` 锚定 R4 真实错键形态（键名单复数错配 / 前后端 payload 键漂移 / 路径段后缀错配三类，形态源自 r4-final-report「错键生产 no-op」对比段与 R4-L 任务画像）；`test/probe-suite/wrong-key.test.mjs` 断言 `src/verify-probes.js` 既有导出原语（extractPayloadKeys src/verify-probes.js:186 / extractFrontendPayloadFields src/verify-probes.js:521 / isSegmentSuffix src/verify-probes.js:497）对 fixtures 报不匹配/不覆盖——防线原语对错键敏感即机械判法成立。审查钳达标维持 transcript 判法（R5 时点数请求数），不进套件。

**Wave 3（镜像与文档同步）**

- task-05：`node docs/prompt/_extract.mjs` 重生成 docs/prompt 镜像（plan.md / execute.md / _extracted.json）；`.sillyspec/docs/sillyspec/modules/stages.md` 增补新行为行（并批默认/材料包/派发契约）+ changelog 边车同步；docs-check 重锚按提示收口。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/plan.js | plan 生成步骤指令追加并批默认三行（B-③ 提示词面） |
| 修改 | src/stages/plan-postcheck.js | 新增 checkBatchAdvisory（warning 级：正交未并批提示 + 在飞数护栏提示），复用 collectTaskDepMap 既有任务解析 |
| 修改 | src/review-material-pack.js | 新增 assembleExecuteTaskMaterials（两段式装配 + 24KB 上限 + 只摘不译） |
| 修改 | src/stages/execute.js | 派发要点新增材料包引用行 + 轮数纪律三行 + B1 返回契约；回收约定段补 B2 瘦身行（producer=buildWavePrompt 渲染 → consumer=编排 agent 组装子代理 prompt 与回收输出） |
| 新增 | NEW:test/plan-batch-advisory.test.mjs | postcheck advisory 测试（正交未并批触发/护栏触发/已并批不误报/共享文件不提示） |
| 新增 | NEW:test/execute-materials.test.mjs | 材料包测试（两段顺序稳定段先行/上限截尾/锚点保留/只摘不译——原文片段逐字比对） |
| 新增 | NEW:test/dispatch-contract.test.mjs | 派发 prompt 文本钉（材料包行/轮数纪律/返回契约/回收瘦身四段均在渲染输出） |
| 新增 | NEW:test/probe-suite/wrong-key.fixtures.mjs | 错键形态 fixtures（三类，锚定 R4 真实形态） |
| 新增 | NEW:test/probe-suite/wrong-key.test.mjs | 断言 verify-probes 键原语对错键 fixtures 报不匹配 |
| 修改 | docs/prompt/plan.md | 镜像机械重生成（_extract.mjs） |
| 修改 | docs/prompt/execute.md | 镜像机械重生成 |
| 修改 | docs/prompt/_extracted.json | 镜像机械重生成 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md | stages 模块文档增补新行为（并批默认/材料包/派发契约） |

## 接口定义

```js
// src/review-material-pack.js 新增
/**
 * 组装 execute 任务材料包（只摘不译）。
 * @param {object} opts
 * @param {string} opts.changeDir      - 变更目录（读 design.md / tasks/task-NN.md）
 * @param {string} opts.taskId         - 'task-NN'
 * @param {string} opts.materialsDir   - 落盘目录（.runtime/execute-runs/<runId>/materials）
 * @param {object} [opts.signatureAnchors] - 接口签名锚点（可选，调用方供给）
 * @returns {Promise<{path: string, bytes: number, truncated: boolean}>}
 * 契约：稳定段（design.md「接口定义」「文件变更清单」固定节名机械选取，缺节跳过 + 签名锚点）→ 专属段（task 要点 + allowed_paths + 符号锚点）；
 *       上限 24576B 截尾（专属段尾部优先截；稳定段超限按节优先级截断，节头+首个代码块/表格+回源指引行保留，锚点永不丢）。
 */
export async function assembleExecuteTaskMaterials(opts)

// src/stages/plan-postcheck.js 新增（advisory，warning 级）
export function checkBatchAdvisory({ tasksMdText, planMdText, taskCards })
// → Array<{ level: 'warning', code: 'batch_orthogonal_unbundled' | 'wave_inflight_below_floor', message }>
//   数组化（0..n 条）：单 Wave 可同时命中「正交未并批」与「护栏缺口」双码
// 护栏不变式：并批后整 Wave 批数 ≥ min(3, waveTaskCount)
```

（生命周期契约表：本变更不涉及 session/lease/daemon/lifecycle 关键词，省略。）

## 测试与验收

1. 新增五件测试全绿 + 全量存量不回归（npm test）+ lint 过。
2. 手工验收：模拟 change 目录跑 assembleExecuteTaskMaterials 检查两段顺序与截尾；渲染 buildWavePrompt 检查四段新文本在场。
3. R5 验收（本批交付物对硬门的支撑）：扇出 ≤32M（B-④⑥ 贡献）、门禁轮次 ≤2（postcheck advisory 为 warning 不新增阻断）、防线回归（错键探针套件 = 机械判法）、墙钟不劣化（并批护栏保 Wave 并发 ≥3）。
4. 退役判据见 decisions.md D-001/D-003。
