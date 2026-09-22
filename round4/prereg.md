# R4 对照实验·预注册（2026-09-20，跑前锁死）

## 目的

验证 3.29.1–3.29.4 效率修复栈（波次拓扑守卫 / 假红分诊去重 / 审查经济学四律 / 卡片直填 / 验证批处理 / quick 资产尾）在受控重放下的真实效果。

## 设计

**重放第 3 轮任务、同基线、只换工具版本**（当轮 ~3.28/3.29.0 → 3.29.4）。老版本数据直接作对照臂，不重跑；OpenSpec 侧不重跑（复用第 3 轮实测）。

## 运行矩阵

| 跑 | 任务 | 通道 | 工作树（platform 仓） | 基线 | 对照臂 |
|----|------|------|----------------------|------|--------|
| R4-L | session-replay 大任务 | 全流程 | `.sillyspec/.runtime/worktrees/2026-09-20-r4-session-replay` | 53c67e02a | 第 3 轮同基线重做 **269min**（本地 db 硬账：681 请求 / 104.13M tokens / 12 子代理；db 标题实证为 **Fork 续跑**） |
| R4-S-F | autocompact 小任务 | 全流程（钉死） | `.../2026-09-20-r4-autocompact-full` | 50736b6ef | 第 3 轮 sillyspec 全流程 **39.5min / 17.2M**（会话在平台服务器侧，本地 db 不可复核，取当轮分析值） |
| R4-S-Q | autocompact 小任务 | quick（钉死） | `.../2026-09-20-r4-autocompact-quick` | 50736b6ef | OpenSpec **25min / 33.3M**（产品级参照，同上来源） |
| R4-O-L | session-replay 大任务 | OpenSpec 1.13.1 | `.../2026-09-20-r4-openspec-large` | 53c67e02a | 第 3 轮 openspec 实测（**也是 Fork 续跑**：288 请求 / 80.03M / 跨度 177.8min）——重跑目的：剔除 fork 混杂的同条件横评 |
| R4-O-S | autocompact 小任务 | OpenSpec 1.13.1 | `.../2026-09-20-r4-openspec-small` | 50736b6ef | 第 3 轮 openspec **25min / 33.3M** |
| R4-L2 | 同 R4-L | 同 | 复用 | 同 | **条件跑**：仅当 R4-L 墙钟结论与机制证据矛盾时补 |

## 对比的三层结构（怎么比）

1. **纵向主判定**（修复有没有用）：R4-L vs 269min、R4-S-F vs 39.5min——同任务同基线同 harness，唯一变量是 sillyspec 版本（3.28/3.29.0 → 3.29.4）。
2. **横向对撞**（跟 OpenSpec 拉平没有）：R4-L vs R4-O-L、R4-S-Q vs R4-O-S——两侧都是全新会话、同基线、同时段，第 4 轮新增（第 3 轮两侧数据均带 fork 混杂，作参考不作判定）。
3. **机制点**（为什么）：H2 五点二进制判定，横纵向解释力来源。

## 固定变量（防污染清单，逐条对应前几轮踩过的坑）

- 同机、同 harness（zcode 平台）、同模型、**全新会话**——禁 fork/继承续跑（第 2 轮最大 token 混杂源是分叉继承胖上下文）。
- 任务文本 = 归档 proposal verbatim（brief-autocompact.md / brief-session-replay.md）。
- 基线 commit 钉死（上表）；npm 全局 3.29.4 钉死，会话首步回显 `sillyspec --version` 进 transcript 作证。
- `local.yaml` 三工作树同拷（主仓复制）——否则 quick --done 测试门禁静默跳过。
- 会话标题含 `R4-` 前缀（db 归账定位用）。

## 假设与判定线

| # | 假设 | 判定线 | 载体 |
|---|------|--------|------|
| H1 | 大任务墙钟量级下降 | R4-L ≤150min 通过（269 的 56%）；≤100min 理想 | R4-L |
| H2 | 机制真实生效（非纸面） | 以下 5 点 ≥3 中：a 波次并发（同波 ≥2 任务窗口重叠≥1 次）；b 无假红循环（同 gate 连续 FAIL≥3 计为循环）；c verify 批量补完（缺口单轮批补非逐条多轮）；d 审查请求钳 design≤12/plan≤10/QA≤15；e plan 零卡片填充子代理 | R4-L |
| H3 | 提示词级修复可靠性 | H2-d 不达标 ⇒ 结论「四律被 agent 无视，需机制化」，列入后续工作项 | R4-L |
| H4 | quick 资产尾 | R4-S-Q `--done` 后：`2026-09-20-r4-linked-parent` 被 lite-archive 且 FR/decisions 落盘 knowledge | R4-S-Q |
| H5 | 小任务全流程提速 | R4-S-F ≤30min（39.5 降 ≥24%）且无假红循环 | R4-S-F |
| H6 | 小任务轻通道对齐 | R4-S-Q ≤20min 且 --done 一次过 | R4-S-Q |

**量级原则**：单跑噪声大，结论只对量级跳变负责，不对 ±20% 负责；机制点（二进制可判）优先于墙钟均值。

## 已知混杂（事先声明，防事后找补）

1. 269min 对照会话**已确证为 Fork 续跑**（db 标题「新版 Fork of …」实证）——fork 继承胖上下文是第 2 轮实证的最大 token 混杂源，对照臂墙钟天然偏悲观；若 R4-L 大幅优于对照，墙钟结论保守表述，机制点为主证据。
2. brief 用归档 proposal 而非用户原始口语 prompt（信息量等价，措辞不同）。
3. 小任务基线含 redlines.yaml、大任务基线不含——各自忠实重放第 3 轮当侧条件，非失衡。
4. R4-S-Q 的 linked-parent 为手放 fixture（H4 机制验证用）；其 requirements 为 3 条精简版，不超 proposal 已有信息。
5. R4-S-Q 钉 quick、R4-S-F 钉全流程——通道是实验变量，不是 agent 自选（路由行为不在本轮假设里）。

## 采集

- **R4 会话必须在本地 zcode 新建**（标题带 `R4-` 前缀）——本地 db 才能归账；第 3 轮小任务会话在平台服务器侧、本地 db 无痕，勿重蹈。若某跑必须在平台服务器执行，usage 从平台会话回放页读（回放功能已上线，正好自举）。
- **zcode db**（`round4/account.mjs`）：按标题 `R4-` 定位主会话，`parent_id` 递归滚子会话；requests / tokens / model-time 汇总。`started_at` 一律数值 epoch-ms 比较（第 2/3 轮各踩过一次字符串比较静默错坑；`session.time_created` 同为数值 ms，本日已复核）。
- **transcript**：`analyze-transcript.cjs` 命令级重复/慢命令。
- **平台侧**：progress db 阶段时间戳、write-audit.jsonl。
- **机制点人工判**：波次并发=同波两任务执行窗口重叠；假红=gate FAIL 计数；审查钳=review 子会话请求数；批量补完=verify 轮次与补丁粒度。

## 执行顺序

R4-L 先开（主战场）；R4-S-F / R4-S-Q 可与其并行（不同工作树互不干扰）。全部终态（archive / --done 落账）后叫核算。
