---
author: flow-machine-draft
created_at: 2026-11-06T16:41:53.102Z
---
# 提案书（Proposal）— 2026-11-07-sync-proposed-no-revive

## 动机

任务原话转写：同步候选复活缺陷修复——平台已审条目不再回推

动机与背景：平台仓核查（2026-11-07 子代理）实证「候选复活」缺陷：平台知识页 merge/reject 待审候选后服务器侧软删（manifest exists=false，不置墓碑），本地仓 knowledge/proposed/ 残留文件在下次 spec-sync 按「本地有服务器无→add」规则推回平台，走 service.py 复活分支落盘——已审核条目在平台待审区复活，审核成果被下次同步冲掉。修复走 CLI 侧窄化：仅 knowledge/proposed/ 前缀、且服务器 manifest 该行 exists=false（平台处置过的证据）的本地残留——不发 add、sync 过程自动清理本地文件并提示；从未同步的新提议（manifest 无该行）行为不变。

成功标准：
- 服务器 manifest exists=false 的 knowledge/proposed/ 本地残留文件：computeSpecOps 不生成 add（不复活）
- syncSpecTree 检测到此类残留时自动删除本地文件并输出一行提示（注明平台已审核合并/拒绝）
- 从未同步的新 proposed 文件（manifest 无该行）照常生成 add（新提议上行通道不受影响）
- 非 proposed 路径的 exists=false 场景行为零变化（既有语义不动）
- 既有 spec-sync 测试面全绿 + 新增用例覆盖上述分支

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 服务器 manifest exists=false 的 knowledge/proposed/ 本地残留文件：computeSpecOps 不生成 add（不复活）
2. syncSpecTree 检测到此类残留时自动删除本地文件并输出一行提示（注明平台已审核合并/拒绝）
3. 从未同步的新 proposed 文件（manifest 无该行）照常生成 add（新提议上行通道不受影响）
4. 非 proposed 路径的 exists=false 场景行为零变化（既有语义不动）
5. 既有 spec-sync 测试面全绿 + 新增用例覆盖上述分支

## 成功标准（可验证）

1. 服务器 manifest exists=false 的 knowledge/proposed/ 本地残留文件：computeSpecOps 不生成 add（不复活）
2. syncSpecTree 检测到此类残留时自动删除本地文件并输出一行提示（注明平台已审核合并/拒绝）
3. 从未同步的新 proposed 文件（manifest 无该行）照常生成 add（新提议上行通道不受影响）
4. 非 proposed 路径的 exists=false 场景行为零变化（既有语义不动）
5. 既有 spec-sync 测试面全绿 + 新增用例覆盖上述分支
