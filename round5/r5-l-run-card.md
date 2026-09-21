# R5-L 运行卡（R4-L 同款重放 · sillyspec 3.30.0 · 2026-09-21）

R4-L 基线（对照臂，不重跑）：**185min / 767 请求 / 99.1M tokens / 19 子代理 / verify PASS+归档**（H1 ≤150min FAIL）。
变量唯一性：同任务（brief verbatim）· 同基线（53c67e02a）· 同机同 harness（本机 zcode 全新会话）· 同模型 —— 只换 sillyspec 3.29.4 → **3.30.0**（含 batch0/batch1/batch2/接线三件/E2E），外加声明变量 `SILLYSPEC_STEP_GUIDE=1`（M1 opt-in，本跑测量项）。

## 已备好（本会话完成）

- ✅ 全局 `sillyspec 3.30.0` 已装（本机 `sillyspec --version` 实测）
- ✅ 工作树 `multi-agent-platform\.sillyspec\.runtime\worktrees\2026-09-21-r5-session-replay`（分支 sillyspec/2026-09-21-r5-session-replay @ 53c67e02a，实测钉住）
- ✅ local.yaml 已按预注册从平台主仓拷入（test/lint 三链命令在）
- ✅ 提示词 [prompt-R5-L.md](./prompt-R5-L.md)（与 R4-L 逐字同源，仅改：工作树/变更名/版本/env/R5-L 标题/防作弊第 2 条补禁读 R4 工作树——那里有上一轮答案）

## 发枪（你做，一步）

新开一个 zcode 会话（标题含 `R5-L`），把 prompt-R5-L.md 全文粘贴进去，等它跑完到归档（预计 1.5~3h）。

## R5 验收门（optimization-plan v3.2 硬门 + 今日修复映射）

| 门 | 线 | R4-L 实测 | 本次依据修复 |
|---|---|---|---|
| 硬1 扇出 | **≤32M** | 42.3M（19 子代理吃 43% tokens） | M3 分组默认化（交接单位升组）+材料包+返回契约 |
| 硬2 门禁轮次 | **≤2** | R4-L 本身 1 过；R4-S-F 171min 门禁循环为病理参照 | batch1 fail-fast/归属鉴定+batch0 假阳性放行 |
| 硬3 防线回归 | 错键类仍被拦+审查钳达标 | — | 错键探针套件在场（test/probe-suite） |
| 硬4 墙钟不劣化 | **≤156min**（稳态口径；R4-L 毛值 185） | 185min | ①handoff 默认动作+M1 注入瘦身+M3/M4 |
| 拉伸 | 账单当量 ≤1.8× / 墙钟 ≤120min | 2.4× | 全栈叠加 |

**机制行为采集（判"为什么"，不劳受试会话——事后从工件读）**：Wave 边界 handoff 提示出现次数与是否照做（progress+transcript）；`task start` 受影响测试族注入消费；M1 复入短输出实例（step-guides 目录+transcript）；M3 推荐分组采纳/偏离记录。

## 归账（跑完在本仓执行）

```
node round4/account.mjs   # zcode db：按标题 R5- 定位主会话+递归子会话 → 请求/tokens/模型时长
# 扇出明细：platform 仓 sillyspec db 的 model_usage（change=2026-09-21-r5-session-replay）
# 对比页：node round5/gen-collision-html.mjs <R4-L 导出> <R5-L 导出>
```

已知混杂（事先声明）：R4-L 对照臂为独立会话无 fork（R4 已核），两跑间平台仓 main 可能前移——受试会话禁读主仓即隔离；zcode 侧若中途 daemon 截断，按截断时刻口径判（R4 同款纪律）。
