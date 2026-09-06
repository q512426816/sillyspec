---
author: qinyi
created_at: 2026-09-07T04:20:00+08:00
scale: large
---

# 设计文档（Design）— IR 五阶段 P3c：brainstorm 设计事实核验 + design 骨架渲染

## 背景

种子稿 `docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md` §1：brainstorm 侧 IR 化——设计决定 × 影响模块的机器核验（消灭「设计了不存在的模块」幻觉）+ design.md 模板渲染 + _facts.md 省 token 注入。

代码侧现状（2026-09-07 核实，P3b 合入 2876054 后）：
- decisions.md 条目已有「模块域」可选字段（brainstorm Step 3/Grill 增量落盘规则，src/stages/brainstorm.js:360 模板指引）；`src/decision-distill.js` 已有模块域解析（:46 parseListValue、:77 字段映射）与 **module-map paths 前缀匹配兜底**（:226 三级兜底）——解析与索引基础设施可复用。
- `_module-map.yaml`（模块 id → paths）由 scan/modules 维护；`src/modules.js` 有解析。
- brainstorm gate 链在 `src/run/gates.js` completeStageGates（分 stage 分支；brainstorm 现有 UI 原型软提醒 :160-176、frontmatter 检查 :526、Stage Review Gate :774）。
- `src/run/prompt.js` buildModuleContextInjection（:69，brainstorm/plan/execute 注入 module-map 上下文）；scan facts 机制（`src/scan-facts.js` + `_facts.md` 底稿 + 子代理红线「禁止重新 grep」）已落地但未接入 brainstorm。
- design.md 由 brainstorm Step 6 agent 按模板从零手写（prompt 内嵌十三章节模板）——决策追踪表需 agent 手抄 D 条目（手抄前科面）。

## 设计目标

1. **模块域核验 gate**：brainstorm「生成规范文件」步 --done 核验 decisions.md 各当前版本 D 条目的模块域——不存在于 _module-map.yaml 且无 `NEW:` 前缀 = ERROR（模块幻觉）；实改面（design 文件清单 × module-map paths）与声明域差异 = WARNING；全缺失 = WARNING 汇总（存量兼容）。
2. **design-init 骨架渲染**：CLI 生成 design.md 十三章节骨架，决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架就位；Step 6 prompt 卸责为「填骨架」（不强制——存量手写路径保留过门）。
3. **_facts.md 注入**：brainstorm Step 2 注入 `docs/<project>/scan/_facts.md`（存在时），红线同 scan（禁止重复 grep 底稿覆盖的机械事实）——省探索 token。
4. agent 手写面不新增（模块域字段已存在，只是被核验）。

## 非目标

- 不新建 design.facts.yaml / 任何设计侧新载体（D-001@v1）。
- 不做种子稿 §1 的「与 scan facts 依赖清单交叉，引用外部依赖必须真实存在」——依赖核验属 scan facts 域（npm/imports），另立变更。
- 不做跨仓模块核验；不动 design.md 十三章节契约与 Stage Review Gate 既有校验（骨架渲染只降低手写成本，不改变验收标准）。
- 不做 P3d（archive delta 回灌）。

## 拆分判断

单 change：三件套共享 decisions.md/module-map 解析基础设施，文件集中在 gates/prompt/新模块/cli 入口，强相关不宜拆。

## 总体方案

### Wave 1：核验纯函数 + 注入

**`src/design-facts.js` 新模块**（纯函数集）：
- `parseDecisionDomains(changeDir)`：读变更 decisions.md → 复用 decision-distill 的条目解析思路（当前版本 D-xxx@vN，superseded 旧版剔除）→ `[{ id, domains: string[] }]`；模块域 `NEW:<名>` 前缀识别（`NEW:` 开头的条目视为新模块声明，豁免存在性核验）。
- `loadModuleIds(specRoot, project)`：读 `docs/<project>/modules/_module-map.yaml` 的 modules 键集合 + paths 前缀映射（复用 modules.js/decision-distill 既有解析，避免三写）。
- `validateDecisionModuleRefs({ changeDir, specRoot, project, designFileList })`：
  - 各条目模块域逐 id：`NEW:<名>` 前缀豁免（**冒号后不加空格**——`NEW:foo` 合法、`NEW: foo` 切成裸项属书写错误进 ERROR 并在提示中纠正写法，D-004）；∈ moduleIds → ok；否则 **ERROR**（条目 id + 非法 id 列表 + 出路提示「补录 _module-map.yaml 或改用 NEW: 前缀声明新模块」）；
  - design.md 文件变更清单路径 × module-map paths 前缀 → 实改模块集；与全部声明域并集差异 = WARNING（「声明域未含实改模块 X / 声明域 Y 无实改文件」双向提示）；
  - decisions.md 不存在或全部条目无模块域 = WARNING 汇总一条（存量兼容）；module-map 不存在 = WARNING 跳过核验（无索引不误拦）。
- **接线（D-004 钉死）**：步骤级钩子链 complete.js:281（warnMissingUiPrototype 同点位、exit 1 先例）——brainstorm「生成规范文件」步 --done 时执行，ERROR → exit 1 阻断、WARNING 放行；信封 code `decision_module_ref_invalid` / `decision_module_domain_gap` / `decision_module_check_skipped`；不落盘新文件（gate 输出即回执，brainstorm 无 verify-runs 对应物——console + gate 结果为准）。

**_facts.md 注入**：prompt.js 的 brainstorm Step 2 prompt 组装处（buildModuleContextInjection 调用点附近）——`docs/<project>/scan/_facts.md` 存在则注入「机械事实底稿」段（全文 + 红线一句），fail-soft（读取失败空注入）。

### Wave 2：design-init 骨架 + prompt 卸责

**`sillyspec design-init --change <名>` CLI**（src/index.js case + design-facts.js 生成器）：
- 生成 `changes/<名>/design.md` 十三章节骨架：frontmatter（author/created_at/scale 占位）、背景/设计目标/非目标/拆分判断/总体方案（TODO 散文）、**文件变更清单表骨架**（表头+示例行注释）、接口定义/生命周期契约表（TODO）、数据模型/兼容策略/风险登记（表骨架）、**决策追踪表预填**（从 decisions.md 当前版本 D 条目逐行生成 `| D-xxx@vN | （待填覆盖点） | 待确认 |`）、自审（checklist 形态 TODO）；
- 幂等：design.md 已存在不覆盖（提示 --force 才覆盖，默认保护手写产物）。

**Step 6 prompt 卸责**（src/stages/brainstorm.js）：写设计文档步操作 2 改为「优先跑 `sillyspec design-init --change <名>` 生成骨架再填散文（决策追踪表已预填，逐行补覆盖点）；存量手写路径仍合法」。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/design-facts.js | parseDecisionDomains / loadModuleIds / validateDecisionModuleRefs / generateDesignSkeleton 纯函数集 |
| 修改 | src/run/complete.js | 步骤级钩子链（:281 同点位）新增核验调用——ERROR exit 1 + 信封 code（核验函数本体在 design-facts.js，gates.js 零改动；D-004 G2） |
| 修改 | src/run/prompt.js | brainstorm Step2 _facts.md 注入（fail-soft） |
| 修改 | src/stages/brainstorm.js | Step 6 prompt 卸责（design-init 优先）+ Step 3/Grill 模块域指引补 NEW: 写法（:360，G1 生产端——新模块决策的合法出路） |
| 修改 | src/index.js | design-init 命令 case |
| 新增 | test/design-facts.test.mjs | 解析/核验分级/骨架预填/幂等/注入断言 |

**字段数据流标注**（增强既有字段「模块域」的核验链）：producer = agent（brainstorm 落盘 D 条目时填模块域，模板已有指引）→ 归一化 = parseDecisionDomains（NEW: 前缀识别 + parseListValue 同款）→ consumer = ①validateDecisionModuleRefs（gate 核验）②decision-distill（归档提炼，既有）③design-init 骨架预填（决策追踪表）。_module-map.yaml 为只读索引源（modules.js/decision-distill 既有解析复用，不改其结构）。

## 接口定义

```js
// src/design-facts.js
parseDecisionDomains(decisionsText) // → [{ id, domains: string[] }]（当前版本；NEW: 前缀原样保留在 domains 项内）
loadModuleMap(specRoot, project)     // → { ids: Set<string>, prefixPairs: [{ id, path }] } | null（无 map）
validateDecisionModuleRefs({ changeDir, specRoot, project }) // → { ok, errors: string[], warnings: string[], skipped?: string }
generateDesignSkeleton({ changeName, decisionsText, author, now }) // → string（十三章节 markdown）
// CLI: sillyspec design-init --change <名> [--force]
```

envelope code：`decision_module_ref_invalid`（ERROR）/ `decision_module_domain_gap`（WARNING）/ `decision_module_check_skipped`（无 map/无 decisions）。

## 生命周期契约表

不涉及生命周期契约（核验与骨架渲染，无 session/lease/状态机语义）。

## 数据模型

无 DB schema 变更。无新载体文件（decisions.md 模块域字段既有）；design-init 产物为既有 design.md 骨架形态。

## 兼容策略（brownfield 必填）

- 存量变更（decisions.md 无模块域 / 无 decisions.md）：WARNING 汇总或跳过，零红门禁。
- module-map 缺失项目：WARNING 跳过核验（无索引不误拦）。
- design.md 手写路径完整保留（design-init 不强制、已存在不覆盖）。
- SillyHub：仅 additive 信封 code；design.md 骨架仍满足既有 Stage Review Gate/契约校验（十三章节结构不变）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 决策条目解析与 decision-distill 双源漂移（同一 decisions.md 两解析器） | P1 | parseDecisionDomains 优先复用 distill 的条目解析导出（若未导出则提取共用子函数放 design-facts 并让 distill 引用——单向依赖防环）；测试锁定同一 fixture 双解析一致 |
| R-02 | module-map paths 与实改文件前缀匹配误报（模块 paths 缺口——如 taskcard.js 无归属的存量状态） | P1 | 未匹配文件不产生「未声明模块」WARNING（只对命中的推导）；差异提示双向但措辞留人工裁量；首个真实变更观测 |
| R-03 | design-init 骨架与 Stage Review/契约校验漂移（十三章节标题措辞变化导致 gate 不识别） | P1 | 骨架章节标题逐字取自 brainstorm Step 6 既有模板（单一真相复制+测试断言与 stage-contract-spec 的目标定义一致） |
| R-04 | _facts.md 注入膨胀 prompt（底稿大） | P2 | 全文注入（对齐 scan 子代理口径）；超阈值（>15KB）截断提示跑 `sillyspec scan facts` 刷新；fail-soft |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1（载体=decisions.md 增强） | 非目标、数据模型、字段数据流 | 全覆盖 |
| D-002@v1（核验语义 ERROR/NEW:/WARNING） | 总体方案 Wave1、接口定义 | 全覆盖 |
| D-003@v1（三件套形态） | 总体方案全节、文件清单 | 全覆盖 |

无未解决决策。

| D-004@v1（Grill 修正：NEW: 生产端/接线点位/签名统一/冒号空格钉死/双源测试） | 接线节、接口定义、文件清单、R-01 | 全覆盖 |

## 自审

- 章节齐全 ✓；frontmatter ✓；中文标题 ✓；生命周期豁免短语紧邻 ✓；D-001~003 全引用 ✓；字段数据流标注 ✓；UI 原型跳过（纯 CLI）✓
- ⚠️ 自审存疑 1：R-01 的共用子函数提取方式（distill 导出 vs design-facts 反向被引用）实现期定，取决于 distill 条目解析的导出粒度。
- ⚠️ 自审存疑 2：design-init 与 brainstorm Step 6 的调用时机（prompt 指引 agent 跑 CLI vs 主代理跑）——按 prompt 卸责设计为 agent 跑（与 taskcard --all 先例一致：主代理跑更稳，prompt 写「由主代理执行 design-init 后填散文」——实现期按先例统一，接口不变）。
