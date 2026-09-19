---
author: qinyi
created_at: 2026-09-19 08:22:12
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 项目维护者 | 在 `_module-map.yaml` 顶层 span_risk 段声明本项目的 span 风险路径 token（进 git 可评审） |
| 定价引擎消费者 | computeCeremonyTier / reconcileDualRun（阶段门、评审档、双跑收口）按声明表判 span 模式维 |
| quick 画像消费者 | computeGateProfile（quick --done 审计、scope-audit）按声明表出 riskHits/L2/runtimeEvidence |
| CLI 自举（本仓） | sillyspec 仓自身的 map 携带 9 token 自举表（migration 族+scheduling 族） |

## 功能需求

### FR-01: span_risk 声明段与装载器
Given `_module-map.yaml` 顶层含 `span_risk:` 字符串数组段
When `loadSpanRiskPatterns({specBase, project})` / `loadSpanRiskPatternsAllProjects({specBase})` 装载
Then 返回编译产物 `[{pattern, re}]`（token 转义后编译为现行同款边界锚定正则：前界 `(?:^|[/_-])`、后界 `(?=[/._-]|$)`、`/i`）；map 缺失/坏 YAML/段非数组/非字符串/空 token 逐条跳过 → 空表，不缺省不拦截

### FR-02: 定价消费面切换（ceremony span 轴）
Given computeCeremonyTier 收到 opts.spanRiskPatterns（声明表编译产物）
When 声明文件命中任一 token
Then span ≥ S2 且 reasons 记 `span=S2（风险路径命中 <token>：<files>）`；opts.spanRiskPatterns 缺省 `[]` 时维度关闭（现行六域文件不再触发）；reconcileDualRun 经 factSpanRiskPatterns 穿透同口径；阈值 8/2 与三轴 max 公式零变化

### FR-03: quick 画像消费面切换
Given computeGateProfile 收到 opts.riskTable（声明表编译产物）
When 非文档文件命中任一 token
Then riskHits 记 `{pattern, file}`、判级 L2、checks.runtimeEvidence='required'；riskTable 缺省 `[]` 时 riskHits 恒空、runtimeEvidence='na'

### FR-04: 硬退役与自举
Given 本变更合入
Then QUICK_RISK_PATH_PATTERNS 定义/导出/引用全仓零残留；本仓 map 携带 `[migrate, migration, migrations, dispatch, scheduler, scheduling, cron, job, jobs]` 自举段；knowledge/known-issues 登记 blast 自举表缺口（悬空提交 bbe30ab 与恢复路径）

### FR-05: 回归钉
Given 测试套件
When 全量跑
Then 编译等价性钉（六域展开 token 集 vs 旧正则，代表性路径集含 author/booking/lockfile 反例，命中面逐字节相同）绿；modules rebuild --force 后 span_risk 段在场且字节不变钉绿；既有阈值/公式回归钉零变化

## 非功能需求
- 兼容性：无 span_risk 段的项目两消费面维度关闭不回退内置表（blast 同款取舍，R-01 文档化）；span_risk 段对旧版 CLI 是未知顶层段（忽略）；QUICK_RISK_PATH_PATTERNS 导出删除属破坏性变更（仓内全量切净，CLI 内部模块无外部消费方）
- Windows/Linux/macOS：路径反斜杠归一 POSIX 沿用现行写法；纯函数零子进程

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01~FR-05 | 范围与硬约束（价目表/blast 段零改动、risk_level 先行） |
| D-002@v1 | FR-04 | blast 自举表缺口登记（不修、独立变更收口） |
| D-003@v1 | FR-01~FR-03 | 方案 A：map 段+空缺省+同刀+硬退役 |
| D-004@v1 | FR-04 | 本仓自举 9 token 定制口径 |
