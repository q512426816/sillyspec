---
scale: large
tier: independent
author: qinyi
created_at: 2026-08-10 11:09:44
---

# 设计文档（Design）— worktree-apply 抗脏（dirty 拦截时输出逐文件 rescue 指令）

> **v2（Design Grill 后修正）**：独立审查判 FAIL，三项修正——① hashMismatch 计算前移到 step4.5 之前（原 P0 时序缺口：step4.5 短路在 step5b 之前致 rescue 拿不到主干已推进文件 → cp 覆盖主干已提交改动）；② dirtyFiles 口径统一（tracked-modified + untracked，main 工作区完整未提交集）；③ 撤回"--json 自动可见"论断（worktree apply/assess 不经 machine-interface，无 --json），rescue 人类可见性走 errors 文本拼接 + index.js 打印器更新。详见 D-004@v1。

## 背景

`applyWorktree`（src/worktree-apply.js）将 worktree 变更 apply 回主工作区。当主仓有并发未提交 dirty 文件时（多 agent 仓库高频——他人会话正在编辑），step4.5（:242-273）+ step5a（:277-288）的 fail-loud 拦截会**整体阻断 apply**，只给出"请先 commit/stash"指引。

问题：这些 dirty 文件往往**不属于本次 apply**（他人会话的改动），agent 无法替他人 commit/stash，唯一出路是手动 `cp` worktree 文件到主仓。但现状不给任何 cp 线索——agent 必须盲猜该 cp 哪些文件、哪些安全、哪些会覆盖他人工作。memory 记录此痛点复发 3 次：
- `sillyspec-worktree-apply-blocked-by-staged-dirty`（他人 staged dirty 阻断我的 apply）
- `sillyspec-apply-gate-two-blockers`
- `sillyspec-worktree-patch-apply-conflict`（主干并行冲突）

## 设计目标

1. dirty 拦截触发时，CLI 输出**可执行的逐文件 rescue 指令**（cp/rm），让 agent 不必盲猜
2. **完整保留现有 fail-loud 安全边界**——step4.5/5a 拦截行为零改动，rescue 只是拦截时的增强提示 + 新 result 字段
3. rescue 指令只覆盖**安全子集**：自动排除会覆盖脏工作 / 丢主干已提交改动的文件，并给风险标注
4. assess（checkOnly）阶段也能预览 rescue 指令（agent 常先 assess 探路）

## 非目标

- **不放宽 step4.5/5a 的 dirty 拦截**（fail-loud 在 Windows/autocrlf 下有据，见风险登记 R-01 + 实证）
- **不新增 `--files`/`--rescue` CLI flag 或子命令**（任务卡定 print-only，rescue 指令嵌入 error message + result 字段）
- **不修 CRLF 根因**（`.gitattributes` 规范化是 troubleshooting.md「Edit CRLF 失配」方向 A 的更大工程，超出本变更范围；本变更只补正 step4.5 注释归因）
- 不改 apply 的 patch / --3way / --merge 决策路径
- 不自动执行 rescue cp（只输出指令，由 agent 决定执行）

## 拆分判断

单模块（worktree）聚焦改动，2 源文件（worktree-apply.js + index.js 打印器）+ 1 测试文件，无跨模块依赖，不走批量模式。虽文件数少，但触及 fail-loud 安全边界 + 需设计权衡（方向 A/B/C + 实现 1/2/3 + Grill 修正的 step 顺序），按用户裁决走完整流程（scale=large，tier=independent 独立审查安全边界）。

## 总体方案

**方向 A（cp 指令）+ 实现 2（helper + result 字段）**，用户已确认；**Grill 后追加 step 顺序修正（D-004@v1）**。

新增纯函数 `generateRescueCommands`，在 step4.5/5a dirty 拦截分支 + assess 三处调用，算出安全 cp 子集 + 逐文件指令 + 风险标注，写入 `result.rescueCommands`（additive 字段，供单测）并拼进 `result.errors`（人类可见主通道）。apply 决策路径（ok/return）零改动，fail-loud 完整保留。

### step 顺序修正（Grill P0 修复，D-004@v1）

**问题（Grill 发现）**：原 `result.hashMismatchFiles` 仅在 step5b（:290-310）填充，而 step4.5（:271）/step5a（:286）拦截 `if (!checkOnly) return result` 短路在 step5b 之前 → rescue 调用 `generateRescueCommands` 时 hashMismatchFiles 恒为 `[]` → EXCLUDE-MISMATCH 分类失效 → main 对 fileA 有已提交推进 + fileB 有 dirty 时，rescue 误把 fileA 判 SAFE-CP 输出 cp → agent 执行后回退他人已提交推进 = 数据丢失（R-03 本应防，但缓解因时序失效）。

**修复**：将 step5b 的 hashMismatch 计算（`getBlobHashMap(worktreePath, baseHash, targetFiles)` vs `getBlobHashMap(projectRoot, 'HEAD', targetFiles)`，仅依赖 baseHash/HEAD blob 对比、无 dirty 依赖）**整块前移到 step4.5 之前**（step3 allowSet 已知后，作为新 step3.5）。前移后：
- step4.5/5a 拦截时 rescue 能拿到完整 hashMismatchFiles → EXCLUDE-MISMATCH 生效 ✅
- 原 step5b 位置改为读前移结果（display 语义不变）✅
- checkOnly 路径（step4.5 不短路）：hashMismatch 已在更早算好 ✅
- real apply 路径（step4.5 短路）：hashMismatch 在短路前已算好 ✅
- targetFiles = `hasAllowList ? [...allowSet] : changedFiles`，allowSet（step3）/changedFiles（step2）均在前移点之前可得 ✅

### 逐文件分类算法

对每个 changedFile（filterDeliverableFiles 后），按优先级判定（hashMismatchFiles 由前移的 step3.5 提供）：

| 类别 | 判定 | 输出 |
|---|---|---|
| DELETE | ∈ deletedFiles（worktree 删除，git diff name-status D） | `rm "<projectRoot>/<f>"` |
| EXCLUDE-DIRTY | ∈ dirtyFiles（main 工作区未提交，见下方口径） | warnings：跳过 + 原因（cp 会覆盖未提交工作） |
| EXCLUDE-MISMATCH | ∈ hashMismatchFiles（主干已提交推进，step3.5 前移算） | warnings：跳过 + 引导先 commit dirty 再正常 apply 走 --3way 合并 |
| SAFE-CP | 其余（main 该文件干净） | `cp "<worktreePath>/<f>" "<projectRoot>/<f>"` |

路径正斜杠规范化（`\\` → `/`），Git Bash 兼容（agent 在 POSIX sh 执行 cp）。

**dirtyFiles 口径统一（Grill 修正）**：generateRescueCommands 的 dirtyFiles = **main 工作区所有未提交文件** = tracked-modified（`git diff --name-only HEAD`）∪ untracked（`git ls-files --others --exclude-standard`），排除 `.sillyspec/` 基础设施 + `meta.json`（与 changedFiles 同宇宙）。此为 rescue 用的统一口径——既覆盖 tracked 脏（step5a 口径）也覆盖 untracked 脏，避免 cp 新建文件撞他人 untracked。调用方（step4.5/5a 拦截分支）按此口径一次性算好传入。注意：step4.5 触发判定（:252-255）用的排除规则（.sillyspec/.claude/docs/CLAUDE.md）仅用于"是否触发拦截"，与 rescue 的 dirtyFiles 排除范围不同，二者不混用。

### 实证依据（direction A 选型根基）

| 测试（隔离 dirty 变量） | 结果 |
|---|---|
| `git apply --3way` 脏树 + 不重叠 patch（autocrlf **off**） | ✅ "Applied cleanly" |
| `git apply --3way` 脏树 + 不重叠 patch（autocrlf **on**，Windows 默认） | ❌ "does not match index" |
| 纯 `git apply`（无 --3way）脏树 + 不重叠 | ✅ 成功 |

结论：step4.5 注释 :243-245 称"git --3way 对 dirty 树不稳哪怕不重叠"实为 **Windows/autocrlf 的 CRLF 副作用**，非 git 本质限制。但仓库 CRLF 混用 + 规则 13 要求 Windows 兼容 → fail-loud 在 Windows 仍有据，**不放宽**。方案 A（旁路 git apply 的 cp）对 CRLF/--3way 怪癖全免疫，故选 A。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/worktree-apply.js | ① 新增导出 `generateRescueCommands` 纯函数；② **step3.5（新增，前移）**：把现 step5b（:290-310）的 hashMismatch 计算（getBlobHashMap worktreePath/baseHash vs projectRoot/HEAD）整块前移到 step3 allowSet 之后、step4.5 之前，结果写 `result.hashMismatchFiles`；原 step5b 位置删重复计算（display 读前移结果）；③ step2（:182-191）解析 name-status 时额外收集 `deletedFiles` 集合（现 statusFiles 合并丢 D 状态）；④ step4.5 拦截分支（:260-272）：按统一口径算 dirtyFiles（tracked-modified∪untracked，排 .sillyspec/+meta.json）→ 调 helper（传 hashMismatchFiles 前移结果）→ 写 `result.rescueCommands` + 拼 `result.errors`；⑤ step5a 拦截分支（:282-287）同；⑥ `assessApplyRisk` 透出 `checkResult.rescueCommands` 到 assess 返回值；⑦ result 初始化（:151-159）加 `rescueCommands:null`；⑧ 补正 step4.5 注释 :243-245 归因（CRLF 副作用非 git 限制，附 autocrlf on/off 实证） |
| 修改 | src/index.js | `worktree apply`（:732-737）+ `worktree assess`（:787-790）打印器：现有 `for (err of result.errors) console.error(err)` / `assessment.reasons` 已会打印拼进 errors 文本的 rescue 块（多行缩进可读）；补：若 `result.rescueCommands`/`assessment.rescueCommands` 非空，额外打印结构化 `Rescue commands (N safe / M excluded):` 段（人类可读强化，非必需但提升 UX）。**Grill 修正**：原 design 误称"machine-interface --json 自动可见"——worktree apply/assess 不经 machine-interface，须显式在 index.js 打印器输出 rescue |
| 新增 | test/worktree-apply-rescue.test.mjs | `generateRescueCommands` 纯函数四类分类单测（SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE）+ 路径正斜杠规范化断言 + dirtyFiles 口径（tracked+untracked）+ **P0 时序回归：main 已提交推进 fileA + fileB dirty → applyWorktree 拦截时 rescueCommands 排除 fileA（验证 hashMismatch 前移生效）** + assess 透出 rescueCommands + 未触发拦截时 rescueCommands=null（零回归） |

## 字段数据流标注

`result.rescueCommands` 新增字段（Grill 修正后无 dormant）。数据流（非 bullet，避免 parseFileChangeList 误解析为文件清单）：

producer 为 `generateRescueCommands`（worktree-apply.js，算 commands/warnings/cpFileCount/excludedCount），写入 `applyWorktree` 的 `result.rescueCommands`（step4.5/5a 拦截分支赋值；依赖前移的 hashMismatchFiles，见 step3.5）。

消费方有三：其一是人类可见主通道，拼进 `result.errors` 文本，经 index.js 的 worktree apply（:734）`for(err of result.errors) console.error` 打印，assess 路径经 assessApplyRisk 并入 reasons（:563）再由 index.js worktree assess（:790）打印（Grill 实证 src/index.js:722-817）。其二是 index.js apply/assess 打印器读结构化字段打印 Rescue commands 段（本变更新增，强化 UX）。其三是纯函数单测断言（test/worktree-apply-rescue.test.mjs）。

撤回原"--json 自动可见"论断：worktree apply/assess 不经 machine-interface.js、无 --json envelope（Grill 实证）。结构化字段不服务 --json。无序列化 dormant（字段在内存 result 对象直传 + errors 文本 + 打印器，三路均有真实消费方）。

## 接口定义

### generateRescueCommands（新增导出纯函数）

```js
/**
 * dirty 拦截触发时生成「逐文件 rescue 指令」——旁路 git apply 的安全逃生通道。
 *
 * @param {object} args
 * @param {string[]} args.changedFiles        filterDeliverableFiles 后的实际变更路径
 * @param {Set<string>|string[]} args.dirtyFiles   main 工作区未提交文件集（统一口径：tracked-modified ∪ untracked，排 .sillyspec/+meta.json）
 * @param {string[]} args.hashMismatchFiles   主干已提交推进文件（step3.5 前移算，依赖 baseHash/HEAD blob 对比）
 * @param {string[]} [args.deletedFiles=[]]   worktree 删除文件（git diff name-status D）
 * @param {string} args.worktreePath
 * @param {string} args.projectRoot
 * @returns {{
 *   commands: string[],      // 可复制粘贴 shell 命令（cp/rm），正斜杠路径
 *   warnings: string[],      // 被排除文件（dirty/mismatch）的风险标注
 *   cpFileCount: number,     // SAFE-CP 文件数
 *   excludedCount: number    // EXCLUDE-DIRTY + EXCLUDE-MISMATCH 数
 * }}
 */
export function generateRescueCommands({ changedFiles, dirtyFiles, hashMismatchFiles, deletedFiles = [], worktreePath, projectRoot }) { ... }
```

### result.rescueCommands（applyWorktree 返回值新增 additive 字段）

```js
result.rescueCommands = null;
// dirty 拦截触发时填充：
// { commands: ["cp ...", "rm ..."], warnings: ["跳过 X：..."], cpFileCount: N, excludedCount: M }
```

### applyWorktree 签名不变

`applyWorktree(changeName, { cwd, checkOnly, merge })` —— 不新增参数，仅返回值多一个可空字段 + 内部 step 顺序调整（hashMismatch 前移，对调用方不可见）。

## 生命周期契约表

不涉及生命周期契约（本变更不触及 session/lease/agent_run/daemon/lifecycle/state_transition/claim/heartbeat，仅 worktree 文件 apply 的 rescue 指令生成与 result 字段增强）。

## 兼容策略（brownfield）

- **未触发 dirty 拦截时**：`result.rescueCommands` 恒为 null，error message 不变，apply 行为 100% 不变（零回归）
- **hashMismatch 前移（step3.5）语义不变**：step5b 原 display 行为（hashMismatchFiles 记录、不拦截交 --3way）完全保留，仅计算位置提前；对 checkOnly/real apply 两条路径的 hashMismatchFiles 结果无差异
- **`result.rescueCommands` 是 additive 字段**：现有消费方不读它即不受影响
- **step4.5/5a 拦截决策不变**：仍 `if (!checkOnly) return result`（ok=false），rescueCommands 只是附加信息
- **不改任何 API / 表结构 / meta.json schema / applyWorktree 签名**
- **回退路径**：若 rescue 逻辑有 bug，删 `generateRescueCommands` 调用 + 字段 + step3.5 前移（还原 step5b）即完全回退到现状（additive + 顺序调整均可逆，无副作用）

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 误以为 step4.5 fail-loud 可放宽（"git --3way 对 dirty 树不稳是 git 本质限制"）→ 错误放宽安全边界 | P0 | 实证已驳斥归因：autocrlf off 时 --3way 在不重叠 dirty 树 Applied cleanly；不稳是 Windows/autocrlf CRLF 副作用。但仓库 CRLF 混用 + 规则 13 要求 Windows 兼容，fail-loud 在 Windows 仍有据——本变更**不放宽**拦截，只补正注释归因 |
| R-02 | rescue cp 覆盖 main 未提交工作（EXCLUDE-DIRTY 漏判） | P0 | `generateRescueCommands` 严格排除 dirtyFiles（统一口径 tracked-modified∪untracked，含 untracked 防 cp 新建撞他人 untracked）；纯函数单测覆盖 EXCLUDE-DIRTY 分支；cpFileCount + excludedCount 供 agent 校验 |
| R-03 | rescue cp 覆盖主干已提交推进文件（EXCLUDE-MISMATCH 漏判）→ 丢主干改动 | P0 | **Grill P0 修复**：hashMismatch 计算前移到 step3.5（step4.5 之前），rescue 拿到完整 hashMismatchFiles；严格排除 + warnings 引导先 commit dirty 再正常 apply 走 --3way 合并；**专项回归测试**（main 推进 fileA + fileB dirty → rescue 排除 fileA）锁死前移生效 |
| R-04 | deletedFiles 检测遗漏（step2 name-status 解析合并丢 D 状态）→ 删除文件无 rm 指令 | P1 | step2 扩展收集 deletedFiles；单测覆盖 DELETE 分支；rm 指令保守（agent 自行确认 main 版本） |
| R-05 | rescue 路径含反斜杠（Windows path.join）→ Git Bash cp 失败 | P1 | 路径正斜杠规范化（`replace(/\\/g, '/')`）；单测断言 commands 路径无反斜杠 |
| R-06 | rescue 让 agent 习惯性绕过正常 apply → 滞留 worktree / meta 不一致 | P2 | error message 明确"rescue 是旁路，cp 后需手动 `sillyspec worktree cleanup`"；不自动 cleanup（agent 决定） |
| R-07 | hashMismatch 前移（step3.5）引入回归——前移点 targetFiles/allowSet 依赖时序错 | P1 | targetFiles = `hasAllowList ? [...allowSet] : changedFiles`，allowSet（step3）/changedFiles（step2）均在前移点之前已算；回归测试覆盖 checkOnly + real apply 两路径 hashMismatchFiles 结果不变 |

## 决策追踪

| 决策 ID | 问题 | 答案 | 覆盖 |
|---|---|---|---|
| D-001@v1 | 抗脏方向：cp 指令(A) / --files 子集(B) / 放宽 --3way(C) | A（cp 指令）—— 旁路 git apply 对 CRLF/--3way 怪癖全免疫，零风险 fail-loud；B 需放宽 step4.5 触碰安全边界且 Windows 下丢 --3way 合并；C 破坏 fail-loud 否决 | autocrlf on/off 实证 + 用户确认；§总体方案、§非目标、§实证依据 |
| D-002@v1 | 实现层：轻量内联(1) / helper+result字段(2) / --rescue flag(3) | 2（helper + result.rescueCommands）—— assess 也能看 rescue（经 errors→reasons 文本）、纯函数可测、符现有代码风格；1 assess 看不到；3 超 print-only 范围否决。**注**：原 "--json 可读" 论据被 D-004@v1 撤回（worktree apply/assess 无 --json） | 用户确认；§总体方案、§接口定义；rationale 修正见 D-004@v1 |
| D-003@v1 | rescue cp 子集安全边界 | 排除 dirty∩changed（R-02，统一含 untracked 口径）+ hashMismatchFiles（R-03，依赖 D-004 前移），二者给 warnings；untracked/modified-tracked 干净子集给 cp；deleted 给 rm | §总体方案逐文件分类、§风险登记 R-02/R-03/R-04 |
| D-004@v1 | **Grill 修正**：① hashMismatch 时序缺口（step4.5 短路在 step5b 前 → EXCLUDE-MISMATCH 失效 → cp 覆盖主干已提交推进）② dirtyFiles 口径不一致（step4.5/5a/display 三套）③ "--json 自动可见"论断错误（worktree apply/assess 不经 machine-interface） | ① hashMismatch 计算前移到 step3.5（step4.5 前，无 dirty 依赖安全前移）+ 专项回归测试；② rescue 用统一口径（tracked-modified∪untracked 排 .sillyspec/+meta.json）；③ 撤回 --json 论断，rescue 人类可见性走 errors 文本拼接（index.js 现有打印器已输出）+ 补 index.js 结构化打印段 | Design Grill 独立审查（review-2026-08-10-111056）FAIL 三项；§总体方案 step 顺序修正、§逐文件分类 dirtyFiles 口径、§字段数据流标注、§文件变更清单 index.js、§风险登记 R-03/R-07、decisions.md D-004@v1 |

## 自审（v2，Grill 后）

- [x] 必填章节齐全（背景 / 设计目标 / 非目标 / 总体方案 / 文件变更清单 / 接口定义 / 兼容策略 / 风险登记 / 决策追踪 / 自审）
- [x] 文件变更清单含字段数据流标注（result.rescueCommands producer → 3 真实 consumer：errors 文本主通道 / index.js 结构化打印 / 单测；撤回虚假 --json consumer，无 dormant）
- [x] 无生命周期关键词触发（已显式声明「不涉及生命周期契约」专节）
- [x] 决策追踪 D-001/002/003/004 均被§章节覆盖，无未解决决策（Grill 三项 FAIL 全部由 D-004@v1 覆盖修复）
- [x] 兼容策略：additive 字段 + 拦截决策不变 + hashMismatch 前移语义不变 + 可完全回退
- [x] fail-loud 不变量明确（R-01 + §非目标 + §兼容策略三处约束）
- [x] 接口定义含 generateRescueCommands 签名（dirtyFiles/hashMismatchFiles 口径写清）+ result.rescueCommands schema + applyWorktree 签名不变声明
- [x] 实证依据落地（autocrlf on/off 对照表，非口头结论）
- [x] **Grill P0 已修**：hashMismatch 时序缺口由 step3.5 前移解决（v1 自审漏标，v2 补 + 专项回归测试 R-03）
- [x] **Grill 口径已统一**：dirtyFiles 三套口径收敛为 rescue 统一口径（tracked+untracked）
- [x] **Grill --json 论断已撤回**：visibility 改 errors 文本 + index.js 打印器（v1 误称 machine-interface 自动可见，已实证 src/index.js:722-817 不经 machine-interface）
- ⚠️ 自审存疑（v1 遗留）：deletedFiles 在 step2 收集后，需确认 native-worktree / in-place 模式下 name-status 解析口径一致（execute 阶段实测验证；现状 step2 已用 name-status，扩展低风险）
