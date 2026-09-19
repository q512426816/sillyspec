---
author: qinyi
created_at: 2026-09-19 16:45:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 1+2）
- task-03

## Wave 4（依赖 Wave 1+2+3）
- task-04

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 装载层 | W1 | P0 | — | FR-01, D-003@v1 | NEW:src/span-risk-surface.js 四导出（compileSpanRiskPatterns 转义+边界锚定编译/matchSpanRiskPatterns 共享命中/loadSpanRiskPatterns project 域/loadSpanRiskPatternsAllProjects 并集；容错=空表不缺省不拦截）+ NEW:test/span-risk-surface.test.mjs（编译等价性钉：六域 21 token 展开集对代表性路径集与旧正则命中面逐字节相同，含 author/booking/lockfile 反例；装载容错；AllProjects 并集；token 去重/非字符串跳过） |
| task-02 | 纯函数层 | W2 | P0 | task-01 | FR-02, FR-03, D-003@v1 | ceremony-tier.js：computeCeremonyTier 增 opts.spanRiskPatterns（默认 []）+ span 命中循环改 matchSpanRiskPatterns（reasons 文案形态不变）+ reconcileDualRun 增 factSpanRiskPatterns 穿透；quick-gate-profile.js：riskTable 默认 [];两测试文件翻新（ceremony-tier.test 阈值 8/2 钉复跑+参数化用例+默认空=维度关；quick-gate-profile.test 依赖默认表全部块翻新——Grill X-8 点名 ：183-188/:211-214/:274/:307-326/:331-334/:359-360/:379-381+表形状测试改声明面口径+D-011 钉翻新）。此步不删 QUICK_RISK_PATH_PATTERNS（纯函数层先切换，防中间态 import 断裂——task-03 收口删除） |
| task-03 | 接线+自举+退役收口 | W3 | P0 | task-01, task-02 | FR-02, FR-03, FR-04, D-001@v1, D-002@v1, D-003@v1, D-004@v1 | 五处装载接线（run/gates.js project 域；review-tier.js + verify-postcheck.js 双点 AllProjects（factDetail 披露 + reconcileDualRun 对账穿透）；run/shared.js gateOpts.riskTable；scope-audit.js 仅 :435——X-7）;本仓 map 增 span_risk 段（9 token + 段内维护注释，X-10 落点）;config-schema note 同步;known-issues blast 缺口条目 + INDEX 路由;modules-rebuild-preserve.test 增 span_risk 段（含段内注释）回插钉;QUICK_RISK_PATH_PATTERNS 定义/导出/头注删除 + grep 清零（src+test） |
| task-04 | 契约同步与全量 | W4 | P0 | task-01,02,03 | FR-05, D-001@v1, D-004@v1 | 模块卡 4 张同步（core-engine/runtime/setup/docs-consistency）;自举走位验收（本变更自身 span 面对账：map 声明表下本变更文件面命中 migrate/dispatch 域 → span S2 预期）;npm test 全量 + lint 绿 |

## 关键路径
task-01 → task-02 → task-03 → task-04（装载层是纯函数层输入；纯函数层是接线层输入；退役收口必须在接线后防中间态断裂；task-02/03 共享文件 ceremony-tier/quick-gate-profile 收进相邻 Wave 串行，防并行互写）

## Spike
无——纯业务逻辑、技术方案确定（blast-surface.js 同构先例在案，Grill 已源码实证回插机制与等价性）。

## 全局硬约束（从 design.md 抄录，绑定所有 task）
- 价目表零改动：三轴 max 公式、SPAN_FILES_THRESHOLD=8、SPAN_MODULES_THRESHOLD=3、FRICTION_ESCALATION_THRESHOLD=2、force_tier 只升不降；既有回归钉零变化。
- blast 声明面零触碰：`_module-map.yaml` blast 段（含其在 main 缺失的现状）不动；不借道恢复 bbe30ab 自举表（D-002，独立变更收口）。
- 匹配语义零漂移：token 编译=现行正则逐字等价（前界 `(?:^|[/_-])`、后界 `(?=[/._-]|$)`、`/i`、token 转义）；等价性回归钉（六域 21 token 展开集 vs 旧正则，命中面逐字节相同）。
- 无声明/坏声明 → 空表（span 模式维度关闭），禁止回退内置表（D-008「未配置禁回退」同款）；容错=逐条跳过不缺省不拦截。
- QUICK_RISK_PATH_PATTERNS 硬退役不留 legacy；删除在接线完成后收口；`grep QUICK_RISK_PATH_PATTERNS` src+test 清零。
- scope-audit 仅 :435 接线（:517 唯一消费 unmappedFiles，不接线防死接线——Grill X-7）。
- map 维护提示落 span_risk 段内注释（键行后）——头注区/段前置注释会被 rebuild --force 丢弃（Grill X-10，modules.js:186-204）。
- 不引入 local.yaml 新键；不做 token 通配/正则语法（纯字面量）。
- 多 agent 铁律：共享文件（ceremony-tier/gates/verify-postcheck/shared）Edit 前重读最新态、锚点漂移核对。
- 零新文法：路径归一 POSIX（反斜杠）沿用现行写法；`/g` 正则 lastIndex 防御沿用。

## 全局验收标准
1. 编译等价性钉绿：六域展开 token 集对代表性路径集（含 author/booking/lockfile 反例）与旧正则命中面逐字节相同（NEW test/span-risk-surface.test.mjs）。
2. 无 span_risk 段项目：computeCeremonyTier span 只剩文件数/跨模块两维；computeGateProfile riskHits 恒空、runtimeEvidence='na'——不回退内置表。
3. 本仓自举后：src/migrate.js、src/docs-migrate.js（migrate token）与 src/dispatch/、src/review-dispatch.js（dispatch token）span 命中→S2；quick 画像对应 L2 advisory。
4. modules rebuild --force 写盘后 span_risk 段（含段内注释）在场且字节不变（回归钉）。
5. QUICK_RISK_PATH_PATTERNS 全仓 grep 零残留（src+test）。
6. npm test 全量绿 + npm run lint 绿。
7. 阈值/公式既有回归钉零变化（8/2/2 与三轴 max 行为钉原样通过）。

## 决策/FR 覆盖矩阵
| 决策/FR | 覆盖 task | 说明 |
|---|---|---|
| FR-01 | task-01 | 声明段+装载器 |
| FR-02 | task-02, task-03 | 定价面纯函数切换+接线 |
| FR-03 | task-02, task-03 | 画像面纯函数切换+接线 |
| FR-04 | task-03 | 硬退役+自举+known-issues |
| FR-05 | task-01, task-03, task-04 | 等价性钉/回插钉/全量 |
| D-001@v1 | 全局硬约束 | 范围与三条不动 |
| D-002@v1 | task-03 | known-issues 登记（不修） |
| D-003@v1 | task-01~03 | 方案 A 落地 |
| D-004@v1 | task-03 | 9 token 自举 |
