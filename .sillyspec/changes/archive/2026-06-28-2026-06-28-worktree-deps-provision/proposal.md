---
author: qinyi
created_at: 2026-06-28 16:43:58
---

# Proposal: Worktree 依赖供给 + 验证硬门

## 动机

sillyspec 的 worktree 隔离机制（`2026-05-29-worktree-isolation` 奠基）让 execute 阶段在独立 worktree 写代码，但 `WorktreeManager.create()` 同步了源码、baseline、checkpoint，**唯独不供给依赖**——`node_modules` 是 gitignore 的，`_overlayBaseline` 只搬源文件。结果：每个新 checkout 的 worktree 都没有依赖，agent 跑不了 `tsc`/单测，复杂改动只能靠代码审查，验证链路从源头断裂。在 `sillyhub-daemon` 变更中，R-02 P0 partial 分桶改动差点在无 `tsc` 保障下蒙混声称 verified。

一句话：**依赖供给可以失败，但验证能力不能装作没失败。**

## 关键问题（现有方案为何不够）

1. **worktree 创建即残缺**：`create()`（`worktree.js:190`）做了 fetch/ff-merge/baseline overlay/checkpoint，却不碰依赖；`_overlayBaseline`（`worktree.js:825`）显式只同步源文件。每个 worktree 都要人工补 `pnpm install`，违背自动化初衷。
2. **验证无硬门**：execute 没有任何代码级机制阻止 agent 在无依赖时声明 task 完成。现有 prompt 约束是软门，incident 证明软门失效——agent 照样声称 verified。
3. **状态不可观测**：worktree 是否具备构建/测试能力，没有持久化记录（meta.json 无相关字段），doctor 也查不出"依赖缺失"。

## 变更范围

1. 新增 `src/worktree-deps.js`：依赖供给引擎（lockfile hash、junction/symlink 快路径、install 兜底、多语言命令推断）。
2. `worktree.create()` 集成供给：baseline overlay 后调 `provisionDeps`，结果写 meta.json。
3. meta.json + local.yaml schema 扩展：`depsStatus` 系列字段、`commands.install/typecheck`。
4. `run.js completeStep` execute 分支加**验证硬门**：depsStatus 不达标拒绝 `--done`（blocked + exit 1）。
5. execute 入口自检：stale/missing/缺字段触发重供给（兼容已存在 worktree）。
6. `worktree doctor` 加 deps-missing/stale/failed 三类检查 + `--fix` 重供给。
7. 文档同步：修 `worktree.md` 路径/分支前缀脱节、`_module-map.yaml` 注册 worktree 模块、`file-lifecycle/worktree-and-guard.md` 补 deps 阶段。

## 不在范围内（显式清单）

- 不做跨语言依赖管理引擎（conda/cargo/gomod 只走最简兜底）。
- 不做 monorepo 拓扑编排（仅在 worktree 根安装，依赖 pnpm/npm workspaces 自身处理）。
- 不给 verify 阶段加 deps 门（verify 在主工作区跑，已有 node_modules）。
- 不新增用户级 `worktree provision` 子命令（doctor --fix 复跑供给已够，YAGNI）。
- 不改变现有 git worktree 隔离 / baseline overlay / apply 回写流程。
- 不在 deps 门里执行/校验 typecheck/test 命令是否真跑（那是 execute/verify 流程职责，本门只保证依赖就位）。

## 成功标准（可验证）

- 新建 worktree（主 checkout 有 node_modules 且 lockfile 一致）→ `node_modules` 被 junction，`meta.depsStatus='linked'`，`tsc --noEmit` 可跑。
- lockfile 不一致 → 执行 install，`depsStatus='installed'`。
- install 失败/超时 → `depsStatus='failed'`，execute `--done` 被门拒绝、step 置 `blocked`，不删 worktree。
- 无 install 命令的 generic 项目 → `depsStatus='n/a'`，门自动跳过。
- wave 内所有 task 声明 `no_deps_verify: true` → 该 wave 门跳过。
- 旧 worktree（meta 无 depsStatus）resume execute → 入口自检触发供给补全。
- `sillyspec worktree doctor` 检出 deps-missing/stale/failed；`--fix` 重供给成功。
- 既有项目（无 `commands.install`）行为与改造前等价。
- `npm test`（28 个既有测试）全绿 + 新增 worktree-deps 测试通过。
