---
author: flow-machine-draft
created_at: 2026-10-11T13:55:38.251Z
---
# 设计记录（Design Record）— 2026-10-11-resurrect-guard-verify-hardening

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

答：三处独立修复，均为坑驱动（2026-10-10 实证）。①幽灵复活双门：run/command.js 在 autoChange 注册前查 changes/archive/<同名>/ 并存且 pm.listChanges 无活跃行 → exit 2 双出口指引（try/catch fail-open：守卫异常不拦正常注册）；doctor-diagnostics.js detectArchiveIntegrity 扫 archive 名单与活跃目录交集 → FAILED + resurrected + 勿 align 警示（doctor 只报不治）。②对账基点 merge-base 化：resolveMainChangedFiles 在拿到立项 diffBase 后算 merge-base(baseBranch||main, HEAD)，三重守卫（mb==立项点零变化 / mb==HEAD 清空面 / 非立项点后代放大面）全退旧锚，仅严格收窄才采用。③超时单位统一：抽 parseTestTimeoutEnvMs 单点，<10000 秒×1000、≥10000 毫秒兼容+告警，TEST_TIMEOUT_MS 与 resolveTestTimeoutMs 同源。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

答：
- runCommand（src/run/command.js）：新增注册前幽灵守卫（try/catch fail-open），命中 exit 2；函数签名无变化。
- detectArchiveIntegrity（src/doctor-diagnostics.js）：改为 export（doctor 检查装配需要），返回增量字段 `resurrected`；无签名破坏。
- resolveTestTimeoutMs（src/verify-postcheck.js）：签名不变，env 解析口径统一；新增模块内 parseTestTimeoutEnvMs（未导出）。
- 文档面：17 个 docs/.sillyspec 文档行号锚重锚（docs check --fix 自动 + 2 处手工），docs-check-baseline 42→0（棘轮收紧）。
- 技能面：.claude/skills/sillyspec-quick/SKILL.md 新增；auto/brainstorm SKILL.md 分叉文案改指 quick --linked-changes。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

答：成立，含一处显式取舍（评审 P2-2 修正披露）：守卫外层 try/catch fail-open（守卫自身异常不拦正常注册）；内层 pm.listChanges 列举失败按无活跃行处置——该分支 fail-closed（宁误拦不漏幽灵：DB 瞬时锁下合法重开被误拦 exit 2，重跑即恢复；代码注释「列举失败按无活跃行处置」显式记载该裁决）。平台同步迟到建行不误拦（实时读库）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

答：守卫只读（archive 目录存在性 + 库列举），不写共享面；doctor 只报不治，两执行体并发跑 doctor 均只读无竞态；merge-base 锚解析只读 git，无写面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

答：安全。run 中断重入时守卫在每次注册前重判，幽灵态中途出现（如 push 后 merge 带回）也会被下一次 run 拦截；verify 对账锚每次实时解析，不缓存陈旧基点。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

答：不会。archive 判定锚当前 specBase，跨仓/worktree 各自独立判定；merge-base 优先 meta.baseBranch（立项时记录的主分支名），回退 main→master，跨仓默认分支名差异不致误锚。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

答：最大风险是幽灵守卫误拦「归档后重开」的合法同名变更——用「库内有活跃行即放行」消解（test 用例②钉住）。fail-open 语义分两层：外层守卫异常 fail-open 不阻断正常流程；内层库列举失败按无活跃行处置（fail-closed 保守向，评审 P2-2 修正披露）——误拦合法重开的代价是重跑一次，漏放幽灵的代价是幽灵行推上平台，两害取其轻。死路（试过放弃）：doctor 侧建议 --align-execute-progress 给幽灵补戳——等于给幽灵态背书，放弃（只报不治 + 显式勿用警示）；对账锚直接用 HEAD 短路 mb==HEAD 形态——会把 in-place 主分支形态的 diff 面清空，放弃（三重守卫保守退旧区间，只窄不宽）。
