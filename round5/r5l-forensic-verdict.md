# R5-L 法证终账与第 3 批方案（2026-09-22 凌晨定稿）

依据链：R5-L 实跑（sillyspec 3.30.0，2026-09-21 21:28–00:41，已归档）vs R4-O-L（OpenSpec 1.13.1 同任务同基线 53c67e02a）双会话逐请求法证对比。数据源 `zcode db`（model_usage 420+251 请求 / part 全量工具内容），复现脚本 `C:\Users\qinyi\AppData\Local\Temp\forensic_buckets.mjs`（只读，未入仓；归档时收编 round5/）。

---

## 一、总账

| | R5-L（sillyspec） | R4-O-L（OpenSpec） | Δ |
|---|---|---|---|
| 墙钟 | 193.1min | 80.2min | **+112.9m** |
| 请求（主会话） | 420（+26 子代理） | 251 | +169 |
| 输入 token | 134.2M | 51.9M | **+82.3M** |
| 缓存读 | 133.2M（99.3%） | 51.6M | +81.7M |
| 账单当量 @3× | 15.76M | 5.87M | 2.68× |
| 子代理 | 3 个 / 1.94M | 0 | — |
| 模型时长 | 85.5m | 43.7m | +41.8m |

四门判分：扇出 ≤32M **PASS**（1.94M，击穿 17 倍）；门禁轮次 ≤2 **边界**（verify 扫描 3 轮，两轮为快照缺 hatchling 环境性失败，新坑 P17）；墙钟 ≤156 **FAIL**（193.1′）；当量 ≤1.8× **FAIL**（2.68×）。

## 二、核心结论（法证级，已核对复现）

**多烧的 82.3M 输入 token 中 94%（77.7M）是流程自转，不是干活；R5-L 的写码桶（10.45M）甚至比 OpenSpec（14.40M）便宜 3.9M。**

| # | 浪费桶 | Δ tokens | 请求对比 | 实证内容 |
|---|---|---|---|---|
| ① | CLI 状态机往返 | **+29.1M** | 106 vs 18 | `run brainstorm`×19、`run verify`×18、`wt-commit`×14、`run plan`×9、`review write`×6、`task start/finish`、gate、progress……每次往返按当时全量上下文计费，输出被 grep 滤掉也省不掉这次重发 |
| ② | spec 工件维护闭环 | **+28.9M** | 97 vs 11 | `verify-result.md` 读写 **14 次**（python heredoc 反复回填）、`design.md`×10、task 卡重写、symbol/module-impact、模块文档通读。OpenSpec 只写 proposal/design/tasks 各一轮 |
| ③ | 门禁强制测试重跑 | **+19.7M** | 80 vs 48 | `SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1` 绕过失败签名去重强制重扫 + tsc/vitest 多轮（含任务粒度差异，约 2/3 为流程税） |
| ④ | 读码 | +6.1M | 73 vs 59 | 大体对称，多出部分为 `.sillyspec/docs` 模块文档面 |

墙钟差 112.9m 分解：**~58m 纯等待**（三次质量扫描 ~24m、两个挂起 heredoc 各 7m、7.8m 切换空档）+ 流程请求把会话上下文滚到 490K 后每条琐碎命令以 0.5M token/条计价的尾部乘数（归档尾段 Top10 请求各 ~530K 输入干 15 秒的活）。

**两个修正（对早期判断）**：
- "CLI 注入被 grep 滤掉所以不是大头"——错。滤掉的是输出，发命令的动作本身就是一次全量重发；M1（压注入体积）治的是次要面
- handoff 方案结构性不可行——自治 agent 不能开新会话；且 OpenSpec 单会话 51.9M 证明**形态没问题，贵在自找的往返与工件**

## 三、第 3 批方案（按桶对症，全部 CLI 侧，零执行拓扑改动）

### 方案 1：CLI 命令合并（对①，quick 量级，预计 −12~15M 名义 + −20m 墙钟）

**依据**：106 次 CLI 往返中，每任务 4 连（task start → 实现 → review write → task finish，wt-commit 另计）× 13 任务 ≈ 52 次往返纯属可合并；合并后每次省一次 ~300K 上下文重发。
**改法**：
- 新命令 `sillyspec task done --change X --task NN --verdict pass --notes "..." [--commit -m "..."]`：单进程内串起 review write（落 review.json+自动勾选）→ task finish（清进行中标记）→ 可选 wt-commit（复用现有提交队列），输出合并为一段
- `task start` 的受影响测试族注入（②接线）保留，作为 `task done` 前置提示不动
**验收**：13 任务场景 CLI 调用数 52→13；单命令输出含四段结果行；既有 review write/finish 单独通道零回归。

### 方案 2：步进折叠（对①，第 3 批主菜，预计 −20M 名义）

**依据**：37 步状态机（brainstorm 8+plan 5+execute 14+verify 7+archive 3）× 每步 ≥2 请求（渲染+完成）。R5-L 的方案步/澄清步记录全是"用户经提案书预先指定"——决策密度为零仍走全仪式。
**改法**：
- ceremony-tier 加**决策密度轴**（C2 两实证：batch2 高密度值回票价 / R5-L 低密度纯付税）：提案书已冻结接口/边界/验收 → 自动降 S1 → brainstorm 8 步折叠为 3 步（上下文+设计一体落盘、自审清单、生成规范），verify 7→4（合并探针初始化与逐项检查）
- execute 前置 4 步（进度确认/加载上下文/worktree/范围）折叠为 1 步单次渲染；收尾 5 步（对照设计/运行测试/代码审查/知识库/完成确认）在 main 模式下折叠为 1 步（子代理模式保留）
**验收**：低密度任务全程步数 37→~20；渲染请求减半；既有全流程变更零回归（高密度路径步数不变）。

### 方案 3：verify-result 终稿 CLI 直出（对②，quick~小 change，预计 −8~10M 名义 + −14m 墙钟）

**依据**：`verify-result.md` 被读写 14 次、每次 heredoc 回填一次全量重发，且两次 heredoc 各挂起 7 分钟；模板 29KB 里 CLI 已能机械预填 70%（探针/矩阵/决策追踪已在 verify-probes --init 预填）。
**改法**：
- `sillyspec verify-probes --init` 升级为 `--draft`：除探针外把任务完成度/设计一致性/决策追踪/运行时证据四节的 CLI 可算部分全部预填成完整句子，agent 只填三处人工槽（结论枚举/移交项/代码审查叙述），槽位用显式 `<!--AGENT:-->` 标记
- 禁 heredoc：verify 步骤 prompt 明示"用 Edit 填槽，勿 python 重写全文"（挂起实证）
**验收**：verify-result 读写次数 ≤3（init draft → Edit 填槽 → CLI 复核）；三槽之外零手写。

### 方案 4：RERUN 失败签名闸（对③，quick 量级，预计 −6~8M 名义 + −17m 墙钟）

**依据**：两次 `RERUN=1` 强制重扫各烧 ~8M 重发 + 10m/6.8m 等待，而失败签名（代码指纹+豁免面）未变——重跑结果注定相同。
**改法**：`SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1` 生效前先算失败签名，签名未变时拒绝重跑并打印"出路四选一"既有文案（修代码/补豁免/换口径/真环境已变则签名自变）；仅签名变化或 `RERUN=force` 才放行。
**验收**：同签名 RERUN 被拒且退出码非 0；改代码后签名失配自动放行。

### 方案 5（顺带）：快照 uv 构建依赖链接（对 P17 新坑，quick 量级）

**依据**：R5-L verify 三轮卡 37 分钟的直接根因——隔离快照内 backend 的 uv 构建环境缺 `hatchling`，EPERM 两轮假红。
**改法**：`createGateSnapshot` 的环境链接面（已有 node_modules/venv 族）补 uv 构建缓存目录（`~/.cache/uv` / `%LOCALAPPDATA%/uv`）junction；E2E 基建（gate-snapshot-e2e）加一个"快照内构建依赖可用"场景。
**验收**：E2E 新场景绿；R6 重放 verify 无 hatchling 类假红。

## 四、预期与验证

三刀合计估算：请求 420→~250、均值上下文 306K→~230K → **名义 ~57M、当量 ~7M、当量比 ~1.2×**（对 OpenSpec 5.87M），墙钟 ~120–130m。四门重判：扇出保持 PASS、墙钟进 156 门、当量进 1.8× 拉伸线。

**验证协议**：R6 重放（同任务同基线，仅换含第 3 批的版本），用同一法证脚本出桶级对比——判据就一条：流程三桶 Δ 从 77.7M 压到 ≤20M。

## 五、降级与撤回清单（如实记录）

- M1 指纹翻默认：**降级**——管道纪律 agent 面前收益≈0（实证），定位改为服务无过滤习惯的 agent/人类直跑
- ① Wave handoff 接线：**降级为中性提示**——自治 agent 结构上不能换会话；账本保留作 R6 会话形态判读数据源；marker/硬门方案撤回
- wave 级子代理方案：**撤回**——重蹈 R4 冷启动税；OpenSpec 单会话数据证明形态非问题

## 六、边界星号（判读时带看）

- TEST 桶 +19.7M 中约 1/3 为任务粒度差异非纯浪费；READ/MISC 有 ±5M 对称渗漏
- R5-L 尾段与我方分析会话共用机器（争抢会拖慢 vitest/扫描），墙钟含并发混杂
- 法证 420 请求为主会话口径（子代理 26 请求 1.94M 另计），与 account 446 口径差已对账
