---
author: qinyi
created_at: 2026-08-09T12:55:00+08:00
---

# module-impact.md — 统一 git 调用入口

## git diff 真实变更文件（真相源，以 git diff 为准）
- src/git-helper.js（新增）
- src/index.js（修改）
- src/run/shared.js（修改）
- src/worktree-apply.js（修改）
- src/worktree.js（修改）
- test/git-helper-injection.test.mjs（新增）
- test/platform-scan-p0.test.mjs（修改）

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| worktree | 调用关系变更 | src/worktree.js, src/worktree-apply.js | 删本地 git/gitQuiet helper、import 公共入口 src/git-helper.js、全部调用点数组化（worktree.js 67 处含 check-ignore/worktree remove/commit 注入点；worktree-apply.js 25 处 + 2 裸 execSync 注入核心 git diff --binary 的 files.join 产物展开为 ...files）；二进制 diff/commit 保留 Buffer/env 语义用裸 execFileSync 数组形式 | false |
| runtime | 调用关系变更 | src/run/shared.js | safeGit 删本地实现，改 import { safeGit } + export { safeGit } 自 git-helper.js（修复 pure re-export 不建本地词法绑定致内部 L128/130/431 调用 ReferenceError）；run/ 层调用方路径与行为不变 | false |
| cli-entry | 调用关系变更 | src/index.js | worktree diff --base 的 base 值由 shell 字符串插值改 git() 数组调用（base 作独立 argv 元素，trim:false 保留 diff 输出，timeout 30s），消除 RCE 注入面 | false |

## 未匹配文件（_module-map.yaml schema_version=1 旧格式未收录 / 测试文件）

| 文件 | 说明 | 建议 |
|------|------|------|
| src/git-helper.js（新增） | 统一公共 git 调用入口（safeGit + git + gitQuiet，execFileSync 数组形式不经 shell），跨 worktree + runtime 共用的单一真相源 | _module-map.yaml schema_version=1 未收录此新文件；建议升级 schema_version=2 时补 git-helper 归属（worktree 模块或新建 git 模块）。needs_review=true（新公共入口，模块映射待定） |
| test/git-helper-injection.test.mjs（新增） | 注入与空格拆词回归测试（4 类 11 用例：空格不拆词/marker 副作用不经 shell/三语义/grep 反向断言） | 测试文件，归 test |
| test/platform-scan-p0.test.mjs（修改） | safeGit 静态断言跟随实现搬家：测试 3 runSrc 拼接加 git-helper.js，P0 安全契约从新位置继续验证 | 测试文件，归 test |

## 三重交叉验证
- 声明范围（design.md「文件变更清单」）：src/git-helper.js + src/worktree.js + src/worktree-apply.js + src/run/shared.js + src/index.js + test/git-helper-injection.test.mjs
- 任务范围（plan.md task-01~05 allowed_paths）：与声明一致（task-06 验收门禁无代码产出文件）
- 真实变更（git diff）：声明范围 + test/platform-scan-p0.test.mjs（验收时修的 task-01 搬家回归，design 清单未列但真实改动）
- 以 git diff 为准：platform-scan-p0 是真实改动（task-01 搬家回归修复，已记 verify-result.md 技术债务 + execute task-01 review.json + commit 415f712）；design 清单未列属 plan 盲区，非 scope creep

## needs_review 汇总
- worktree / runtime / cli-entry 三模块影响明确（调用关系变更，行为不变），needs_review=false
- src/git-helper.js 新增公共入口，_module-map 未收录，needs_review=true（模块映射待 schema 升级补录）

## 模块文档更新结果（archive step3）

| 文件 | 更新内容 |
|------|----------|
| _module-map.yaml | worktree needs_review: false→true + review_reasons 追加 src/git-helper.js 新公共入口待 schema_version=2 补录 paths（runtime/cli-entry 保持 needs_review=false，影响明确） |
| modules/worktree.md | ① 最后更新 2026-08-07→2026-08-09 + 最近变更新增 2026-08-09-worktree-git-injection 条目；② 依赖关系加 src/git-helper.js 内部依赖 + child_process execSync→execFileSync 经公共入口；③ 注意事项加「git 调用收口 src/git-helper.js」条目；④ 变更索引加 2026-08-09 条目 |
| modules/runtime.md | 注意事项加「safeGit 收口 src/git-helper.js」条目（run/shared.js safeGit 移入根级公共入口 + import+export 两段式 fix 纯 re-export 不建本地绑定 bug） |
| modules/cli-entry.md | 不更新（index.js worktree diff 属内部实现变化，对外接口不变；模块影响矩阵影响=调用关系变更 needs_review=false） |

注：_module-map.yaml 的 needs_review（模块整体待补录标记）与本文件「模块影响矩阵」的 needs_review（改动影响明确性）语义不同——前者标 true 仅表 git-helper.js 文件待 schema 升级补录，非 worktree.js/worktree-apply.js 改动本身需复核。
