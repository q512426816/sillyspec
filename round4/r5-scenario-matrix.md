# R5 场景矩阵与执行协议（2026-09-21 落盘，依据 optimization-plan.md v3.2 + 第 1 批交付态）

## 场景与臂

| 场景 | 基线（对撞仓 multi-agent-platform） | 跑法 | 备注 |
|---|---|---|---|
| 大任务（session-replay 同款） | 53c67e02a | ×2 跑 | 一跑 B-④ 材料包 OFF（缺省）、一跑 ON——互斥归因标签（v3.2 纪律二） |
| 小任务全流程（autocompact 同款） | 50736b6ef | ×2 跑 | |
| 小任务 quick（同款） | 50736b6ef | ×1 跑 | 门禁轮次 ≤2 判定主力场景（A 先于 B 纪律） |
| （可选）B-⑤ A/B | 50736b6ef | 小任务便宜档 ×1 | 与旗舰档同任务对照；返工率+核验密度双维否决线；审慎起见可推迟 R6 |

版本钉死首步回显：受试会话第一步输出回显 sillyspec 版本 + 已落地批次（batch1 e49a7ce0 前序 / batch2 若已入库记录其 HEAD）——**M3（派发分组预计算）若在 R5 前落地，B-③ 归因必须与 M3 分开记**（提示词级 vs 机制化，v3.2 换位说明）。

## 跑前清单（按序）

1. `git -C multi-agent-platform worktree prune`（Temp 残留 prunable gate worktree 清理；基线 SHA 50736b6ef/53c67e02a 已 2026-09-21 cat-file 实证在场，主树干净）。
2. **B-④ 接线补齐**：execute 主链材料包生成未接（batch1 task-02 接线最小化）——小 quick 一项（assembleExecuteTaskMaterials 调用点 + options.materials 装配）或并入 batch2 M3；不接则 ON 臂无法跑，矩阵降级为 OFF-only。
3. R4 prompt 卫生沿用：受试会话任务书钉死「禁捞未来提交/版本首步回显/全流程勿降级」三律（prompt-R4-*.md 直接复用改版本号）。
4. 探针套件预跑：`node --test test/probe-suite/wrong-key.test.mjs` 在受试 sillyspec 版本上绿——防线敏感性前置自证。

## 指标判法（account.mjs v2 同口径，只比比值不比绝对值）

| 硬门 | 判法 | R4 基线（2026-09-21 钉死） |
|---|---|---|
| 扇出 tokens ≤32M | account.mjs 子会话聚合 totTok（子代列） | 42.26M |
| 门禁轮次 ≤2 | 进度库 gate 记录计数 | 9（S-F 病理）/ 2（稳态） |
| 防线回归 | probe-suite 绿 + 受试 transcript 错键类仍被拦 | — |
| 墙钟不劣化 ≤156min | 会话时间戳（跨度列） | 184.5min 毛口径 / 156min 稳态重构口径 |
| 额度零事故 | 受试过程无整 Wave 中断 | R4-L 有（并发帽前） |

拉伸（不判罚）：账单当量比 ≤1.8× —— `node round4/account.mjs --title R5-<臂> --since <日>` 的 当量@3× 列对同名对照臂取比；基线 2.37×（@3×）/2.47×（@5×），R4-L 13.89M / R4-O-L 5.87M。记录不判罚行：主会话峰值单请求 <250K（MAX 查询）、>150K 占比 <50%（计数查询）——依赖第 3 批 B3b，R5 只落基线。

**阶段级墙钟拆账（每跑必落）**：用 round4/extract-timeline.mjs 抽受试主会话时间线，按 CLI 阶段标记切六段（调研/plan/execute 扇出/verify/归档/门禁等待），落 r5-wall-accounting 表——R6 per-item 时间预算的唯一数据源（v3.2 先测后诺）。

## 归因标签（防混账）

- B-④ ON/OFF 臂差 = 材料包贡献（上下文乘数）。
- 门禁轮次改善归战线 A（已提交四项），**不记 B-③ 提示词**；M3 若在场单列。
- 轮数纪律（B-⑥）效果看子代理请求数列（基线大任务 522req），与扇出 tokens 分列记录。
- batch2 M1（指令指纹增量）若在场：主会话 CLI 渲染体量单列（B3a 口径复跑），不并入扇出账。

## 诚实边界

- 2 跑取分布不外推；提示词级项不达标即升级机制化（路径：CLI 截断注入/机械组装）。
- B-⑤ 若推迟，对外口径维持「模型分级未启用」。
- 墙钟 156min 为重构口径，毛口径 184.5min 一并记录防口径混用。
