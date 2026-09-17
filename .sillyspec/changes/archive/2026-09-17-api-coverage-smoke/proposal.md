---
author: qinyi
created_at: 2026-09-17 21:50:00
---

# 提案书（Proposal）

## 动机

批次 A（v3.28.11）封死了「已知未验证区静默 PASS」，但 EHS 复盘的另一半缺口仍在：5 个 P1 长在跨层契约漂移与运行时行为（字段错位/必填漏发/越权/事务/分页语义），静态门原理上抓不住。本批补**运行时验证的地板**：接口验证覆盖矩阵定「测什么」（表驱动，断言有依据物），commands.smoke 定「怎么跑」（CLI 亲跑，回执机器实录）——让「判级 critical + 结论 PASS」从此隐含「至少跑过一条真实接口链路」。

## 关键问题

1. **测什么无依据物**：EHS 单测因有 design 转移表可依而扎实，接口层因无依据物而零派生——冒烟会退回 agent 自由发挥；需要接口表机械预填 + 行数对账 + 用例挂依据 ID。
2. **执行面可伪造**：集成回执是 agent 自报（EHS 三条 compile log 混过四条件）；需要 CLI 亲跑 + 机器段不可改写 + 来源标记由 CLI 打标（Grill B-1：脚本形态 smoke 命令在既有分类正则下判 build 会误拦金路径——分类链必须同步修）。
3. **覆盖记账语义**：行在场但判定 uncovered/partial 若计入覆盖即复刻「静默 PASS」（Grill B-2）——分子只认 covered，partial/uncovered 须移交承载。

## 变更范围

- `commands.smoke` 配置键 + quality-scan 亲跑（300s 帽/快照超时回退主仓/指纹自动覆盖）
- `facts.smokeRan` 第五事实条件（判级 critical 限定，初版封顶不 fail，不设 handover 豁免子句）
- 回执机器段（source: cli-noai-smoke 标记 + parseEvidenceSlots 逐条提取 + 分类器直判 cross-layer + checkProbeConsistency 回执槽一致性对比）
- 接口验证覆盖矩阵（parseDesignApiTable tolerant 解析/covered 记账/锚点解析级校验/探索性与子行不计账/声明降级/移交联动）
- 消费面（端点×消费端 advisory，锚点=payload 构造点）+ 表间完备性（写端点×权限矩阵 advisory）
- smoke 纪律进 prompt（表驱动派生/负向下界/并行起服/严格 sql_mode）+ checklist verify 键 + 矛盾文案改写 + 镜像再生

## 不在范围内（显式清单）

- 浏览器 E2E（Tier 2 后续）/ probe8 代码级直比（批次 B）/ keep-alive 与外部实例档 / 接口测试框架 / probe7 既有矩阵改动 / per-task smoke / normative 接口表格式硬契约

## 成功标准（可验证）

- 配置 commands.smoke 后 CLI 亲跑（exit/log/mtime 机器实录），未配置零行为变化，指纹命中复用不重跑
- 判级 critical + smokeRan≠ran + 结论 PASS → 封顶 error（smoke-not-run 枚举）；advisory handover 不豁免
- 脚本形态 smoke 命令（node scripts/smoke.mjs 等）机器回执判 cross-layer（金路径不误拦）
- 接口表 N 端点 → 矩阵 covered 行数对账；uncovered/partial 端点行无移交承载 → error；non-testable 理由即合法
- 主仓 npm test 全绿 + lint 绿，+50~70 断言
