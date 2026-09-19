---
author: qinyi
created_at: 2026-09-19 08:22:12
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
2026-09-19-ceremony-pricing-five-cuts 把判级/定价输入迁到项目声明面（blast 轴），其 D-011@v1 登记同族遗留：span 轴 QUICK_RISK_PATH_PATTERNS（src/change-risk-profile.js:36-43）是判级/定价域最后一张硬编码全宇宙表，违反知识库 conventions「判级/定价/门禁输入必须项目声明，禁全宇宙词表」口径真相源。声明面管道（装载器/消费先例/rebuild 回插）已落 main，本变更按 D-011 退役判据收口。

## 关键问题
1. 全宇宙表换仓即噪声：auth/billing 等六域是通用猜测非项目实况（blast 迁移同根因，「撞词≠危险」）。
2. 表不可声明不可评审：项目无法增删模式，调灵敏度只能改源码发版。
3. 双消费面口径单点化机会：定价面（ceremony span 轴）与 quick 画像面共用一张表却各自内嵌引用，退役需要一次同刀切换。

## 变更范围
`_module-map.yaml` 顶层新增 `span_risk:` 段（token 扁平字符串列表）为唯一声明源；NEW src/span-risk-surface.js（编译/命中/装载 project+AllProjects，与 blast-surface 同构）；computeCeremonyTier/reconcileDualRun/computeGateProfile 参数化接声明表；五处调用方接线；QUICK_RISK_PATH_PATTERNS 硬退役；本仓自举 9 token（migration 族+scheduling 族，D-004）；known-issues 登记 blast 自举表缺口（D-002）；回归钉（编译等价性/rebuild 回插/阈值零变化）。

## 不在范围内（显式清单）
- 价目表：三轴 max 公式、阈值 8/2、force_tier 只升不降——零改动
- blast 声明面（含其在 main 缺失的现状）——零触碰，恢复留独立变更（D-002）
- local.yaml 新键（span 轴无逐机覆盖需求）
- token 通配/正则语法（纯字面量）
- span 轴另两维（文件数/跨模块数）口径

## 成功标准（可验证）
- 等价性钉绿：六域展开 token 集对代表性路径集（含 author/booking/lockfile 反例）与旧正则命中面逐字节相同
- 无 span_risk 段时：span 模式维度关闭（ceremony span 只剩文件数/跨模块；quick riskHits 恒空），不回退内置表
- 本仓自举后：src/migrate.js、src/dispatch/ 路径 span 命中→S2；npm test 全绿 + lint 绿
- QUICK_RISK_PATH_PATTERNS 全仓 grep 零残留（源码+测试）
