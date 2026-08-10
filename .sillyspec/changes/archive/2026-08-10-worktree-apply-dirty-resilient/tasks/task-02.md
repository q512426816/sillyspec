---
id: task-02
title: step3.5 hoist hashMismatch + collect deletedFiles + fix comment
title_zh: hashMismatch 前移到 step4.5 前加 deletedFiles 收集加注释归因补正
author: qinyi
created_at: 2026-08-10 11:50:00
priority: P0
depends_on: [task-01]
blocks: [task-03]
requirement_ids: [FR-03, FR-06]
decision_ids: [D-004@v1]
allowed_paths:
  - src/worktree-apply.js
provides:
  - contract: step3.5-precompute
    fields: [hashMismatchFiles, deletedFiles]
goal: 修 Grill 发现的 P0 时序缺口，把现 step5b（:290-310）hashMismatch 计算前移到 step4.5 之前（新 step3.5），使拦截短路时 result.hashMismatchFiles 已填充让 EXCLUDE-MISMATCH 生效（防 cp 覆盖主干已提交推进），同时 step2 收集 deletedFiles 供 DELETE 分类加补正 step4.5 注释归因
implementation: |
  - step3.5 前移——把现 step5b（:290-310）的 hashMismatch 计算整块（targetFiles = hasAllowList 问号 [...allowSet] 冒号 changedFiles；getBlobHashMap(worktreePath,baseHash,targetFiles) 对比 getBlobHashMap(projectRoot,HEAD,targetFiles)；逐文件比对 push hashMismatchFiles）移到 step3 allowSet（:217-219）之后、step4 violations（:221）之前
  - 前 4.5/5a/5b 移动安全依据——仅依赖 baseHash/HEAD blob 对比无 dirty 依赖；allowSet/changedFiles/baseHash 均在前移点之前可得
  - 原 step5b 位置删重复计算，display 语义不变（hashMismatchFiles 仍记录不拦截交 --3way）
  - step2 扩展 deletedFiles——step2（:182-191）解析 git diff name-status diffBase 时除现有 statusFiles，额外判 parts[0] 等于 D 或 D100 时 deletedFiles.add(parts 最后元素)
  - deletedFiles 不并入 changedFiles（changedFiles 仍含 D 文件供 resolvePatchFiles，rescue 分类用单独 delete 集合）
  - 注释补正——step4.5 注释 :243-245 改归因为 Windows/autocrlf CRLF 副作用非 git 本质限制，附 autocrlf on/off 实证
acceptance:
  - step3.5 前移后 step4.5（:271）/step5a（:286）拦截短路时 result.hashMismatchFiles 已填充（主干有推进则非空）
  - checkOnly 路径 hashMismatchFiles 结果与 v1 step5b 原位计算等价（前移区间 step4/4.5/5a 只读无 git mutation）
  - step2 收集 deletedFiles——worktree 删除文件（name-status D）进集合
  - step4.5 注释含 CRLF 加 autocrlf 加非 git 本质限制 关键词
  - applyWorktree 对外行为不变（hashMismatchFiles 结果等价加返回值结构不变）
verify:
  - task-05 P0 时序回归测试（main 推进 fileA 加 fileB dirty → rescue 排除 fileA）锁死前移生效
  - task-05 前移等价测试（checkOnly/real 两路径 hashMismatchFiles 不变）
  - 现有 worktree-apply-relax-committed-advance.test.mjs（测 step5b display）零回归
constraints:
  - 前移仅移动计算位置不改 hashMismatch 判定逻辑（仍 getBlobHashMap baseHash 对比 HEAD blob 加仍只记录不拦截）
  - baseHash 用 meta.baseHash（非 diffBase），与原 step5b :298 一致
  - deletedFiles 收集不破坏现有 statusFiles/rename 解析（R100 两文件仍进 statusFiles，D 文件额外进 deletedFiles）
  - step3.5 不受 meta.baselineHash 门控（原 step5b 也非门控前移保持）
  - 与 step4.6 merge 路径交互——merge 早返回 :239 前 step3.5 已跑，applyByMerge 不读 hashMismatchFiles，仅多一次无害计算非回归
related_tests:
  - test/worktree-apply-relax-committed-advance.test.mjs
---

# task-02：step3.5 前移加 deletedFiles 加注释

## 背景
Grill P0 时序缺口——hashMismatch 原在 step5b（:290-310），step4.5/5a 拦截短路在前致 rescue 拿不到主干已推进文件，cp 覆盖主干已提交推进。前移解决。

## 改动点
1. step5b hashMismatch 计算整块前移到 step3 之后 step4.5 之前（新 step3.5）
2. step2 name-status 解析扩展收集 deletedFiles
3. step4.5 注释 :243-245 补正 CRLF 归因
