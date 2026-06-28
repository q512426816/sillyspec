---
author: qinyi
created_at: 2026-06-28T15:57:22
---

# Design: Worktree 依赖供给（Dependency Provision）+ 验证硬门

> 变更：`2026-06-28-worktree-deps-provision`
> 项目：sillyspec（工具自身）
> 阶段：brainstorm → design

## 1. 背景

执行 `sillyhub` 变更时，agent 在 `sillyhub-daemon` worktree 内因没有 `node_modules`，无法跑 `tsc --noEmit` / 单测，P0 复杂改动（R-02 partial 分桶）差点靠代码审查蒙混声称 verified。

根因在 sillyspec 自身的 worktree 生命周期：`src/worktree.js` 的 `WorktreeManager.create()` 做了大量自动化（git worktree add、fetch+ff-merge、dirty baseline overlay、baseline checkpoint commit），但**完全不碰依赖**——`node_modules` 是 gitignore 的，`_overlayBaseline`（`worktree.js:825`）只同步 tracked+untracked 源文件，依赖永远不会进 worktree。结果：worktree 有了源码却跑不了构建/测试，验证链路从源头断裂。

这不是偶发：每个新 checkout 的 worktree 都会重复卡这一下。

## 2. 设计目标

1. **worktree 创建即可构建/测试**：依赖随 worktree 生命周期自动供给，无需人工 install。
2. **验证能力不可伪造**：依赖未就绪时，execute 不得声明 task 完成；"不能装作 verified" 必须由代码级硬门保证，而非 prompt 约束。
3. **多语言友好**：复用已有 `local.yaml` 的 `project.type` 探测，不写死 Node/pnpm。
4. **零成本快路径**：Node 项目在锁文件一致时用 junction/symlink 复用主 checkout 依赖，瞬时零网络。
5. **失败安全**：供给可失败，但失败状态可观测、可重试（doctor），且自动触发验证降级/阻断。

## 3. 非目标

- **不做** 跨语言依赖管理引擎（conda/cargo/gomod 等只走最简兜底，不过度投入）。
- **不做** monorepo 拓扑编排（仅在 worktree 根安装，依赖 pnpm/npm workspaces 自身处理子包）。
- **不做** verify 阶段的 deps 门（`WORKTREE_STAGES=['execute']`，verify 在主工作区跑，已有 node_modules）。
- **不做** 新的用户级 `provision` 子命令（YAGNI；doctor `--fix` 复跑供给已够）。
- **不改变** 现有 git worktree 隔离机制、baseline overlay、apply 回写流程。

## 4. 拆分判断

单一内聚变更，不拆分、不走批量模式。各部分强耦合：硬门依赖 `meta.depsStatus`、供给写 `depsStatus`、doctor 校验 `depsStatus`、入口自检重写 `depsStatus`——必须同变更交付才有意义。内部交付顺序（硬门优先）留给 plan 阶段用 Wave 排序处理，不影响变更粒度。

## 5. 总体方案

选定**方案 A：创建时供给 + completeStep 硬门**（见 decisions.md D-005）。分四个 Phase：

### Phase 1 — 依赖供给引擎（新增 `src/worktree-deps.js`）

独立的供给模块（从 `worktree.js` 拆出，便于单测）。核心函数：

```
provisionDeps(worktreePath, mainCwd, opts) -> {
  depsStatus, depsMethod, depsSource, depsLockHash, depsCheckedAt, depsError?
}
```

流程：
1. **解析 install 命令**：`local.yaml commands.install` 优先；否则按 `project.type` + lockfile 推断（见 §6 接口定义）。
2. **无可执行 install**（`generic` 类型，或无 lockfile 且无 `commands.install`）→ `depsStatus='n/a'`，返回。
3. **快路径**：`mainCwd/node_modules` 存在 **且** `lockfileHash(main)==lockfileHash(worktree)` → junction（Win）/ symlink（POSIX）`worktree/node_modules → main/node_modules` → `depsStatus='linked'`。
4. **兜底**：执行 install 命令（超时上限 300s）→ 成功 `'installed'`，失败 `'failed'`+`depsError`。
5. junction 失败（跨盘符/权限）回退 install。

`WorktreeManager.create()` 在 baseline overlay（5.6 步，`worktree.js:318`）之后、meta.json 写入之前调用 `provisionDeps`，结果合并进 meta。**install/junction 失败不阻断 create**——只记 meta。

### Phase 2 — meta.json + local.yaml schema 扩展

meta.json 增量字段（向后兼容；旧 meta 缺这些字段时由 Phase 4 入口自检触发供给）：

```
depsStatus:   linked | installed | n/a | failed | missing | stale
depsMethod:   junction | symlink | install | null
depsSource:   main-checkout | install | null
depsLockHash: <sha256 前 16 位>
depsCheckedAt:<ISO8601>
depsError:    <string?>（仅 failed）
```

local.yaml `commands` 段扩展（均可选，缺省推断）：
```yaml
commands:
  install: "pnpm install --frozen-lockfile"
  typecheck: "pnpm tsc --noEmit"
```

### Phase 3 — 验证硬门（`src/run.js` completeStep execute 分支）

**粒度说明（Design Grill X-1）**：execute 步骤由 `buildExecuteSteps`(execute.js:592) 按 **Wave** 生成（`Wave N 执行`），`completeStep` 的 `--done` 是 **per-wave** 触发。因此 deps 门作用于 wave 步骤级；`no_deps_verify`（task-NN.md frontmatter）是 per-task，**仅当当前 wave 内所有 task 都声明 `no_deps_verify: true` 时该 wave 才跳门**。非 wave 步骤（`确认执行范围` 前缀、acceptance、suffix）：门照常触发（前缀步骤 fail-fast——编码开始前就要求 deps 就绪；acceptance 是整体验证，无 per-task opt-out）。

在标记 step done **之前**插入（复用 `progress.js:41` 已有的 `blocked` status，见 D-001），与 `requiresWait`（`run.js` ~2196）/ scan postcheck（`run.js:2942`）同范式：

```
if (stageName === 'execute') {
  const meta = new WorktreeManager({cwd}).getMeta(changeName)
  // 当前 wave 是否整体 opt-out：读 plan.md 取该 wave 的 tasks，逐个读 task-NN.md
  // frontmatter，全部 no_deps_verify===true 才跳门（非 wave 步骤恒不跳）
  const waveAllOptOut = isCurrentWaveAllNoDepsVerify(step, changeDir)
  const okStatus = ['linked', 'installed', 'n/a']
  if (!waveAllOptOut && !okStatus.includes(meta?.depsStatus)) {
    step.status = 'blocked'
    console.error(`❌ 拒绝 --done: depsStatus=${meta?.depsStatus}, 依赖未就绪`)
    console.error(`   修复: sillyspec worktree doctor --fix  或在 worktree 内手动 install`)
    process.exit(1)
  }
}
```

门是 `process.exit(1)` 硬拒，覆盖所有 `--done` 路径，无法被 agent 绕过。`isCurrentWaveAllNoDepsVerify` 从 step 名解析 wave 序号 → 读 plan.md 对应 wave 的 task 列表 → 读各 task-NN.md frontmatter（execute 已有解析 allowed_paths 的先例，可复用）。

**定义（X-4）**：本门只保证"依赖就位"（depsStatus），**不执行也不校验** typecheck/test 命令是否真跑过。`commands.typecheck`/`test`/`lint`/`build` 一致地作为 execute prompt 的 agent 指引，命令是否实际执行由现有 execute/verify 流程保证，不在本门职责内。

### Phase 4 — execute 入口自检 + worktree doctor

**入口自检**（handle 已存在 worktree，因 `create()` 对已存在 worktree short-circuit `worktree.js:208` 不供给——见 D-002）。execute 进入时对当前 change 的 worktree：

- meta 缺 `depsStatus` → 触发 `provisionDeps` 补全
- `worktree/node_modules` 不存在但 meta 说 linked/installed → 标 `missing` → 重供给
- `lockfileHash(worktree) != meta.depsLockHash` → 标 `stale` → 重供给

重供给后更新 meta，再交 Phase 3 的门判定。

**worktree doctor**（`worktree.js:642 doctor()`）新增三类，`--fix` 调 `provisionDeps` 重跑：
- `deps-missing`：meta linked/installed 但 `node_modules` 不在
- `deps-stale`：lockfile hash 变化
- `deps-failed`：上次 provision failed，可重试

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | `src/worktree-deps.js` | `provisionDeps()` + `lockfileHash()` + install/junction 推断 + install 命令解析 |
| 修改 | `src/worktree.js` | `create()` 在 baseline overlay 后调 `provisionDeps` 合并 meta；`doctor()` 加 deps-missing/stale/failed 三类检查 + `--fix` 重供给 |
| 修改 | `src/run.js` | `completeStep` execute 分支加 deps 硬门（blocked + exit 1）；execute 入口（`runStage` execute 分支）加 deps 自检 |
| 修改 | `src/stages/execute.js` | execute prompt 注入 depsStatus 上限提示；读取 task card 的 `no_deps_verify` frontmatter |
| 修改 | `src/index.js` | `worktree doctor` 输出渲染 deps 检查项 |
| 修改 | `src/scan-postcheck.js` | local.yaml 解析识别 `commands.install`/`typecheck`，但**不**对它们做 npm-script 校验（直接 PM 调用，非 `npm run`；X-3）——仅 test/lint/build 走现有 package.json scripts 校验 |
| 修改 | `.sillyspec/docs/sillyspec/modules/worktree.md` | 修路径/分支前缀脱节 + 补 `provisionDeps` 接口与 deps meta 字段 |
| 修改 | `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | 注册 worktree 模块（当前缺失） |
| 修改 | `docs/sillyspec/file-lifecycle/worktree-and-guard.md` | 补 deps provision 阶段 + meta 字段（CLAUDE.md 文档同步要求） |
| 新增 | `test/worktree-deps-provision.test.mjs` | 供给快路径/兜底、门拒绝、no_deps_verify 跳门、doctor 重供给 |

## 7. 接口定义

### `provisionDeps(worktreePath, mainCwd, opts)` — `src/worktree-deps.js`

```
/**
 * @param {string} worktreePath - worktree 根目录（已 ff-merge + baseline overlay）
 * @param {string} mainCwd      - 主 checkout 根目录（node_modules 来源）
 * @param {{ specBase?: string, localYaml?: object, timeout?: number }} opts
 * @returns {{ depsStatus, depsMethod, depsSource, depsLockHash, depsCheckedAt, depsError? }}
 */
```

### `lockfileHash(dir)` — `src/worktree-deps.js`

```
/**
 * 取 dir 下首个命中的锁文件（pnpm-lock.yaml / package-lock.json / yarn.lock）
 * 的 sha256 前 16 位；无锁文件则 hash package.json；都没有返回 null。
 */
```

### install 命令推断规则（无 `commands.install` 时）

| project.type | 命中 | 默认 install 命令 |
|---|---|---|
| nodejs | pnpm-lock.yaml | `pnpm install --frozen-lockfile` |
| nodejs | package-lock.json | `npm ci` |
| nodejs | yarn.lock | `yarn install --frozen-lockfile` |
| nodejs | 无 lockfile（仅 package.json） | `npm install`（非 frozen，Design Grill X-2） |
| maven | pom.xml | `mvn -o test`（离线命中本地缓存；失败回退 `mvn test`） |
| gradle | build.gradle(.kts) | `./gradlew test` |
| generic | — | 无（`depsStatus='n/a'`） |

### depsStatus 状态机

```
                   provisionDeps
  (create/entry) ─────────────────►  linked  ──┐
                                      installed │
                                      n/a       │  (门放行)
              ┌─────────────────────────────────┤
              ▼                                 │
            failed ──(doctor --fix / 重供给)──► linked/installed
              │
              └─ (门拒绝 --done, step=blocked)

  missing: 入口自检发现 node_modules 被清（曾 linked/installed）
  stale:   入口自检发现 lockfile hash 变化
  （missing/stale 触发重供给 → 回到 linked/installed/failed）
```

## 7.5 生命周期契约表

本变更涉及 `lifecycle` / `state transition` / `complete` 关键词（worktree 生命周期、depsStatus 状态机、completeStep），按规则登记：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| create worktree | runStage(execute) | WorktreeManager.create | changeName, base | (无) → worktree 存在 |
| provision deps | create / 入口自检 | provisionDeps | worktreePath, mainCwd | (无) → linked/installed/n/a/failed |
| entry self-check | runStage(execute) | provisionDeps | changeName | missing/stale → 重供给 |
| complete step (--done) | agent | completeStep | output, changeName | pending → completed（deps 就绪） |
| block step | completeStep | progress | changeName, stepIdx | pending → **blocked**（deps 未就绪） |
| doctor fix | `worktree doctor --fix` | provisionDeps | changeName | failed/missing/stale → 重供给 |

## 8. 数据模型

无 DB schema 变更。`sillyspec.db` 的 `changes` 表已有 `no_worktree` 列（`db.js:99`），不新增列。deps 状态存于 worktree 的 `meta.json`（文件态，非 DB）。

## 9. 兼容策略（brownfield）

- **未配置新功能时行为不变**：无 `commands.install` 的项目走推断；`generic` 类型自动 `n/a`，门跳过——与改造前等价。
- **旧 worktree（meta 无 depsStatus）**：`create()` short-circuit 不重供给，由 execute **入口自检**触发 `provisionDeps` 补全（D-002）。即旧 worktree 首次 execute 会按需供给，不破坏现有流程。
- **不改变的 API/表结构**：`changes` 表、progress step 状态集合（`blocked` 已存在于 `VALID_STATUSES`）、worktree apply/cleanup 流程均不变。
- **回退路径**：junction 失败 → install；install 超时/失败 → `depsStatus=failed` + 门阻断（不删 worktree，doctor 可重试）。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | Windows junction 要求同盘符，跨盘符失败 | P1 | junction 失败自动回退 install；`depsMethod` 记录实际机制 |
| R-02 | monorepo native 模块 junction 后行为不一致 | P1 | tsc 场景只读类型定义，安全；单测需 native 时回退 install（lockfile 变更触发） |
| R-03 | install 超时/网络失败卡住 create | P1 | 300s 超时上限；失败记 `depsStatus=failed`，不阻断 create，门阻断 execute |
| R-04 | `--frozen-lockfile` 在 task 改了 package.json 时失败 | P2 | 这是期望行为（强制 lockfile 同步进变更）；lockfile 变更会触发 install 而非 junction |
| R-05 | 旧 worktree 入口自检误判 stale（ff-merge 改了 lockfile） | P2 | stale 是正确信号——确实该重供给；自检幂等 |
| R-06 | `no_deps_verify` 被滥用绕门 | P2 | frontmatter 由 plan 阶段生成，execute prompt 提示谨慎使用；可加 postcheck 统计告警 |
| R-07 | nodejs 无 lockfile 时 frozen/ci 命令失败 | P2 | 推断表兜底非 frozen `npm install`（X-2）；sillyspec 自身有 package-lock.json 不受影响 |

## 11. 决策追踪

当前版本决策（详见 `decisions.md`）：

| 决策 ID | 摘要 | 覆盖章节 |
|---|---|---|
| D-001@v1 | 复用现有 `blocked` step status，不新增状态机 | §5 Phase 3 |
| D-002@v1 | meta 向后兼容：缺 depsStatus 时入口触发供给 | §5 Phase 4、§9 |
| D-003@v1 | 门仅 execute（verify 在主工作区有 deps） | §3、§5 Phase 3 |
| D-004@v1 | monorepo 在 worktree 根安装 | §5 Phase 1、§3 |
| D-005@v1 | 方案 A：创建时供给 + completeStep 硬门 | §5 |
| D-006@v2 | opt-out 粒度=wave 级（Grill X-1 修正 D-006@v1） | §5 Phase 3 |
| D-007@v1 | junction 快路径 + install 兜底 | §5 Phase 1 |

无未解决决策。

## 12. 自审

- **需求覆盖**：✅ 八项需求点（供给/junction/install/meta/硬门/入口自检/doctor/local.yaml）均有对应 Phase。
- **Grill 覆盖**：✅ D-001~D-007 全部被 §5/§9 引用。
- **约束一致性**：✅ 复用 `local.yaml`、`VALID_STATUSES`、worktree 现有 create 流程，与 ARCHITECTURE/CONVENTIONS 一致。
- **真实性**：✅ 文件路径、行号、方法名来自实际代码（`worktree.js:318/642/825`、`run.js:2942/2196`、`progress.js:41`、`worktree-guard.js:17`、`db.js:99`）。
- **YAGNI**：✅ 不做 polyglot 引擎、monorepo 编排、provision 子命令（明确列为非目标）。
- **验收标准**：✅ 见 §10 风险对应 + Phase 描述，具体可测试（junction/install/门拒绝/opt-out/generic/resume/doctor）。
