---
plan_level: full
author: qinyi
created_at: 2026-08-10 11:45:00
---

# 实现计划（Plan）— worktree-apply 抗脏（dirty 拦截时输出逐文件 rescue 指令）

## Spike 前置验证

无 Spike。方向 A（cp 指令）/ 实现 2（helper+字段）/ step3.5 前移 / dirtyFiles 口径 / 注释归因 均已在 design.md v2 决策（D-001..004@v1，Grill 独立审查两轮 PASS），技术路径确定。git apply --3way 对 dirty 树行为已实证（autocrlf on/off 对照），无未验证集成。

## 来源

- design.md v2（docHash `4bacac86...`，Grill review-2026-08-10-111056 PASS，14pass/2gap/0fail）
- decisions.md（D-001 方向A / D-002 实现2 / D-003 安全边界 / D-004 Grill 三项修正，全 accepted）
- requirements.md（FR-01..06 + 决策覆盖矩阵）
- tasks.md（5 任务骨架）
- 实证依据（autocrlf on/off 对照表，design §实证依据）

## 范围

触及 2 src + 1 新测试（design 文件变更清单）：
- `src/worktree-apply.js`（新增导出 `generateRescueCommands`；step3.5 前移 hashMismatch 计算；step2 收集 deletedFiles；step4.5/5a 拦截分支集成 rescue + 统一 dirtyFiles 口径；assessApplyRisk 透出；result 初始化加 rescueCommands:null；补正 step4.5 注释 :243-245 归因）
- `src/index.js`（`worktree apply` :732-737 / `worktree assess` :787-790 打印器补结构化 `Rescue commands (N safe / M excluded)` 段，rescueCommands 非空时触发）
- `test/worktree-apply-rescue.test.mjs`（新增，四分类 + P0 时序回归 + 前移等价 + dirtyFiles 口径 + 跨模式 deletedFiles + 零回归）

不在范围（design 非目标）：不放宽 step4.5/5a dirty 拦截；不加 CLI flag/子命令；不修 CRLF 根因；不改 apply patch/--3way/--merge 决策；不改 meta.json schema / DB / applyWorktree 签名。

## 模块影响

- **worktree**（src/worktree-apply.js）：核心改动模块。新增导出函数 + step 顺序调整（hashMismatch 前移，对调用方不可见）+ 拦截分支增强。模块文档 modules/worktree.md 需同步 applyWorktree 接口表（新增 rescueCommands 字段 + generateRescueCommands 导出）。
- **cli-entry**（src/index.js）：apply/assess 打印器补 rescue 段（additive，仅 rescueCommands 非空触发）。

## Tasks

### Wave 1（producer，无依赖）

- [x] task-01: 新增导出纯函数 `generateRescueCommands`（src/worktree-apply.js）——逐文件四分类（SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE）+ 路径正斜杠规范化 + 返回 {commands, warnings, cpFileCount, excludedCount}（覆盖：FR-02, D-003@v1）

### Wave 2（依赖 Wave 1，同文件串行）

- [x] task-02: step3.5 前移 hashMismatch 计算 + step2 收集 deletedFiles + 补正注释（src/worktree-apply.js）——把现 step5b（:290-310）getBlobHashMap 整块前移到 step3 allowSet 之后、step4.5 之前；原 step5b 改读前移结果；step2（:182-191）name-status 解析扩展判 D 收集 deletedFiles；补正 step4.5 注释 :243-245 归因（CRLF 副作用非 git 限制）（覆盖：FR-03, FR-06, D-004@v1①, R-03/R-07）

### Wave 3（依赖 Wave 1+2，同文件串行）

- [x] task-03: step4.5/5a 拦截分支 + assess 集成 rescue（src/worktree-apply.js）——step4.5（:260-272）/step5a（:282-287）拦截按统一口径算 dirtyFiles（tracked-modified∪untracked，对齐 filterDeliverableFiles 保留 .sillyspec/docs/）→ 调 generateRescueCommands（传前移 hashMismatchFiles + deletedFiles）→ 写 result.rescueCommands + 拼 result.errors；assessApplyRisk 透出 checkResult.rescueCommands；result 初始化（:151-159）加 rescueCommands:null（覆盖：FR-01, FR-04, D-002@v1, D-004@v1②, R-02）

### Wave 4（依赖 Wave 3，不同文件）

- [x] task-04: index.js apply/assess 打印器结构化 rescue 段（src/index.js）——apply（:732-737）/assess（:787-790）补 `Rescue commands (N safe / M excluded):` 打印（rescueCommands 非空时触发）；现有 errors/reasons 文本打印保留作主通道（覆盖：FR-05, D-004@v1③）

### Wave 5（依赖 Wave 1-4，回归收尾）

- [x] task-05: 测试 + 全量回归（test/worktree-apply-rescue.test.mjs）——generateRescueCommands 四分类纯函数单测 + 路径正斜杠断言 + dirtyFiles 口径（含 untracked + .sillyspec/docs/ 对齐 filterDeliverableFiles）+ **P0 时序回归（main 推进 fileA + fileB dirty → rescue 排除 fileA，锁死 step3.5 前移）** + step3.5 前移等价（checkOnly/real 两路径 hashMismatchFiles 不变）+ applyWorktree 拦截时 rescueCommands 非空 + assess 透出 + 未拦截 rescueCommands=null（零回归）+ deletedFiles 跨模式（native-worktree/in-place）name-status 实测；npm test 全量 EXIT=0 + npm run lint 绿（覆盖：FR-01..06 全, R-03/R-07, Grill requiredEvidence 三项）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 D/FR | 说明 |
|---|---|---|---|---|---|---|
| task-01 | generateRescueCommands 纯函数 | W1 | P0 | — | FR-02, D-003 | 纯函数四分类，无副作用无 git/fs 调用 |
| task-02 | step3.5 前移 + deletedFiles + 注释 | W2 | P0 | task-01 | FR-03, FR-06, D-004① | hashMismatch 前移到 step4.5 前（无 dirty 依赖安全前移） |
| task-03 | step4.5/5a/assess 集成 rescue | W3 | P0 | task-01,02 | FR-01, FR-04, D-002, D-004② | 统一 dirtyFiles 口径 + result.rescueCommands 字段 |
| task-04 | index.js 打印器 rescue 段 | W4 | P1 | task-03 | FR-05, D-004③ | additive，仅 rescueCommands 非空触发 |
| task-05 | 测试 + 全量回归 | W5 | P0 | task-01..04 | FR-01..06, R-03/R-07 | 含 P0 时序回归 + 前移等价 + 跨模式 + Grill requiredEvidence |

## 关键路径

```
task-01（generateRescueCommands 纯函数）
   └─→ task-02（step3.5 前移 + deletedFiles，同文件串行）
          └─→ task-03（step4.5/5a/assess 集成，依赖 01 helper + 02 前移结果）
                 └─→ task-04（index.js 打印器，不同文件，依赖 03 字段）
                        └─→ task-05（测试 + 回归，依赖全部）
```

task-01→02→03 同改 src/worktree-apply.js 严格串行；task-04 改 src/index.js 依赖 task-03 的 result.rescueCommands 字段存在；task-05 收尾。无 Spike（确定性 rescue 逻辑，无技术不确定性）。

## 全局验收标准

- [ ] **AC-1（R-03 P0 回归）**：main 已提交推进 fileA（HEAD:fileA ≠ baseHash:fileA）+ fileB 未提交 dirty 共触发 step4.5 拦截时，rescue 排除 fileA（EXCLUDE-MISMATCH），不输出 cp fileA（task-05 时序回归测试锁死，证明 step3.5 前移生效）
- [ ] **AC-2（fail-loud 不变量）**：step4.5/5a 拦截决策/ok=false/return 时机零改动；dirty∩changedFiles 与 --3way 真冲突仍被拦截（task-05 断言 + 现有 worktree-apply-uncommitted/baseline-clean 测试零回归）
- [ ] **AC-3（零回归）**：未触发 dirty 拦截时 `result.rescueCommands === null`，apply 行为 100% 不变（task-05 断言）
- [ ] **AC-4（四分类）**：generateRescueCommands 四分支输出正确——SAFE-CP 给 cp、EXCLUDE-DIRTY/MISMATCH 进 warnings 不给 cp、DELETE 给 rm；路径正斜杠无反斜杠（task-05 纯函数单测）
- [ ] **AC-5（assess 预览）**：assess（checkOnly）step4.5/5a 拦截时透出 rescueCommands，index.js assess 打印 rescue 段（task-05 + task-04）
- [ ] **AC-6（dirtyFiles 口径）**：rescue dirtyFiles = main 工作区 tracked-modified∪untracked（对齐 filterDeliverableFiles 保留 .sillyspec/docs/），覆盖 untracked 撞 cp 新建 + 模块文档 dirty 场景（task-05，Grill 残留 gap 闭环）
- [ ] **AC-7（注释归因）**：step4.5 注释 :243-245 补正为 CRLF 副作用（非 git 本质限制）+ 附 autocrlf on/off 实证（task-02）
- [ ] **AC-8（前移等价）**：step3.5 前移后 checkOnly + real apply 两路径 hashMismatchFiles 结果与 v1 step5b 原位等价（task-05，R-07）
- [ ] **AC-9（跨模式）**：deletedFiles 在 native-worktree / in-place-fallback 模式下 name-status 解析口径一致（task-05，Grill requiredEvidence ③）
- [ ] **AC-10**：`npm test` 全量 EXIT=0（含新 worktree-apply-rescue 套件 + 既有零回归）+ `npm run lint` 绿

## 覆盖矩阵（FR × Task × D）

| FR / D | 覆盖 Task | 验收证据 |
|---|---|---|
| FR-01（dirty 拦截触发 rescue） | task-03, task-05 | AC: applyWorktree 拦截时 rescueCommands 非空 + 拼进 errors |
| FR-02（逐文件四分类） | task-01, task-05 | AC: 四分支输出正确 + 路径正斜杠 |
| FR-03（hashMismatch 前移保 EXCLUDE-MISMATCH） | task-02, task-05 | AC-1: main 推进 fileA + fileB dirty → 排除 fileA |
| FR-04（assess 预览） | task-03, task-04, task-05 | AC-5: assess 透出 + 打印 |
| FR-05（rescue 可见性 errors 文本 + index.js） | task-04 | AC: apply/assess 打印 rescue 段 |
| FR-06（注释归因补正） | task-02 | AC-7: 注释改 CRLF 副作用 |
| D-001@v1（方向 A） | task-01..05 | AC: cp 指令旁路 git apply |
| D-002@v1（实现 2 helper+字段） | task-01, task-03 | AC: generateRescueCommands + result.rescueCommands |
| D-003@v1（安全边界） | task-01, task-05 | AC-4: 四分类排除 dirty/mismatch |
| D-004@v1（Grill 三项修正） | task-02, task-03, task-04 | AC-1/AC-6/AC-5: 前移 + 口径 + 可见性 |

## 调用点搜索

- `generateRescueCommands` 为新增导出，无外部调用点需改（仅 worktree-apply.js 内部 step4.5/5a + assessApplyRisk 调用）。
- `result.rescueCommands` 为 additive 字段，现有消费方（machine-interface / formatExecuteSummary）不读即不受影响；新增消费方 index.js apply/assess 打印器（task-04）。
- `applyWorktree` 签名不变，外部调用点（index.js :730/:802、assessApplyRisk :559、测试）零改动。
- step3.5 前移为内部顺序调整，applyWorktree 对外行为不变（hashMismatchFiles 结果等价，AC-8 锁死）。

## 文档同步（execute 后核实）

- `docs/sillyspec/file-lifecycle.md`：applyWorktree 返回值新增 rescueCommands 字段（additive，不新增运行时文件类型，预计仅接口表一行）。
- `.sillyspec/docs/sillyspec/modules/worktree.md`：applyWorktree 接口表加 rescueCommands 字段 + 新增 generateRescueCommands 导出行 + step3.5 前移说明 + 变更索引追加本变更。
- `docs/prompt/`：本变更不改 stage prompt 正文（rescue 是 worktree-apply.js 运行时逻辑，非 CLI→Agent 提示词），预计不动，execute 核实。
- `.claude/skills/`：若触及 apply/verify skill 的 worktree 说明则同步，预计不动。
