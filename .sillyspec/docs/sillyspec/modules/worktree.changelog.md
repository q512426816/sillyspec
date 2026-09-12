# worktree 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-13 | 2026-08-13-worktree-execute-loss-guard | cleanup fail-closed 保护（D-001@v1）：清理前经 hasUnappliedChanges 检查未落主仓交付变更，命中返回新增 `result:'blocked'` 拒绝清理，需显式 force 绕过；新增 findMissingDeliverables 纯函数导出（execute 阶段级核验，D-002@v1）；apply 后自动 cleanup 三处 + execute reset（run/command.js resetStage）显式 `force:true`（D-006@v1）；doctor --fix 与显式 worktree cleanup 命令 blocked 提示分支 |
| 2026-06-28 | 2026-06-28-worktree-deps-provision | 依赖供给 provisionDeps + execute 验证硬门 + doctor deps 检查；修路径/分支前缀脱节 |
| 2026-08-04 | ql-20260804-005-83d8 | execute 复盘 c：apply 允许集改为 resolveApplyAllowSet（design §6 ∪ plan task allowed_paths），测试/产物文件不再误拦，越界文件仍拦 |
| 2026-08-06 | ql-20260806-002-c4dd | exec-f：worktree-deps detectProjectType/inferInstallCommand 加 python 分支（pyproject.toml/uv.lock→uv sync，纯 requirements.txt→pip install -r），治 worktree 内 ruff/pre-commit 等二进制不供给（原无 python 分支→误判 generic→n/a）；两函数导出做纯单元测 7 断言（不真跑 uv） |
| 2026-08-05 | 2026-08-05-tooling-feedback-fixes | doctor 加 `deps-main-drift` issue（探主仓 lockfile 漂移，靠 H1 `checkDepsFreshness`）+ `--change` 过滤 flag + `--fix` force 重装（`_doctorReprovision` 解链 + `provisionDeps(force=true)`）；`provisionDeps` 加 `force` 选项；抽 H1 `checkDepsFreshness` 统一 doctor 与 execute 入口 deps 判定 |
| 2026-08-06 | 2026-08-06-execute-runs-isolation | execute-runs/stage-reviews 与 worktree 生命周期解耦：drift 守卫补设 `platformOpts.specDriftAnchor` + 抽 `resolveRuntimeRoot`（`run/shared.js`）统一 `.runtime` 根解析（15 站点三级优先级 runtimeRoot > specDriftAnchor > 本地）；drift 场景落主仓 `.runtime`，cleanup 整目录删 worktree 不再吃 review.json，archive step1 完成度 gate 不阻断。9 处 cleanup 调用点 + rmSync 全不改（方案 A 堵源头） |
| 2026-08-07 | ql-20260807-010-9897 | apply gate 两 bug 修复：① baseline gate 改判「排除规则下当前未提交 dirty」——原比对 meta.baselineHash，execute 启动时主仓 dirty、期间 commit 变 clean 后 hash 必变 → 永久死锁须手改 meta；② `resolveApplyAllowSet` 传 `keepSillyspecDocs=true`，模块文档 `.sillyspec/docs/` 经 design §6 清单即可覆盖——原 change-list 跳过全部 `.sillyspec/`（蓝图基础设施），与 `filterDeliverableFiles` 保留 `.sillyspec/docs/`（交付物）语义打架致模块文档永远缺清单 |
| 2026-08-09 | 2026-08-09-worktree-git-injection | git 调用收口 src/git-helper.js：worktree.js（51 处）/worktree-apply.js（26 处）删本地 git/gitQuiet helper、import 公共入口、77 调用点 + 2 裸 execSync 注入核心全 execFileSync 数组化不经 shell，消除命令注入（`;`/`$()` RCE）+ 空格拆词（apply 漏文件）；与 run/shared.js safeGit 合一单一真相源 |
| 2026-08-10 | 2026-08-10-worktree-apply-dirty-resilient | dirty 拦截时输出逐文件 rescue cp 指令（方案A）：新增 export `generateRescueCommands`（逐文件四分类 SAFE-CP/EXCLUDE-DIRTY/EXCLUDE-MISMATCH/DELETE 纯函数）+ `computeRescueDirtyFiles`（统一 dirtyFiles 口径，DRY 复用 filterDeliverableFiles 保留 .sillyspec/docs/）+ applyWorktree 返回值 additive `rescueCommands`/`deletedFiles`；step3.5 前移 hashMismatch 计算（Grill P0，baseHash=meta.baseHash，保 step4.5 拦截时 EXCLUDE-MISMATCH 可用）；step4.5/5a fail-loud 拦截决策零改动保留；index.js apply/assess 结构化 rescue 打印段；补 test/worktree-apply-rescue.test.mjs 37 断言（含 P0 时序回归锁死前移） |
| 2026-08-13 | ql-20260813-001-e83f | git-helper safeGit 加 retryOnTimeout 选项（ETIMEDOUT 用 2× timeout 重试一次，默认 false 向后兼容）；auditQuickCompletion 的 git status 启用（timeout 15000 + retryOnTimeout），治机器忙时审计 git 超时偏紧致 blocked 误拦；quick step3 prompt 澄清 --file-notes 只随 --done 同命令传（CLI 短进程跨 step 不透传） |
- ql-20260908-008 | meta.json BOM 容错（parseJSON 剥 ﻿，带 BOM 不再被当损坏）+ apply allowlist 平台模式 specRoot 解析（resolveApplyAllowSet/collectReviewDeclaredFiles 加 specBase/runtimeRoot 参 + 指针静默回退；applyWorktree/applyCrossRepoWorktrees/assessApplyRisk/gates plan 预检接线）——治「平台模式整批 BLOCKED」「带 BOM 当损坏」 |
ql-20260911-030-bad4 | hasUnappliedChanges 无 meta 改保守 true（对齐 dir 缺失分支与 create 幽灵分支 fail-closed）——cleanup 不带 --force 不再跳过未落仓护栏误删未提交代码
- ql-20260912-008-8eff | EXCLUDE-DIRTY 合并覆写前备份在途原文至 merge-backups；chunkPaths argv 分批（diff/add/reset/getBlobHashMap）；trackedPatchFiles 判定 N+1 spawn 改单次哈希表
