# 门禁价值考古——测试门的真拦/假拦判读（2026-09-21）

> 数据源：multi-agent-platform 主仓 `.runtime/verify-runs/` 320 个运行工件（227 次有效 test 门运行）+ `verify-lint-tally.json` + 5 个 friction-tally + 2 次 R4 实测。
> 样本期：2026-07-22 → 2026-09-20（约 2 个月，49 个变更发生过失败）。
> 用途：回答「模块全量门禁在期望上拦过什么」，为 3.29.5 第 5 项（测试口径范围化）提供粒度决策依据。

## 测试门（227 跑 / 106 败 / 47% 失败率）

| 分桶 | 次数 | 占比 | 判定 |
|---|---|---|---|
| **real-test-fail（真拦）** | **12** | 11% | pytest/vitest 摘要行 failed>0——agent 声称完成但测试实测挂 |
| timeout（≥590s 或 exit 143） | 36 | 34% | 假拦（门禁 600s 上限杀） |
| 尾截不可判（尾部全 passed 但 exit 1） | 46 | 43% | 多模块串行跑、失败在尾部窗口外的模块——真/假不可判（工件只存 output_tail） |
| runner 崩溃（tinypool/heap） | 3 | 3% | 假拦（环境） |
| env/配置错（--no-cov 未装、模块路径不存在） | 2 | 2% | 假拦（环境） |
| fixture 装配错（16 errors） | 1 | 1% | 存疑 |
| unknown | 6 | 6% | — |

**真拦率区间：11%（下界 12/106）~ 55%（上界含尾截桶）**；确认假拦（超时+崩溃+环境）≥ 40%。

## lint 门（68 跑 / 19 败 / 28%）

滚动台账只留 3 条明细（2 超时 + 1 泛化），另有两个已知存量债拦截实例（R4-S-Q quick 门、R4-S-F verify 门）。明细留存不足，无法算真拦率。

## 关键抽验：真拦的「形态」决定范围化粒度

**案例 2026-09-02-changes-overview-card（2 次 verify 门真拦，各 10 个测试挂）**：
- 变更触碰面（apply-pathspec）：`backend/app/modules/daemon/{model,router,runtime/service,service}.py` + 前端 + sillyhub-daemon 等 19 文件；
- 门禁挂点：`backend/app/modules/daemon/host_fs/tests/test_delegate_worktree.py`（9 个）+ `daemon/tests/test_worker_redispatch.py`（1 个）——**同模块、但不在变更自己的测试文件清单里**。

结论：
1. **文件粒度范围化（只跑 touched files 的测试）会漏掉这种真拦**——改模块代码弄挂了同模块相邻测试，agent 自己声明的测试面看不见它；
2. **模块粒度范围化（跑任何触碰模块的全套测试）能保住**——挂点全在 `app/modules/daemon` 触碰模块内；
3. 超时 36 次 + 尾截 46 次的噪声大头来自「跑所有模块」——范围化到触碰模块同时砍时长与假拦。

## 成本-收益账（供产品决策，不下结论）

- 227 次门禁 × 5–9min ≈ **19–34 小时门禁时间**，换 **≥12 次真拦**（每次都是「agent 说做完了但测试说没有」）≈ 1.6–2.8h/次真拦；
- 对照组（OpenSpec 无门禁）：这 12 次会直接带病提交，靠 pre-commit/CI 或人工发现；
- CLAUDE.md 规则 0「只跑自己修改相关的测试」语义歧义（文件级还是模块级）——本数据支持**按模块级**解释。

## 给 3.29.5 第 5 项的落地建议（需转达）

- scope 取 **touched modules**（触碰模块的全套测试），不要 touched files；
- 超时帽 600s 需同步处理（36 次假拦的头号来源——范围化后模块内超时应大幅减少，但帽本身对 daemon/frontend 大模块仍可能杀）；

## 本判读的局限

- 单仓样本（multi-agent-platform，测试密集型 monorepo）；
- 46 条尾截不可判未深挖（需逐条对 git 历史判「修复提交是否紧随」才能定真伪）；
- lint 门明细留存不足；
- 「真拦 = 有价值」仍是覆盖率视角，未追踪这 12 次如果不拦的实际损失（有无被 pre-commit/CI 兜住的反事实不可得）。
