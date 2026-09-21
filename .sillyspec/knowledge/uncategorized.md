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
