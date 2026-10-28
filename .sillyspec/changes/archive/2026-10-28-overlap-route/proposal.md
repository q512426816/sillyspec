---
author: flow-machine-draft
created_at: 2026-10-28T06:03:11.596Z
---
# 提案书（Proposal）— 2026-10-28-overlap-route

## 动机

任务原话转写：target-file 重叠事前路由：检测与分流提示

同 target-file 并行是冲突地带：落地侧机器已厚（apply --3way 三方合并、main-repo.lock 串行、guard 相交预检、base 漂移 re-anchor），但干活期无人检测「两个活跃变更声明同一文件」——重叠只在落地时才撞见，错失事前分流到 worktree 的窗口。本变更补事前路由：新模块 overlap-detect（loadOwnDeclaredSet 补导出复用声明加载单一源 + collectForeignDeclaredFiles 已导出原语，活跃变更两两声明集相交）＋ sillyspec overlap 仓级查询动词（列重叠文件与归属变更，附分流与落地序列指引文案）＋ flow verify-drafts 通过后 advisory 钩子（当前变更声明与他人活跃变更相交时提示 worktree 分流，非阻断 fail-open）。

成功标准：
- 两个活跃变更声明同一文件时 detectDeclaredOverlaps 检出（文件+归属变更清单），声明不相交返回空（测试断言）
- 已归档变更的声明不参与重叠判定（测试断言）
- sillyspec overlap 列重叠并附分流指引（先到主检出、后到建议 worktree apply；落地序列：先落地干净进、后落地三方合并、并发由 main-repo.lock 串行）
- flow verify-drafts 自查通过后，当前变更声明与他人活跃变更相交时输出一行路由提示（advisory 非阻断，检测失败静默不拦批准）
- 既有 verify-drafts/批准门零回归，零新依赖

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 两个活跃变更声明同一文件时 detectDeclaredOverlaps 检出（文件+归属变更清单），声明不相交返回空（测试断言）
2. 已归档变更的声明不参与重叠判定（测试断言）
3. sillyspec overlap 列重叠并附分流指引（先到主检出、后到建议 worktree apply；落地序列：先落地干净进、后落地三方合并、并发由 main-repo.lock 串行）
4. flow verify-drafts 自查通过后，当前变更声明与他人活跃变更相交时输出一行路由提示（advisory 非阻断，检测失败静默不拦批准）
5. 既有 verify-drafts/批准门零回归，零新依赖

## 成功标准（可验证）

1. 两个活跃变更声明同一文件时 detectDeclaredOverlaps 检出（文件+归属变更清单），声明不相交返回空（测试断言）
2. 已归档变更的声明不参与重叠判定（测试断言）
3. sillyspec overlap 列重叠并附分流指引（先到主检出、后到建议 worktree apply；落地序列：先落地干净进、后落地三方合并、并发由 main-repo.lock 串行）
4. flow verify-drafts 自查通过后，当前变更声明与他人活跃变更相交时输出一行路由提示（advisory 非阻断，检测失败静默不拦批准）
5. 既有 verify-drafts/批准门零回归，零新依赖
