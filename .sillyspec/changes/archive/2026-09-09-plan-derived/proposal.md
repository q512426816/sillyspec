---
author: qinyi
created_at: 2026-09-09T01:05:00+08:00
---
# 提案书（Proposal）

## 动机
Wave 手排与 depends_on 双写漂移是已证噪音源（专门的 plan-adopt-waves 命令即痛点证据）；plan_level 纯 agent 自判无客观锚点。轮次经济学定稿：手写机器要读的格式 → CLI 派生渲染。

## 关键问题
1. Wave 依赖方向违规硬拦后 agent 手改/跑命令再重跑 --done（一轮往返）；合法保守串行每轮打提示噪音。
2. 任务总表 W 列重抄 Wave（已证双写源）。
3. plan_level=light 即免独立审查，无信号复核。

## 变更范围
section 2 三类分流（违规→提案-验证-落盘自动修复；合法串行→静默；一致→✅）+ adoptPlanWaves mode=proposal 只读档 + plan_level 客观复核 warn + plan.js prompt 措辞。文件面 3 src + 2 test + docs。

## 不在范围内
execute 解析口径（零改动）、plan_level 接管判定、任务总表整行派生、Wave 手排强禁令。

## 成功标准（可验证）
- 方向违规且提案干净 → --done 自动修复落盘 + 回执，不再要求 agent 手改
- 提案脏（同 Wave 重叠）→ 保留原文照旧拦（冲突明细）
- 合法保守串行 → 零输出零改写（现 ⚠️ 噪音消失）
- adopt CLI 行为等价；plan_level 声明 vs 信号不一致 → warning 可豁免
