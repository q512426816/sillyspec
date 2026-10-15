---
author: flow-machine-draft
created_at: 2026-10-15T09:40:04.344Z
---
# 需求规格（Requirements）— 2026-10-15-plan-review-focus

## 功能需求

### FR-01: plan_level=light 与 full 的 plan.md 模板均含「Review Focus 盲区清单」节要求（≤5 条、按最可能坑到人排序、每条=输入/条件+合理人预期行为+承接 task 的 acceptance/测试落点；写不出显式写「已检查，无」而非留空）；plan_level=none 不含（轻量占位不加厚）

- 必须：`src/stages/plan.js` 生成分级计划步中，light 模板与 full 模板各自包含「Review Focus 盲区清单」节：列出**规格/设计隐含、但没有任何任务测试覆盖**的输入类别/失效模式，≤5 条、按最可能坑到人排序；每条 = 输入或条件 + 合理人预期行为 + 承接落点（拥有该代码的 task 的 acceptance/测试）；写不出时显式写「已检查，无」而非留空。
- 必须：`plan_level=none` 模板不含该节（占位计划不加厚）。
- 禁止：不因本节新增 plan-postcheck 硬门（在场性校验属后续机械面决策，本变更只落 prompt 与模板文本）。

#### 场景：light/full 模板含盲区清单节

- Given：`src/stages/plan.js` 的 light/full 模板文本
- When：检索 Review Focus 节
- Then：两模板各含节名、≤5 条与排序要求、承接落点要求、「已检查，无」出口

#### 场景：none 模板不加厚

- Given：`src/stages/plan.js` 的 none 模板文本
- When：检索 Review Focus
- Then：不命中（占位计划零新增节）

### FR-02: 生成分级计划步的约束含比例自检（计划产物与 spec/design 相称；implementation 塞整段可粘贴代码=转录不是计划，签名+测试断言+规格精确值承载决策）

- 必须：生成分级计划步的 light/full 约束列表新增比例自检条：计划产物（plan.md + TaskCard implementation）与 spec/design 相称；整段可粘贴代码体=转录不是计划，用签名、测试断言与规格精确值承载决策，为实现者保留判断空间。
- 禁止：不冲销既有约束（禁止估时/禁止泛泛风险分析/禁止 plan.md 放实现细节三条保留）。

#### 场景：比例自检条在场

- Given：生成分级计划步 prompt
- When：检索比例自检
- Then：含「转录不是计划」判据与「签名+测试断言+规格精确值」承载口径

#### 场景：既有约束不冲销

- Given：同一步 prompt
- When：逐项核对
- Then：禁止估时/禁止泛泛风险分析/禁止实现细节三条仍在场

### FR-03: 审查计划步 prompt 含补充复查三项：Review Focus 每行有承接测试、比例自检、共享面预扫留表（每对共享文件/契约链/依赖边的任务逐对核产出vs消费、每卡自洽；核验表进审查输出，无行的 clean 不算扫过）

- 必须：审查计划步 prompt 新增「补充复查」节，三项：
  1. Review Focus 复查——每行是否落到拥有该代码的 task 的 acceptance/测试；空节须是「已检查，无」而非跳过；
  2. 比例自检——同 FR-02 口径，审查者视角复核；
  3. 共享面预扫留表——每对共享 target_files/provides-expects_from 契约链/依赖边的任务逐对核「产出 vs 消费」、每张卡自洽（测试所指=代码所指、创建文件=后文触碰文件），核验表写进审查输出；"scan is clean" 而无表格行 = 没扫过。
- 禁止：不修改 `src/stage-review-checklist.js`（清单单一来源有快照测试与字面引用面，本变更绕开）。

#### 场景：补充复查三项在场

- Given：审查计划步 prompt
- When：检索补充复查节
- Then：三项逐条在场，含「无表格行的 clean 不算扫过」表述

#### 场景：清单单一来源不被触碰

- Given：本变更 diff 面
- When：检查改动文件
- Then：不修改 `src/stage-review-checklist.js`

### FR-04: docs/prompt/plan.md 派生件经提取管线同步（_extract→_sync→_verify 无新增 miss）

- 必须：改 `src/stages/plan.js` 后跑 `node docs/prompt/_extract.mjs` → `node docs/prompt/_sync.mjs` → `node docs/prompt/_verify.mjs`，plan 段派生件与本变更后的源码一致；_verify 对 plan 段不新增未逐字匹配项。

#### 场景：派生件一致

- Given：`docs/prompt/plan.md` 与 `docs/prompt/_extracted.json`
- When：`node docs/prompt/_verify.mjs`
- Then：plan 段无新增「未逐字匹配」项（存量 miss 项不计入）

### FR-05: 变更自身测试面跑绿，lint 通过

- 必须：新增 `test/plan-review-focus.test.mjs`，对 FR-01~FR-04 的产物面逐条断言（plan.js 文本分段 + 派生件一致性）。
- 必须：`npm run lint` 通过；既有相关测试（`test/plan-*.test.mjs`、`test/stage-review-checklist.test.mjs` 等）保持全绿。

#### 场景：新测试覆盖四条 FR

- Given：`test/plan-review-focus.test.mjs`
- When：`node --test` 运行
- Then：全部用例通过，且 FR-01~04 各至少一条断言

#### 场景：既有面零回归

- Given：当前仓库测试套件
- When：收口 CLI 亲测
- Then：无新增失败（`.sillyspec/known-failures.yaml` 既有失败不计入）

## 测试绑定（每条 FR 至少一行）

FR-01: test/plan-review-focus.test.mjs「FR-01 盲区清单节」
FR-02: test/plan-review-focus.test.mjs「FR-02 比例自检」
FR-03: test/plan-review-focus.test.mjs「FR-03 补充复查三项」
FR-04: test/plan-review-focus.test.mjs「FR-04 派生件一致」
FR-05: test/plan-review-focus.test.mjs「FR-01~04 全部用例 + 既有 plan 测试绿」
