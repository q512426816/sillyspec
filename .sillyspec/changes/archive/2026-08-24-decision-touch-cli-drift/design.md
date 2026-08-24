---
author: qinyi
created_at: 2026-08-24T02:20:00+08:00
scale: small
source: deepseek-harness 二期学习批次①（用户 2026-08-24 批准"按你的计划来"）
---

# 设计文档（Design）— 决策锚点触碰提示 + 全局 CLI 版本漂移检测

## 背景

上一变更（2026-08-23-adopt-harness-practices，8bee5c8）建立了决策知识库，但两类"已有事实"还没有在正确时机呈现给人：

1. **决策锚点触碰无事中提醒**：behind 复核是事后的（doctor 看）；harness 的原则是 implemented 决策与代码同变更新——改到决策锚定的文件时应在 execute 期立刻提示复核。本次归档 dogfood 中 D-901~905 种子锚点被多次触碰而无任何提示，缺口实证。
2. **全局 CLI 落后于仓内源码无检测**：上一变更归档时，状态机由全局安装的五步版 archive 驱动，仓内六步定义未生效——流程后半段实际用旧引擎驱动新功能。harness 无此问题（`pnpm dsh` 从源码跑）；sillyspec 需显式检测。

## 设计目标

- G1：execute 期注入"本次变更触碰了 N 条决策锚点"提示（advisory，无触碰零输出），复用 docs-debt 事实注入管道——**渲染点含 Wave 步 prompt**（Grill 实证：{DOCS_DEBT} 仅前缀第 4 步渲染且单过流程该时刻 changedFiles 恒空，不扩到 Wave 步则特性失效）。
- G2：doctor 新检查项检测"全局安装 sillyspec 的源码 commit vs 当前仓 HEAD"漂移并警告（非 sillyspec 仓/无全局安装静默）。

## 非目标

- 不改 behind 阈值复核语义（doctor 既有检查项不动）
- 不做自动升级/自动切换源码运行（只提示）
- 不新增顶层命令、不动 archive 步骤结构

## 总体方案

### W-A 决策锚点触碰提示（execute 注入）

1. `src/docs-debt.js` 新增导出纯函数 `computeDecisionTouches(changedFiles, knowledgeRoot)`：
   - 扫描 `knowledgeRoot/decisions/*.md` 条目（复用 docs-check 的条目解析口径——锚点行 `锚点：src/...`）
   - changedFiles × 锚点路径**前缀匹配**（变更文件在锚点目录下或即锚点文件；锚点含 `:行号` 后缀先剥离）→ `[{ id, title, anchorFile, touchedFile, file }]`
   - 无 decisions 库 / 无触碰 → 空（零输出）；`锚点：未记录` 条目跳过
2. 注入载体（Grill 修订）：两个渲染点——①execute 前缀第 4 步既有 {DOCS_DEBT} 注入处（重入/reset 场景 changedFiles 非空时呈现）②**Wave 步 prompt**（src/stages/execute.js buildWavePrompt 处复用同一 facts 计算追加渲染，无新占位符）——changedFiles 口径 = porcelain 未提交 ∪ baseline..HEAD（与 {DOCS_DEBT} 现算同源）。事实行格式：`[decision-touch] 本次变更触碰 N 条决策锚点：D-905（quicklog 标签切段…，锚点 src/quicklog.js）← 触碰文件 src/quicklog.js；改动可能使该决策需复核`，advisory 不阻断、无触碰零输出
3. 过滤与归一：仅 implemented 状态条目参与（对齐 docs-check 先例 docs-check.js:793；rejected 条目锚点被触碰不提示）；路径 POSIX 化在 computeDecisionTouches 入口完成（POSIX 化属 prompt.js 调用方而非 docs-debt 三级归属——Grill 修正归属表述）；锚点 `:行号/:符号` 后缀剥离需导出 docs-check 私有 anchorFilePath（docs-check.js:708-714，含 :符号 形态）或复刻其正则

### W-B 全局 CLI 版本漂移检测（doctor 检查项）

1. `src/stages/doctor.js` 在既有「决策待复核检查」之后新增检查项「CLI 版本漂移检查」（同款形态：prompt 内嵌 node 探测脚本）：
   - `command -v sillyspec` → realpath → 向上找 `package.json`（name=sillyspec）定位安装源码根；非 npm 全局安装的 sillyspec 仓（如 file: 链接）也能命中
   - **安装根独立解析**（Grill 修正：不得复用「决策待复核检查」的 SRC_ROOT——sillyspec 仓场景它指向当前仓，比较恒等）
   - 比较双轨（Grill 修订 D-004）：git 轨——安装根有 .git 时 `rev-parse HEAD` 双仓比较 + remote origin 归一化同源判定（URL 规则：https/ssh 归一、.git 后缀剥离、host 小写）；**version 兜底轨**——安装根无 .git（registry 安装 / `npm i -g .` 拷贝，npm 恒排除 .git）时比较安装根 package.json version vs 当前仓 package.json version，不同即警告（覆盖 git 轨盲区，且 `npm i -g .` 补救后仍可检测——version 会随打包更新，同 version 不同 commit 的残余盲区在 design 声明：同版本号下源码热改不检测）
   - 漂移 → 警告："全局安装（version vX / commit Y）与当前仓（version vZ / HEAD W）不一致——流程引擎与仓内源码脱节，归档等流程行为可能滞后（2026-08-23 归档实证踩坑：五步版驱动六步定义），建议同步后重跑流程"
   - 当前仓非 sillyspec 仓（消费项目）→ 静默跳过
2. advisory：检测失败/超时只提示一行，不阻断 doctor

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/docs-debt.js | 新增导出 computeDecisionTouches 纯函数（不改 computeDocsDebt 现有行为） |
| 修改 | src/run/prompt.js | docs-debt facts 注入处追加决策触碰事实行渲染（producer=computeDecisionTouches → consumer=execute Wave prompt；复用 {DOCS_DEBT} 同注入点，无新占位符） |
| 修改 | src/stages/doctor.js | 新检查项「CLI 版本漂移检查」（prompt+内嵌探测脚本；producer=git 事实 → consumer=doctor 汇总） |
| 修改 | docs/prompt/doctor.md + docs/prompt/_extracted.json | doctor 镜像同步（_extract.mjs 流水线） |
| 新增 | test/decision-touch.test.mjs | computeDecisionTouches 回归（触碰/前缀匹配/未记录跳过/空库/零输出）+ 注入渲染 |
| 说明 | 既有测试文件均无需改动 | D-002 定并入既有检查段：doctor 步骤数不变、无步骤断言受影响；run/prompt 变更行为由新增决策触碰测试文件覆盖，既有断言不受影响（verify 期全量回归兜底） |

## 接口定义

```js
// src/docs-debt.js 新增
export function computeDecisionTouches(changedFiles, knowledgeRoot)  // 唯一真相形态
// → { touches: Array<{ id, title, anchorFile, touchedFile, file }>, empty: boolean }
// 前缀匹配：变更文件路径 === 锚点文件 或以 锚点文件 + '/' 开头；锚点 :行号 后缀剥离；
// 锚点：未记录跳过；decisions/ 不存在 → empty=true
```

## 生命周期契约表

不涉及生命周期契约（无 session/lease/agent_run/daemon/状态机变更——doctor 检查项为 advisory prompt 附加，archive/execute 流程结构不变）。

## 兼容策略（brownfield）

- 无 decisions 库 / 无触碰 → 注入零输出（与 docs-debt 无债零输出同语义）
- doctor 检查项：非 sillyspec 仓消费场景静默；探测失败静默降级
- computeDocsDebt 及既有调用方行为逐字不变（只增导出）
- run/prompt.js 既有占位符与注入不变（追加渲染分支）

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | doctor 步骤数变化（若独立 step）连带测试种子漂移 | P1 | 优先并入既有检查段避免步骤数变化；若独立 step 则同步 stage-definitions/doctor 测试（上一变更已有六步化先例） |
| R-02 | 镜像同步漂移（doctor.md） | P2 | _extract.mjs 既有流水线 + _verify 0 miss |
| R-03 | 锚点前缀匹配误报（同目录不同文件） | P2 | 匹配粒度=文件或其子路径（锚点是文件级非目录级）；advisory 无阻断 |
| R-04 | version 兜底轨的同版本热改盲区（同 version 不同 commit 不检测） | P2 | 设计已声明；git 轨覆盖开发态、version 轨覆盖安装态，两者并集覆盖主流形态 |
| R-05 | Wave 步追加渲染的 prompt 体积膨胀 | P2 | 无触碰零输出；事实行上限截断（如 5 条+省略号） |

## 决策追踪

| 决策 ID | 覆盖 |
|---|---|
| D-001@v1（方案A：复用现有管道，用户批准） | 总体方案全节 |
| D-002@v1（doctor 漂移检测优先并入既有 step，避免步骤数再动） | W-B 第 1 点 + R-01 |

## 自审

- 章节齐全（背景/目标/非目标/方案/清单/接口/生命周期豁免声明/兼容/风险/决策/自审）✅
- 生命周期关键词命中已按豁免短语处理 ✅
- 数据流标注：touches（producer=computeDecisionTouches → consumer=run/prompt 注入）、版本漂移事实（producer=git 探测脚本 → consumer=doctor 汇总）✅
- YAGNI：只做提示不做自动同步；无新命令 ✅
- ⚠️ 自审存疑 1：computeDecisionTouches 放 docs-debt.js（与模块归属一致）vs decision-distill.js（与条目解析同源）——定 docs-debt.js：docs-debt 是"变更×文档事实"的既有一贯家，decision-distill 是"归档期提炼"，事中触碰属前者；条目锚点解析口径通过复用 docs-check 的解析（动态 import 或复刻同格式）对齐
- ⚠️ 自审存疑 2：doctor 检查项并入哪个既有 step 待 execute 期看 doctor.js 现状定（倾向并入「决策待复核检查」同段或「汇总报告」前），plan 期不锁死
