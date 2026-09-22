---
author: qinyi
created_at: 2026-06-04 16:55:00
---

# 未分类知识

> execute/quick 执行中发现的坑暂存于此，用户审阅后归类到对应文件并更新 INDEX.md。

## verify 报告探针预填段禁止摘要化改写（防篡改门按锚点对比）
写 verify-result.md 时把 CLI 预填的探针段（探针 1 未实现标记清单/探针 3 测试存在性/探针 5 parity 锚行等）改写成自己的语义总结，会触发「探针一致性抽查」ERROR 级阻断（重跑计数 vs 正文锚点不符，疑似篡改）——即使总结内容属实。正确姿势：预填段逐字保留，语义复核以 ℹ️ 注记行追加在段尾；想重新拿预填段须删文件重跑 `verify-probes --init`（已存在不覆盖）。另：agent 执行段（探针 2/4/7）才是自由填写面。（2026-09-19-review-material-cli-wiring verify 会话实证：3 次 gate 回滚其一）

## docs/prompt 镜像 _verify 失配数随「变更时代」漂移（动态阶段示例值）
docs/prompt/_extract.mjs 抽取的 plan/execute 动态步骤 prompt 会内嵌**当前变更上下文的示例值**（如 change 路径 `2026-09-21-r5-efficiency-batch1\.sillyspec\changes\...`）；_sync.mjs 对 plan/execute 两阶段按 DYNAMIC 名单跳过机械同步（md fence 带示例值人工策展）。因此 worktree 里重生 json 后，md fence 里上一时代的示例路径会让 _verify 多出失配（如 batch1→batch2 时代路径 diff 使 plan#3 失配），并非源码/镜像真漂移。收口动作：把 mirror fence 里的旧时代 change 名 sed 成当前变更名即可追平；往 mirror fence 里手加「条件注入行示例」（如推荐分组行）反而会破坏逐字匹配（json 里的探测渲染不含该行）——条件注入的正确镜像写法是 fence 上方加注记段，不是 fence 内加示例。判据：_verify 失配清单与主仓基线逐条对比，多出的条目先查是不是时代示例值。（来源：2026-09-21-r5-efficiency-batch2 task-05）

## 修 gate-snapshot 自身的变更在 verify 门遇「快照分叉假红」鸡生蛋
verify 门（--done 实测）跑在主仓进程、用主仓**当前已 apply** 的 gate-snapshot 代码装配隔离快照（HEAD+本变更文件 overlay 自 worktree）。若本变更恰好修 gate-snapshot 的双写分叉语义（如 2026-09-21-r5-efficiency-batch2 M2/D-002@v2 分叉取 worktree），修复未 apply 前门仍用旧语义（分叉取主仓）——此时主仓侧同文件若有并行会话在途异动（③态成立），快照会装入**主仓并行版**而非本变更 worktree 版，本变更的新测试对旧码断言→确定性假红（实证：module[cli-core,run-gates]+deps 2 行，主仓 execute.js+1 行并行 quick 修复窗口）。判据：快照挂而 worktree 定向全量绿 + 快照警告日志含「双写分叉：…取主仓」旧文案。处置：CLI 排查路径② `SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF=1` 回退主仓口径对照过门（如实披露口径差异），apply 后主仓复跑终局对账——修复随 apply 生效后此场景永久消失。勿改测试迁就旧码。（来源：2026-09-21-r5-efficiency-batch2 verify，D-002@v2 修复场景活实证）

## detached 长驻子进程必须有独立于 spawn 环境的自杀条件（41 孤儿 watcher 泄漏实证）
现象：全量测试套件后 41 个 watcher 孤儿进程存活，每 3s 轮询 git（每秒十几次 git/conhost 闪现，用户侧当病毒排查）。
根因：spawn 侧环境闸（NODE_TEST_CONTEXT/SILLYSPEC_WATCHER）只拦「我拉起的这条路」，测试内 CLI 子进程自带自定义 env 绕过；而 watcher 设计上未连平台也 spawn+自刷心跳租约=无外部判死锚，测试临时目录又不清理 → 永续孤儿。
护栏（三闸模式，通用）：①出生即死——首拍已是终态（对象不存在）立即退出；②外部资源蒸发——依赖的外部资源（git 仓/目录）连续 N 拍消失即退；③硬寿命帽——无论活跃与否 T 小时绝对退出。另：套件 runner 注入全局逃生阀（run-tests.mjs SILLYSPEC_WATCHER=0）+真子进程回归钉（主路径而非只边缘路径——本次常量缺失崩启动恰是只测边缘路径漏掉的）。
证据：2026-09-22 用户会话抓现行 41 进程+杀灭后零闪现；src/watcher.js 三闸+test/watcher.test.mjs 两枚真子进程钉。（来源：2026-09-22-r7-protocol-surgery task-01）
