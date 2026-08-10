---
author: qinyi
created_at: 2026-08-10 12:08:03
scale: large
---

# design：register-stage-review 命令（stage 级 review.json 骨架自动生成）

## 1. 背景与目标

### 背景

SillySpec 的 tier=independent 变更（design.md 变更文件数 >3 或 plan_level=full）在 brainstorm/plan/execute 三个阶段完成时，Stage Review Gate 硬校验一份**阶段级** `review.json`（schemaVersion/reviewType/specVerdict/qualityVerdict/reviewedFiles/docHash/checklist），要求由**独立审查子代理**产出。现状痛点：

- **没有任何确定性 writer** 会主动生成 `stage-reviews/<stage>-review-<runId>/review.json`；只有 schema 校验器（`validateStageReviewSchema`）+ 把契约渲染进 prompt 让子代理照抄（`renderReviewJsonContract`）。
- 子代理照抄易错：漏 schemaVersion、docHash 用主文档改版前旧 sha256、checklist 按层嵌套对象、reviewType 忘改 —— 只能 Stage Review Gate 事后拦，反复摩擦。
- **marker 死锁**：`current-stage-review-run-id-<stage>-<change>` marker 只在 `prompt.js` 渲染 `{REVIEW_TIER}` 时写；调度者手动派独立子代理（不走该 prompt 渲染）时 marker 不写 → `getLatestStageReviewRunId` fallback 扫描目录 → 跨变更串台/取错 run → 高摩擦根因。

对比：**task 级已有完整解**——`generateTaskReviewDrafts`（task-review.js:658）+ `backfill-reviews` CLI（index.js:423）能确定性落盘 task 级 `cannot_verify` 草稿（幂等、fail-open、填真实 base/head/changedFiles）。stage 级是对称缺口。

### 设计目标

- 新增一个**手动**确定性 CLI writer `register-stage-review`，填对 stage 级 review.json 的全部必填字段 + 算对 docHash + 写 canonical run 目录 + 写 marker + 自检通过。
- 治 marker 死锁：CLI 确定性写 marker，不依赖 prompt 渲染路径。
- docHash 由 CLI 直接 `computeDocHash`（命令有文件访问权），消除 agent 手算 hash 易错（部分实现已 defer 的 P6.1b，仅 scaffold 这条路径确定性，不撤销 agent 手算+CLI 重算的现有 enforcement）。
- 纯增量、低风险：复用 stage-review.js 全部已就绪原料函数，不动任何 gate 语义、不动 task 级、不集成进 execute --done。

## 2. 设计目标（可测试约束）

- **G-1**：`sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute>`（无 --from）产出一份 schema 合法的 `cannot_verify` 骨架 review.json，通过 `validateStageReviewSchema` + `validateStageReview`（含 docHash 真实性校验）。
- **G-2**：骨架的 `docHash` == `computeDocHash(<specBase>/changes/<change>/<mainDoc>)` 的 sha256 hex（CLI 算，非占位）。
- **G-3**：命令写 marker `current-stage-review-run-id-<stage>-<change>`，内容为生成的 `review-<ts>` runId（`/^review-/` 前缀），`getLatestStageReviewRunId` 能读到。
- **G-4**：`--from <file>` adopt 模式：读 agent 草稿 → 过 schema → 保留其 verdict/checklist/reviewerNotes → **覆盖 docHash 为真实值** + 规范化 reviewedFiles[0] 为契约路径 `changes/<change>/<mainDoc>` → 写 canonical run 目录 + marker + 自检过。
- **G-5**：非法 stage / changeName 空 / 主文档缺失 → `throw new Error('中文消息')`（对齐 CONVENTIONS 本地校验 throw 中文）。
- **G-6**：marker 已存在时 warn（不阻断），覆盖为最新 runId。
- **G-7**：不改动 `enforceReviewJsonGate` / `validateStageReview` / `getLatestStageReviewRunId` / `backfill-reviews` / `generateTaskReviewDrafts` 任何现有逻辑（纯新增导出函数 + 新增 CLI case）。

## 3. 非目标（Non-Goals）

- ❌ 不改 `enforceReviewJsonGate`（gates.js:112-133）加 resolveLatestExecuteRunId fallback——这是 2026-08-09 登记的独立 defer 项（marker 漂移致 task review.json 误报），由独立 quick 落，C1 不夹带。
- ❌ 不集成进 `execute --done` 自动补骨架（D-004：仅手动命令，不改 Stage Review Gate / complete.js 链路 / 不改 gate 语义）。
- ❌ 不动 task 级 `backfill-reviews` / `generateTaskReviewDrafts`（D-001：task 级已解决，C1 只补 stage 级）。
- ❌ 不改 agent 手算 docHash 的现有 enforcement（D-003：仅 scaffold 这条路径由 CLI 算 hash；agent 自己写 review.json 仍需算 hash，gate 仍重算比对）。
- ❌ 不做统一 `review scaffold` 命令覆盖两级（D-001：仅 stage 级）。
- ❌ 不引入 `needs_review` verdict（VALID_VERDICTS 只有 pass/fail/cannot_verify）。
- **不涉及生命周期契约**（本变更是 CLI 命令增量，无会话、租约、守护进程、心跳等生命周期事件或状态机变更）。

## 4. 总体方案

新增 `registerStageReview()` 导出函数入 `src/stage-review.js`（与 task 级 `generateTaskReviewDrafts` 居 task-review.js 对称），`src/index.js` 加 `case 'register-stage-review'` 薄包装（镜像 `case 'backfill-reviews'`）。

**复用（全部已就绪，零改动）**：

| 函数/常量 | 出处 | 用途 |
|---|---|---|
| `computeDocHash(filePath)` | stage-review.js:96 | 算主文档 sha256 hex |
| `generateStageReviewRunId()` | stage-review.js:233 | 生成 `review-<ts>` runId |
| `stageReviewMarkerPath(rt,stage,change)` | stage-review.js:250 | marker 路径 |
| `validateStageReviewSchema(review)` | stage-review.js:114 | --from adopt 时校验 agent 草稿 |
| `validateStageReview(opts)` | stage-review.js:340 | 写盘后自检（含 docHash 真实性） |
| `STAGE_REVIEW_TYPE` / `STAGE_MAIN_DOC` | stage-review.js:29-31 | stage→reviewType/mainDoc 映射 |
| `REVIEW_SCHEMA_VERSION` / `VALID_VERDICTS` | task-review.js:21,24（stage-review.js 已 import） | schemaVersion=1 / verdict 三态 |
| `resolveRuntimeRoot(platformOpts, specBase)` | run/shared.js:277 | runtimeRoot 解析（与 generateTaskReviewDrafts 同源） |

**路径解析**（镜像 generateTaskReviewDrafts:659-661）：
```
specBase   = platformOpts.specRoot || join(cwd, '.sillyspec')
runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
changeDir  = join(specBase, 'changes', changeName)
mainDocPath = join(changeDir, STAGE_MAIN_DOC[stage])
```

## 5. 接口定义

### 5.1 CLI

```
sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute>
                                [--from <review.json 路径>] [--spec-dir <path>] [--json]
```

- `--change`（必填）、`--stage`（必填，三选一，非法 → exit 2 + 用法提示）
- `--from <file>`（可选）：adopt agent 草稿
- `--spec-dir` / `--json`：透传，与 backfill-reviews 对称

成功输出（人类可读）：`✅ 已注册 <stage> stage review [runId] → <reviewPath>（mode: skeleton|adopted）；marker → <markerPath>；下一步：独立审查子代理对照 <mainDoc> 填 verdict/checklist 后重跑 --done`。

### 5.2 `registerStageReview()` 函数签名

```js
// src/stage-review.js 新增导出
export function registerStageReview({ changeName, stage, fromFile, cwd, platformOpts = {} })
// 返回: { ok, reviewRunId, reviewPath, markerPath, mode: 'skeleton'|'adopted', mainDoc, review }
// 失败: throw new Error('中文消息')
```

执行流程：
1. 校验 `stage ∈ {brainstorm,plan,execute}`、`changeName` 非空 → 否则 throw 中文。
2. `specBase = platformOpts.specRoot || join(cwd,'.sillyspec')`；`runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)`；`changeDir = join(specBase,'changes',changeName)`。
3. `reviewType = STAGE_REVIEW_TYPE[stage]`；`mainDoc = STAGE_MAIN_DOC[stage]`；`mainDocPath = join(changeDir, mainDoc)`。
4. 校验 `existsSync(mainDocPath)` → 缺则 throw 中文（主审查文档缺失，无法算 docHash）。
5. `docHash = computeDocHash(mainDocPath)`（sha256 hex；D-003）。
6. 构造 review 对象：
   - **--from 模式**：解析 fromFile 路径（`existsSync(fromFile)` 命中否则 `join(cwd, fromFile)` 兜底，都不在则 throw 中文）→ read+parse → `validateStageReviewSchema` 校验 → 不过则 throw 中文（带 errors）→ 保留 agent 的 specVerdict/qualityVerdict/checklist/reviewerNotes/requiredEvidence → 覆盖 `docHash = 步骤5值`、规范化 `reviewedFiles[0] = 'changes/<change>/<mainDoc>'`。
   - **骨架模式**：
     ```js
     { schemaVersion: REVIEW_SCHEMA_VERSION,
       reviewType,
       specVerdict: 'cannot_verify', qualityVerdict: 'cannot_verify',
       reviewedFiles: [`changes/${changeName}/${mainDoc}`],
       docHash,
       requiredEvidence: [`待独立审查子代理对照 ${mainDoc} 逐节核验（骨架由 register-stage-review 生成）`],
       reviewerNotes: '骨架由 register-stage-review 生成，verdict 待独立审查子代理填写' }
     ```
7. `reviewRunId = generateStageReviewRunId()`；`reviewDir = join(runtimeRoot,'stage-reviews',`${stage}-${reviewRunId}`)`。
8. `mkdirSync(reviewDir,{recursive:true})`；`writeFileSync(join(reviewDir,'review.json'), JSON.stringify(review,null,2) + '\n')`（trailing newline，与 marker 步骤9 口径一致）。
9. `markerPath = stageReviewMarkerPath(runtimeRoot, stage, changeName)`；若 `existsSync(markerPath)` → `console.warn` 提示已存在将被覆盖；`writeFileSync(markerPath, reviewRunId + '\n')`。
10. 自检：`validateStageReview({ stage, reviewType, runtimeRoot, reviewRunId, searchDirs:[specBase, changeDir, cwd], verifyDocHash:true })` → 不过则 throw 中文（fail-closed；理论上刚写不该不过，过不了说明路径/hash 解析有 bug）。
11. 返回 `{ ok:true, reviewRunId, reviewPath: join(reviewDir,'review.json'), markerPath, mode, mainDoc, review }`。

### 5.3 index.js case（镜像 backfill-reviews index.js:423-460）

```js
case 'register-stage-review': {
  const rsrChangeIdx = args.indexOf('--change');
  const rsrChange = rsrChangeIdx >= 0 && args[rsrChangeIdx + 1] ? args[rsrChangeIdx + 1] : null;
  const rsrStageIdx = args.indexOf('--stage');
  const rsrStage = rsrStageIdx >= 0 && args[rsrStageIdx + 1] ? args[rsrStageIdx + 1] : null;
  const rsrFromIdx = args.indexOf('--from');
  const rsrFrom = rsrFromIdx >= 0 && args[rsrFromIdx + 1] ? args[rsrFromIdx + 1] : null;
  if (!rsrChange || !rsrStage) {
    console.error('用法: sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute> [--from <review.json>] [--spec-dir <path>] [--json]\n  生成/adopt stage 级 review.json（docHash 自动算 + 写 marker），治 tier=independent marker 死锁');
    process.exit(2);
  }
  const { registerStageReview } = await import('./stage-review.js');
  const rsrPlatformOpts = {};
  if (specDir) rsrPlatformOpts.specRoot = specDir;
  try {
    const result = registerStageReview({ changeName: rsrChange, stage: rsrStage, fromFile: rsrFrom, cwd: dir, platformOpts: rsrPlatformOpts });
    if (json) {
      process.stdout.write(JSON.stringify({ ok: true, command: 'register-stage-review', ...result }));
    } else {
      console.log(`✅ 已注册 ${rsrStage} stage review [${result.reviewRunId}] → ${result.reviewPath}（mode: ${result.mode}）`);
      console.log(`   marker → ${result.markerPath}`);
      console.log(`   下一步：独立审查子代理对照 ${result.mainDoc} 填 verdict/checklist 后重跑 --done`);
    }
  } catch (e) {
    if (json) process.stdout.write(JSON.stringify({ ok: false, command: 'register-stage-review', error: e.message }));
    else console.error('❌ ' + e.message);
    process.exitCode = 1;
  }
  break;
}
```

## 6. 文件变更清单（File Changes）

| 文件 | 类型 | 改动 |
|---|---|---|
| `src/stage-review.js` | 修改 | ① fs import 加 `writeFileSync`（现有有 mkdirSync/readFileSync/existsSync/readdirSync）；② 加 `import { resolveRuntimeRoot } from './run/shared.js'`；③ 新增 `export function registerStageReview({...})`（~60 行，见 §5.2） |
| `src/index.js` | 修改 | 新增 `case 'register-stage-review'`（~30 行，见 §5.3）；命令帮助/列表文案登记（若有） |
| `test/stage-review-register.test.mjs` | 新增 | registerStageReview 单测（见 §7） |

**不改**：gates.js / complete.js / prompt.js / task-review.js / review-tier.js / backfill-reviews / 任何现有 stage-review.js 导出函数。

## 7. 测试策略

新增 `test/stage-review-register.test.mjs`（原生 node:test + node:assert/strict，tmpdir fixture，对齐现有 test/stage-review*.test.mjs 风格）：

1. **骨架模式字段全**：构造 specBase/changes/<change>/design.md fixture → 跑 registerStageReview(stage='brainstorm') → 读回 review.json → 断言 schemaVersion=1 / reviewType='design' / specVerdict='cannot_verify' / reviewedFiles[0]='changes/<change>/design.md' / requiredEvidence 非空。
2. **docHash 正确（G-2）**：断言 review.docHash === computeDocHash(mainDocPath)（手动重算比对）。
3. **marker 写盘（G-3）**：断言 marker 文件存在 + 内容 === reviewRunId + `/^review-/` 前缀 + getLatestStageReviewRunId 能读到同值。
4. **自检过（G-1）**：断言 validateStageReview（含 docHash 真实性）对该 review.json 返回 ok:true。
5. **--from adopt（G-4）**：写一份 agent 草稿（verdict=pass + checklist + **故意错的 docHash**）→ registerStageReview(--from) → 读回 → 断言 verdict/checklist 保留 + docHash 被修正为真实值 + reviewedFiles[0] 规范化。
6. **--from schema 不过 → throw**：草稿缺 schemaVersion → 断言 throw 中文。
7. **非法 stage → throw（G-5）**：stage='foobar' → throw 中文。
8. **changeName 空 → throw（G-5）**。
9. **主文档缺失 → throw（G-5）**：change 目录存在但无 design.md → throw 中文。
10. **marker 已存在 warn（G-6）**：预置旧 marker → 跑 → 断言新 marker 覆盖 + （warn 行为不抛错）。
11. **stage=plan/execute 映射**：plan→reviewType='plan'/mainDoc='plan.md'；execute→'acceptance'/'design.md'。

验收：`npm test` 全量 EXIT=0（含新文件）；`npm run lint` 绿（含 test/ 内容规则）。

## 8. 兼容性 / 回退路径

- **兼容性**：纯新增导出函数 + 新增 CLI case，不改任何现有导出/签名/调用点。现有 stage-review.js 函数（computeDocHash/validateStageReview/generateStageReviewRunId 等）签名不变。index.js 仅加一个 case 分支。
- **回退**：删除 `registerStageReview` 函数 + index.js case + test 文件即完全回退；无数据迁移、无 schema 变更、无进度库改动。
- **不改变的 API / 表结构**：review.json schema 不变（REVIEW_SCHEMA_VERSION 仍 1）；progress.db/sillyspec.db 表结构不变；marker 文件格式不变（沿用 stageReviewMarkerPath）。

## 9. 风险登记（Risk）

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | cannot_verify 骨架过 Stage Review Gate schema，被误用为绕过独立审查 | P2 | 明确是「待审占位」：reviewerNotes/requiredEvidence 标注骨架来源 + 下一步提示填 verdict。verdict 完整性靠 tier=independent 独立子代理流程（与现状一致——agent 今天也能手写 cannot_verify，gate schema 本就区分不了 honest/lazy，不引入新风险）。 |
| R-02 | --from adopt 覆盖 agent 的 docHash 可能掩盖 agent 未真正读文档 | P2 | adopt 后自检 validateStageReview 做 docHash 真实性校验（对刚算的真实 hash，必过）；agent 草稿的 verdict/checklist 完整性不在 CLI 职责（仍由独立子代理流程保证）。 |
| R-03 | 重复跑建多个 run 目录 + orphan | P2 | marker 已存在时 warn + 覆盖指向最新（与 execute run 同构，orphan review.json 无害）。 |
| R-04 | resolveRuntimeRoot/路径解析在 worktree/平台模式下解析到非预期位置 | P2 | 复用 generateTaskReviewDrafts 同源解析（specBase=specRoot||cwd/.sillyspec + resolveRuntimeRoot），已验证路径；execute 阶段测试覆盖平台模式（platformOpts.specRoot）。 |

## 10. 决策追踪（D-xxx@vN → 章节）

| 决策 | 类型 | 覆盖章节 | 状态 |
|---|---|---|---|
| D-001@v1 范围=仅 stage 级 | boundary | §3 非目标 / §4 / §6 | accepted |
| D-002@v1 命令名=register-stage-review | architecture | §5.1 | accepted |
| D-003@v1 scaffold 自动算 docHash（翻 P6.1b defer） | premise | §5.2 步骤5 / §1 | accepted |
| D-004@v1 仅手动触发 | boundary | §3 / §5 | accepted |
| D-005@v1 verdict 默认 cannot_verify（schema 强制） | code-forced | §5.2 骨架 | accepted |
| D-006@v1 --stage→reviewType/mainDoc 复用常量 | code-forced | §5.2 步骤3 | accepted |
| D-007@v1 保留 --from 模式 | accepted | §5.2 / §5.1 | accepted |
| D-008@v1 复用原料函数不另写字段表 | code-forced | §4 复用表 | accepted |
| D-009@v1 代码组织=方案B（函数入 stage-review.js） | architecture | §4 / §6 | accepted |

**仍未解决**：无。剩余风险见 R-01~R-04（均 P2，有应对）。

## 11. 自审（Self-Review）

- ✅ **章节齐全**：背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记/兼容性回退/决策追踪/自审 全在。
- ✅ **生命周期契约**：本变更无会话、租约、守护进程、心跳等生命周期事件，§3 已显式写「不涉及生命周期契约」豁免短语。
- ✅ **事前给==事后查**：registerStageReview 产出的骨架字段直接复用 validateStageReviewSchema 同源常量（REVIEW_SCHEMA_VERSION/VALID_VERDICTS/STAGE_REVIEW_TYPES），与 renderReviewJsonContract 原则一致 —— CLI 写的一定过 CLI 校验。
- ✅ **不改 gate 语义**：G-7 明确；纯新增，enforceReviewJsonGate/validateStageReview/backfill-reviews 零改动。
- ✅ **对称性**：与 task 级 generateTaskReviewDrafts+backfill-reviews 严格对称（函数居 review 模块 + CLI case 居 index.js + 路径解析同源）。
- ✅ **CONVENTIONS 遵守**：kebab-case 文件 / 命名导出 / 本地校验 throw 中文 / fs import 增量 / git 子进程无（本变更无 git 调用）。
- ⚠️ **自审存疑**：index.js 命令列表/帮助文案登记位置（是否有集中命令清单需同步）—— execute 阶段查 index.js 是否有命令注册表需补登。

## 12. Design Grill 结果（step7 交叉审查，tier=self 自审）

status: **passed**（3 交叉点全 immediately_answered，无 P0/P1 unresolved blocker）

| ID | 层级 | 交叉点 | 证据 A | 证据 B | 结论 | 决策 |
|---|---|---|---|---|---|---|
| X-001 | consistency | §5.3 index.js case 用 STAGE_MAIN_DOC 但只 import registerStageReview | §5.3 case 代码 | §5.2 import 清单 | conflict | 已修正：registerStageReview 返回带 mainDoc，index.js 用 result.mainDoc |
| X-002 | feasibility | §5.2 --from fromFile 路径解析未指定 | §5.2 步骤6 | （无） | gap | 已补：existsSync(fromFile) 否则 join(cwd,fromFile) 兜底 |
| X-003 | consistency | §5.2 步骤8 review.json 无 trailing newline，步骤9 marker 有 | §5.2 步骤8 | §5.2 步骤9 | minor conflict | 已补 + '\n' |

Question Distribution：immediately_answered=3，needs_thinking=0，unresolved=0。Unresolved Blockers：无。
