---
author: qinyi
created_at: 2026-09-07T04:20:00+08:00
---

# 提案书（Proposal）

## 动机
种子稿 §1：brainstorm 侧 IR 化——设计决定 × 影响模块机器核验（消灭「设计了不存在的模块」幻觉）+ design.md 骨架渲染（消决策追踪手抄）+ _facts.md 注入省探索 token。

## 关键问题
1. decisions.md 模块域字段无人核验——幻觉模块 id 可一路带到 plan
2. design.md 决策追踪表 agent 手抄 D 条目（手抄前科面）
3. brainstorm 阶段机械事实（端点/依赖/规模）未预咀嚼，agent 现场探索浪费 token

## 变更范围
src/design-facts.js 新纯函数模块（parseDecisionDomains/loadModuleMap/validateDecisionModuleRefs/generateDesignSkeleton）+ 步骤级 gate 接线（complete.js 钩子链）+ design-init CLI + Step2 _facts 注入 + Step3/6 prompt 更新 + 测试

## 不在范围内（显式清单）
- 不新建 design.facts.yaml（decisions.md 为载体）
- scan 依赖核验（另立变更）、跨仓、P3d

## 成功标准（可验证）
- 幻觉模块 id 在 brainstorm 末步被 ERROR 拦（NEW: 前缀合法出路）
- design-init 骨架过既有 Stage Review/契约校验；手写路径保留
- _facts.md 存在时注入 Step2（fail-soft）
