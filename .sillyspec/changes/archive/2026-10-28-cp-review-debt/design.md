---
author: flow-machine-draft
created_at: 2026-10-28T05:46:49.189Z
---
# 设计记录（Design Record）— 2026-10-28-cp-review-debt

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

清偿 2026-10-28-shadow-checkpoint 独立评审三条 P3 债，全部落在 src/checkpoint.js 与其测试：

① 口径统一：`RESET_SPECS` 的目录名（node_modules/dist 等）从裸 pathspec（根锚定）改为 glob 双星任意深度形态——实证（git 2.45 Windows）：`:(glob)**/<dir>` 缺尾部 `/**` 时零匹配，正确形态为 `:(glob)**/<dir>/**`（根级与嵌套 packages/x/node_modules 一并命中），与护栏 `isHardExcluded` 的任意深度段判定对齐；`.env`/`.env.*`/`.sillyspec/.runtime` 维持根级语义（敏感配置与 spec 运行时目录按根级约定）。
② 补 FR-05 失败臂用例：测试以 `.git/refs/sillyspec/checkpoints/<cn>.lock` 占位使 `update-ref -d` 失败，断言 change-delete 主流程照常完成且 warnings 留痕。
③ 链校验解耦：新增内部 `isCheckpointInChain`（无上限 `git log` subject 前缀过滤），restoreCheckpoint 改用它；listCheckpoints 显示面保留 200 帽，CLI 列链尾行注明超帽走 git 直查。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/checkpoint.js`：`RESET_SPECS` 常量形态变更（内部）；新增内部函数 `isCheckpointInChain(repoRoot, ref, sha)`（不导出）；`restoreCheckpoint` 校验来源从 listCheckpoints 改为 isCheckpointInChain（签名不变、行为对超帽档更宽）。
- CLI `sillyspec checkpoint` 列链输出尾行文案微调（注明 200 帽与 git 直查指引）。
- 无导出签名变更、无文件格式变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立——三处修复均不改变时序假设：glob pathspec 是声明式过滤，链校验是对已落 ref 的只读扫描，失败臂用例只是测试面补齐。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   与前一变更相同（临时索引会话隔离、update-ref 原子）；新增的 isCheckpointInChain 是只读 git log，无新共享写面；锁占位测试的 lock 文件只在测试 fixture 中存在。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全——无状态迁移变化；链校验失败路径与原 membership 失败同形（ok:false + reason）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会——glob 排除按各仓路径空间独立生效；`.env*` 维持根级（跨仓根级约定一致）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险是 `:(glob)**/<dir>` pathspec 语义与预期偏差（不同 git 版本对 glob 魔法的 `**` 行为）——对策：测试直接断言嵌套路径不进快照树（行为锚而非语法锚），实测 git 版本（本机）通过；若某些老 git 不支持 glob 魔法，reset 会报错走 fail-open skip（存档退化但 tick 不受影响），属安全方向。

放弃的方案：① 把 .env* 也改成任意深度——敏感文件按项目根级约定，深层同名文件多为模板/示例（.env.example），全局排除过宽；② restore 校验改 merge-base --is-ancestor——祖先判定过宽（主历史全部提交都是链祖先，非 checkpoint 的普通提交会被放行读档）；③ 显示面也去帽——超长链列屏无信息量，帽是展示层的合理取舍（评审债的本质是校验被显示帽绑架，不是帽本身）。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/checkpoint.js | RESET_SPECS glob 任意深度；isCheckpointInChain 无上限校验；restoreCheckpoint 接线；CLI 尾行文案 |
| 修改 | src/index.js | checkpoint 列链尾行注明 200 帽与 git 直查 |
| 修改 | test/shadow-checkpoint.test.mjs | 新增三组用例（嵌套排除/锁占位失败臂/截断解耦） |
