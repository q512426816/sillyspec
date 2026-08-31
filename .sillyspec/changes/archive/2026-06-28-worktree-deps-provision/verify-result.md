---
author: qinyi
created_at: 2026-06-28T17:45:00
---

# 验证报告：2026-06-28-worktree-deps-provision

> 阶段：verify（只读检查，未修改任何源码）

## 结论：✅ 通过

变更目标——worktree 创建后自动供给依赖 + execute 验证硬门——已完整实现，对照 design.md / requirements.md / plan.md 全部满足，测试零回归。

## 任务完成度（8/8）

| task | 状态 | 交付 |
|---|---|---|
| task-01 | ✅ | src/worktree-deps.js：provisionDeps + lockfileHash（junction/symlink 快路径 + install 兜底 + 多语言推断） |
| task-02 | ✅ | src/run.js：enforceDepsGate + isCurrentWaveAllNoDepsVerify，completeStep execute 分支硬门（blocked + exit 1） |
| task-03 | ✅ | src/scan-postcheck.js：X-3 注释（install/typecheck 非 npm-script，不误校验） |
| task-04 | ✅ | 文档：worktree.md 修脱节 + 补接口/meta 字段；_module-map.yaml 注册 worktree；file-lifecycle 补 deps 阶段 + 门 |
| task-05 | ✅ | src/worktree.js：create() 集成 provisionDeps（5.8 步）+ meta 字段合并 |
| task-06 | ✅ | src/run.js：ensureDepsFreshness 入口自检（D-002，missing/stale/缺字段重供给） |
| task-07 | ✅ | src/worktree.js：doctor deps-missing/stale/failed + _doctorReprovision --fix |
| task-08 | ✅ | test/worktree-deps-provision.test.mjs：20/20 通过 |

## FR 覆盖

| FR | 覆盖 | 证据 |
|---|---|---|
| FR-01 worktree 创建后自动供给 | ✅ | worktree.js create() 5.8 步调 provisionDeps |
| FR-02 多语言 install 推断 | ✅ | worktree-deps.js inferInstallCommand（nodejs/maven/gradle/generic） |
| FR-03 junction 快路径 + install 兜底 | ✅ | provisionDeps tryLink/tryInstall，test 验证 linked/兜底 |
| FR-04 execute 验证硬门 | ✅ | enforceDepsGate，blocked + exit 1，仅 execute |
| FR-05 无依赖项目自动跳门 | ✅ | generic→n/a，okStatus 含 n/a，test 验证 |
| FR-06 wave 级 opt-out | ✅ | isCurrentWaveAllNoDepsVerify（整 wave 全 task no_deps_verify 才跳，D-006@v2） |
| FR-07 execute 入口自检 | ✅ | ensureDepsFreshness（D-002） |
| FR-08 doctor deps 检查 + --fix | ✅ | doctor 三类 + _doctorReprovision |

## 决策覆盖（D-001~D-007）

全部当前版本决策被实现覆盖：D-001@v1（blocked status 复用）、D-002@v1（入口自检）、D-003@v1（仅 execute）、D-004@v1（monorepo 根安装）、D-005@v1（方案 A）、D-006@v2（wave 级 opt-out，supersedes D-006@v1）、D-007@v1（junction + install）。

## 测试结果

- `node --check`：worktree-deps.js / worktree.js / run.js / scan-postcheck.js 全过
- `npm run lint`（check-syntax.mjs）：41 个 JS 文件通过
- `npm test`：**28 文件通过**（含新增 worktree-deps-provision.test.mjs 20/20）
- 失败 3 个（cli-top-level-aliases / decision-supersede / run-scan-project-parse）：**pre-existing**，`git stash` 在 clean tree 同样失败，与本变更无关（sync stderr 环境差异 / Windows ESM URL / path 校验）

## 对照设计偏差（合理）

1. `readLocalYaml` 移除 `process.cwd()` 兜底——防止环境配置泄漏（test 发现 sillyspec 自身 local.yaml 被误读），优于设计原案。
2. 门/自检 helper 作为 run.js 模块函数（enforceDepsGate/isCurrentWaveAllNoDepsVerify/ensureDepsFreshness），而非独立文件——design 说"在 completeStep"，实现为 helper 调用，一致。
3. `commands.typecheck` 槽按 X-4 不被门强制——门只保证依赖就位（depsStatus），不执行/校验命令是否真跑（那是 execute/verify 流程职责）。

## 风险复查

| 风险 | 状态 |
|---|---|
| R-01 Windows junction 跨盘符 | ✅ tryLink 失败回退 install，depsMethod 记录机制 |
| R-02 monorepo native 模块 | ✅ junction 共享 main，tsc 场景安全 |
| R-03 install 超时 | ✅ 300s 上限，失败记 failed 不阻断 create |
| R-04 frozen-lockfile 改 pkg 时失败 | ✅ 期望行为；lockfile 变更触发 install 非 junction |
| R-05 入口自检误判 stale | ✅ stale 是正确信号，自检幂等 |
| R-06 no_deps_verify 滥用 | ✅ frontmatter 由 plan 生成，可加 postcheck 统计 |
| R-07 nodejs 无 lockfile | ✅ 推断表兜底非 frozen npm install |

## 文件清单（最终）

- 新增：`src/worktree-deps.js`、`test/worktree-deps-provision.test.mjs`
- 修改：`src/worktree.js`、`src/run.js`、`src/scan-postcheck.js`、`.sillyspec/docs/sillyspec/modules/worktree.md`、`.sillyspec/docs/sillyspec/modules/_module-map.yaml`、`docs/sillyspec/file-lifecycle/worktree-and-guard.md`

## 建议下一步

`sillyspec run archive --change 2026-06-28-worktree-deps-provision` 归档。
