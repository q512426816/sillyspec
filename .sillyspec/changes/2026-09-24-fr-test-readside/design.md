---
author: qinyi
created_at: 2026-09-24 14:10:00
---
# 设计（Design）— 2026-09-24-fr-test-readside

> 设计输入：fr-test-binding 方案 §3.3/§3.4/§3.6/§5 读侧（六轮收敛）；前置=
> P0（5d102aee）+ 写侧（3143aadc）。

## 背景与目标
- 背景：绑定台账已活（写侧），但 verify 跑集未消费——账面与执行脱节。
- 目标：跑集 = 现选测 ∪ trace[本变更锚点集] 残差（只加法防假绿）；悬空硬错
  可修复；差集披露机械可算；账本对 trace 变更 fail-closed。

## 范围与总体方案：架构
- **核心落点 src/verify-postcheck.js**（runVerifyTestCheck 内 additive 挂点）：
  - `resolveVerifyAnchorSet({specBase, changeName})`：tasks/*.md requirement_ids 并集。
  - `resolveTraceResidual({specBase, changeName, cwd})`：trace 行过滤（active/
    非 superseded/锚命中）→ { rows, files, dangling }；orphan/candidate 不进。
  - `runTraceResidual({cwd, specBase, files})`：buildDepsBatches 同口径组卷执行
    （node --test 段 / pytest 段），无法归一抛错。
  - 门入口：dangling 非空 → 直接 failed 硬拦（fail-fast，不跑任何测试）。
  - 主结果后：按 FR-03 矩阵并入残差段；merge 结果 mode 附加 `+trace(N)`。
- **披露 src/verify-postcheck.js**：writeTraceDisclosure sidecar + console 摘要行。
- **账本护栏 src/run/gates.js**：consult/record 前读 trace——非空行存在即跳过
  （现 v2 键不含残差 plan，宁停复用不误绿）。

## 行为矩阵（现选测动作 × trace）
| 动作 | trace 空 | trace 非空 |
|---|---|---|
| full / module-subset / deps-auto-subset | 原行为 | 原行为 + 残差段 |
| skip / module-zero-hit-skip | 原行为（skip） | **跑 trace 残差**（mode=trace-residual） |

## 文件变更清单
- `src/verify-postcheck.js`
  锚点集/残差/悬空/残差执行/合并/披露（task-01~04）
- `src/run/gates.js`
  verify 门账本停复用护栏（task-05）
- `src/test-bindings.js`
  readChangeTrace 已有；如需行过滤助手在此补（保持单点解析）
- `NEW:test/verify-trace-residual.test.mjs`
  读侧全链单测（task-06）

## 自审（Self-Review）
- 现选测决策与执行分支逐字保留——残差只在结果层加法（D-002）。
- trace 空 = 零行为漂移（回归钉：无 trace 变更门禁输出逐字节同前置）。
- 悬空 fail-fast 在门入口（先于任何执行——不烧套件墙钟再拦）。
- 残留不确定：buildDepsBatches 的导出形态（函数签名/是否可喂裸文件清单）——
  task-02 落地时以既有签名为准，必要时加薄适配不改其组卷逻辑。

## 边界与风险
- pytest 段一期仅在模块命令已配 pytest 前缀时可用，否则 .py 残差硬错（方案
  「无法归一硬错不猜测」——宁可拦不瞎跑）。
- 披露 sidecar 每门重写（幂等，覆盖式）。
- 退役判据：若收窄另案落地（跑集=仅锚点），残差段退化为跑集本体，本模块
  合并不变。
