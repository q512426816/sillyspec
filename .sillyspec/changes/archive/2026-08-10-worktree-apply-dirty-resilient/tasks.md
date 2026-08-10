---
author: qinyi
created_at: 2026-08-10 11:29:04
---

# 任务清单（Tasks）

> scale=large 骨架，plan 阶段展开 Wave / TaskCard allowed_paths / 依赖。覆盖 design.md 文件变更清单 + Grill requiredEvidence 三项。

- [ ] task-01: 新增导出纯函数 `generateRescueCommands`（src/worktree-apply.js）——逐文件四分类（SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE）+ 路径正斜杠规范化 + 返回 {commands, warnings, cpFileCount, excludedCount}
- [ ] task-02: step3.5 前移 hashMismatch 计算（src/worktree-apply.js）——把现 step5b（:290-310）的 getBlobHashMap(worktreePath,baseHash,targetFiles) vs getBlobHashMap(projectRoot,'HEAD',targetFiles) 整块前移到 step3 allowSet 之后、step4.5 之前；原 step5b 改读前移结果；step2（:182-191）扩展收集 deletedFiles（判 name-status D）
- [ ] task-03: step4.5/5a 拦截分支 + assess 集成 rescue（src/worktree-apply.js）——step4.5（:260-272）/step5a（:282-287）拦截按统一口径算 dirtyFiles（tracked-modified∪untracked，排 .sillyspec/+meta.json，对齐 filterDeliverableFiles 保留 .sillyspec/docs/）→ 调 generateRescueCommands（传前移的 hashMismatchFiles + deletedFiles）→ 写 result.rescueCommands + 拼 result.errors；assessApplyRisk 透出 checkResult.rescueCommands；result 初始化加 rescueCommands:null；补正 step4.5 注释 :243-245 归因（CRLF 副作用）
- [ ] task-04: index.js apply/assess 打印器结构化 rescue 段（src/index.js）——apply（:732-737）/assess（:787-790）补 `Rescue commands (N safe / M excluded):` 打印（rescueCommands 非空时触发，UX 增强；现有 errors/reasons 文本打印保留作主通道）
- [ ] task-05: 测试（test/worktree-apply-rescue.test.mjs 新增）——generateRescueCommands 四分类纯函数单测 + 路径正斜杠断言 + dirtyFiles 口径（含 untracked + .sillyspec/docs/ 对齐）+ **P0 时序回归（main 推进 fileA + fileB dirty → rescue 排除 fileA，锁死 step3.5 前移）** + step3.5 前移等价（checkOnly/real 两路径 hashMismatchFiles 不变）+ applyWorktree 拦截时 rescueCommands 非空 + assess 透出 + 未拦截 rescueCommands=null（零回归）+ deletedFiles 跨模式（native-worktree/in-place）name-status 实测；npm test 全量 EXIT=0 + npm run lint 绿
