---
author: qinyi
created_at: 2026-09-19 08:30:00
plan_level: full
---

# 实现计划（Plan）

> revision 1：随 D-001@v2 重定范围改写（四件事编队）。

## Wave 1（并行，无依赖）
- task-01
- task-02

## Wave 2（依赖 Wave 1）
- task-03

## Wave 3（依赖 Wave 1+2）
- task-04

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 声明面机制 | W1 | P0 | — | FR-01, D-008@v1→v2, D-010@v1 | NEW:src/blast-surface.js（resolveBlastSurfaces 纯函数 + loadBlastDeclarations：map blast 段 + local 只升合并）；modules.js --force 顶层段文本回插；自举 blast 段落 map；NEW 两个测试文件（解析组 + rebuild 保留钉） |
| task-02 | 判级重构（新增面） | W1 | P0 | — | FR-01, D-008@v1→v2, D-009@v1 | change-risk-profile.js 增 resolveChangeRisk（explicit 只压 tier 不豁免 evidence；纯新增不删导出——防中间态 import 断裂窗口）；stage-contract.test/quick-gate-profile.test 判级组重写 |
| task-03 | 消费点接线、保留三刀与删除收口 | W2 | P0 | task-01, task-02 | FR-01~04, D-003@v1, D-004@v1, D-005@v1, D-008@v1→v2 | 八消费点接线（含漂移 :1382/:1662）+ computeCeremonyTier blastTier 直入 + applyDeclarationCatchUp 三分支 + reconcileDualRun warn + gates 追赶重定价（事件文案参数化）+ readDesignOwnFiles 双形态段关闭；删除收口：词表/否定抑制/枚举继承/detectChangeRisk 删除（接线后）+ RISK_LEVEL_CAUSES 文案 + stage-contract-spec 注释 + verify-conclusion-slot.test 翻新 + 含注释引用的全量 grep 清零；ceremony-tier.test 引擎组（above 例翻新）+ concurrent-preflight-hooks 门接线组 |
| task-04 | 契约同步与全量 | W3 | P0 | task-01,02,03 | FR-05, D-001@v2, D-010@v1, D-011@v1 | stages/verify.js :194-196 教学段重写（声明面新语义）；模块文档认领；自指走位验收（本变更档位 S2 对账）；npm test 全量 + lint（config-schema 全部改动已归 task-01，不重复） |

## 关键路径
task-01 → task-03 → task-04（声明面解析是接线的输入前提）；task-02 与 task-01 并行；task-03 合并原接线与三刀（共享文件 ceremony-tier/gates/verify-postcheck 收进单 task 内串行，防同 Wave 并行互写）

## 全局硬约束（从 design.md 抄录，绑定所有 task）
- 价目表零改动：档位集合 S0~S3、三轴 max 公式、SPAN_FILES_THRESHOLD=8、FRICTION_ESCALATION_THRESHOLD=2、force_tier 只升不降。
- 证据门判据零改动：VERIFICATION_NEEDS / checkIntegrationEvidence / auditRuntimeReceipt 原样——只换触发源（evidence 位直出）。
- explicit risk_level 只压 tier、不豁免 evidenceRequired（豁免=改 map，git 可见）。
- rebuild：--force 写盘时从 existingMap 文本提取顶层 blast 段原样回插（未知顶层段通用回插）；回归钉断言写盘后在场且字节不变；非 force 是 dry-run 不写盘（无保护力断言禁止）。
- local.yaml blast_surfaces 只升不降、不承载 evidence。
- 未命中声明面 → blast S1；未配置项目禁止回退旧词表；map 段缺失/坏形态 → 空表不缺省不拦截。
- 词表/否定抑制/枚举继承/detectChangeRisk 散文体删除不留 legacy；`grep detectChangeRisk(` src/test 清零。
- applyDeclarationCatchUp 三分支：空+未超阈→整档换；空+超阈→整档换不设地板（同锁 escalate 即时 +1）；非空→max(重算, transitions 最高 to)。重定价记 reasons 不记 transitions；事件文案参数化。
- reconcileDualRun 返回结构零新增字段（severity 取值域扩 'warn'）；低报 error 逐字不变。
- readDesignOwnFiles：双形态标题 + 任何 `^##\s` 关闭段；旧 `## 6.` 行为不变。
- 事实面零内容扫描（readCeremonyFactContent 删除）；文件名仍走 changedFiles 判定。
- QUICK_RISK_PATH_PATTERNS 不动不迁（D-011 登记）。
- 多 agent 铁律：stage-contract.js/gates.js 等共享文件 Edit 前重读最新态、锚点漂移核对。
- 零新正则族；路径匹配复用 matchModuleForFile 语义。

## 全局验收标准
1. 声明面解析：前缀命中取最高档、未命中 S1、local 只升不压低、map 段缺失空表、evidence 位传递（NEW test/blast-surface.test.mjs 全绿）。
2. --force rebuild 写盘后 blast 段原样在场（字节级）；非 force 依旧不写盘（回归钉双面断言）。
3. `grep -rn "detectChangeRisk(" src/ test/` 清零；八消费点全部走 resolveChangeRisk/resolveBlastSurfaces 新输入。
4. 无摩擦迁移档位文件在下一道完成门自动重定价（可降）；有摩擦迁移不低于地板。
5. `## 文件变更清单` 下清单行正确计入 span（≥8 → S2）；`## 6.` 行为不变。
6. 声明 S3、事实 S1 → warn 不阻断不记账；声明 S1、事实 S2 → error 逐字不变。
7. 自指走位：本变更自身声明追赶后档位 S2、verify 双跑事实面（文件名×声明面）= S2 零 mismatch。
8. 全量 npm test + npm run lint 通过。

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v2 | task-01..04（四件事编队） | 全局验收 1-8 |
| D-003@v1 | task-03, task-04 | 验收 4（三分支） |
| D-004@v1 | task-03, task-04 | 验收 5（标题双形态） |
| D-005@v1 | task-03, task-04 | 验收 6（warn/error 分野） |
| D-008@v1→v2 | task-01, task-02, task-03 | 验收 1/2/3（声明面+回插+清零） |
| D-009@v1 | task-02, task-03 | 验收 1 子项（explicit 不豁免 evidence） |
| D-010@v1 | task-01, task-04 | 自举全量表 + 验收 7 |
| D-011@v1 | task-04 | 登记留痕（非目标侧） |
