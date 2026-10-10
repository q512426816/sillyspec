---
author: t
created_at: 2026-10-10T17:20:00.000Z
---
# 任务注册表（Tasks）— 2026-10-10-cross-worktree-toolchain

> 工作分解（design.md 文件清单 × decisions D-001/002/003）；每行=可独立完成并当场验证的一步。
> 边干边勾：实现到位 + 相关测试跑绿当场翻格（勿攒一把勾）。

- [x] task-01: 新增 src/cross-placement.js 零依赖叶子模块（readCrossPlacementConfig 读 worktree.crossPlacement 块式/inline 双形态；placement 注册表读写 read-modify-merge 原子写；crossWorktreePath(specBase, change, repoKey, placementRoot?)；resolveCrossWorktreePath 注册表优先公式兜底）——验证：冒烟 import + 新单测解析用例绿
- [x] task-02: worktree-cross.js 接线——ensureCrossWorktrees 用 placementRoot 落位 + 写注册表 + WSL 分裂警告（repoRoot 在 /mnt/<盘>/ 而 worktreePath 不在 → advisory）；cleanupCrossWorktrees cleaned/skipped 分支删注册表键 + 末尾 <change>--* 差集 sweep 悬挂条目（评审 P2 吸收）；getCrossWorktreeMeta/listCrossWorktreeMetas 走 resolve+双源合并（注册表只供位置、须读到可解析 meta 才入列）——验证：新单测 placement fixture 绿
- [x] task-03: 消费点收口——run/multi-repo-context.js 与 cross-repo-reconcile.js 的内联路径公式改走 resolveCrossWorktreePath（import 新叶子模块不引环）——验证：静态 import 成功 + cross-repo 相关既有测试绿
- [x] task-04: worktree-deps.js ECOSYSTEMS 表 maven/gradle install 改 null + 表注释同步（JVM 系依赖在用户级仓库）——验证：worktree-deps 既有测试绿 + 新断言 maven/gradle 根供给 n/a 且零 mvn/gradle spawn
- [x] task-05: worktree-apply.js 新增导出 detectCrossMainCopyBypass(crossRoot, baseHash, allowSet) 纯函数（baseHash..HEAD 提交数 + 文件集与 allowSet 交集）+ applyCrossRepoWorktrees 在 changedFiles 收集后、空清理分支前接线 advisory warning——验证：新单测交集判定绿（命中/未命中/声明面缺失三场景）
- [x] task-06: config-schema.js 注册 worktree.crossPlacement.<repoKey> 键文档（readers/desc/example）——验证：sillyspec config schema 含该键
- [x] task-07: 测试收口——test/cross-worktree-placement.test.mjs + test/cross-main-copy-bypass.test.mjs 新增、test/worktree-deps-provision.test.mjs 增 maven/gradle n/a 断言；跑本变更测试面（新 2 文件 ∪ worktree-deps* ∪ cross-repo* ∪ worktree-isolation）全绿——验证：npm test 目标文件 0 fail
