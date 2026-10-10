---
author: flow-machine-draft
created_at: 2026-10-10T03:18:39.120Z
---
# 设计记录（Design Record）— 2026-10-10-worktree-salvage-archive-aware

## 做法概述

改 `_salvageSpecArtifacts`（src/worktree.js）：`changes/<name>/**` 树的打捞由「主仓原路径缺失即复制」升级为逐文件三态判定——原路径在 → 现行为不变（缺失不可能落到此态，同名不同内容走既有冲突清单分支）；原路径缺但 `changes/archive/<name>/<rel>` 在 → 判定归档搬运，跳过不复制（防复活）；原路径与 archive 均缺 → 真 worktree 独有产物照捞，归档态（archive 副本目录存在）捞进 `changes/archive/<name>/<rel>`，未归档态捞回原路径。`.sillyspec/docs/**` 树不涉及归档搬运，行为零变化。

选内建归档感知而非调用方传 flag：五条清理入口（归档正常路径 complete-handlers.js:1187、归档自愈 :1158、doctor 已归档清理 worktree.js:1802、无 meta 孤儿 force 兜底 :352、事后手动 cleanup）全部经 `wm.cleanup()` 汇入本函数，一处收口零签名变更，漏接一条入口即复活的接线方案不可取。判定只看文件系统（archive 副本存在性），不查进度库——手动半归档（目录已搬、DB 未注销）同样正确。

## 接口契约

无对外签名/命令/文件格式变化；`cleanup()` 返回的 `details` 数组新增两类记录（`skipped N archived-moved spec artifacts` / `salvaged N spec artifacts into archive copy`），stderr 打捞 warn 新增跳过汇总与归档副本去向两类输出。调用方（complete-handlers / doctor / CLI 展示层）对 details 仅做展示不做匹配，无兼容面。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：归档移动（renameSyncRetry）先于 cleanup 是既定时序；乱序场景 = cleanup 先跑（此刻未归档，走原行为把独有产物捞回原路径）后归档移动整个目录带走产物，无丢失无复活。cleanup 与归档移动并发（理论上并行会话同 change 操作）由归档侧 withMainRepoLock 所有权护栏挡在前置，非本函数新增风险面。
2. 并发写：打捞逐文件 `copyFileSync` 与现状同原子级；本变更新增的写目标在 `changes/archive/<name>/` 内（归档窄化 git add 同侧目录），不新增共享写点；对 archive 副本只读不写（覆盖被 FR-01 显式禁止）。
3. 切换/生命周期：打捞中途中断（进程被杀）——部分文件已捞部分未捞，重跑 cleanup 幂等重入（existsSync 三态判定重算，已捞文件命中原路径在/副本在分支），无半开状态放大；归档副本目录被并行归档收尾 git add 时，新增捞入文件若在 add 之后落盘则留给用户常规 git status 核对（与既有打捞产物同待遇）。
4. 作用域：mainSpec 解析同现状（`_resolveMainRepoRoot()` 锚主仓），archive 判定是主仓 spec 内相对路径，跨仓 worktree / 平台 specRoot 模式不串台；多实例（多会话）对同一 worktree 的重复 cleanup 由 existsSync 幂等性兜底。

## 风险与死路

最大风险：归档副本存在但 worktree 副本更新（归档后子代理又向 worktree 写入的极端时序）——本设计以 archive 副本为权威静默跳过（warn 有计数与路径清单，人工可对账），不自动覆盖，避免把「更旧快照复活」换成「更新内容覆盖归档件」的对称事故。试过放弃的方案：① 调用方传 archived flag——五入口逐一接线，漏一处即复活，且 doctor 入口判定口径（worktree.js:1795）与打捞内判定会形成两套真相；② 归档态整树跳过——「两处均缺」的真独有产物会随清理蒸发，违背打捞初衷（坑 worktree-spec-artifact-misplace）；③ 内容比对 archive 副本差异列入冲突清单——事故场景 13 文件全部内容有差（旧快照 vs 终版），全列纯噪音。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/worktree.js | `_salvageSpecArtifacts` 归档感知三态判定 + 跳过/捞入归档副本的 warn 与 details 输出 + JSDoc 更新（新坑：archive 复活，2026-10-09-attachment-inline-reference 下游实证） |
| 修改 | test/worktree-spec-salvage.test.mjs | 新增场景 3：归档态清理（原路径不复活 + archive 副本不被覆盖 + 独有产物捞进归档副本）；既有场景 1/2 作未归档态回归不动 |
