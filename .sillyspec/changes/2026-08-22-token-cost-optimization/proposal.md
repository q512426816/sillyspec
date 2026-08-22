---
author: qinyi
created_at: 2026-08-22 16:30:00
---

# Proposal：全流程 token 成本优化（execute 为主）

## 背景

2026-08-22 同日两个变更的实测对照（team-session-unify vs session-panel-unify，同流程同项目）：

| 指标 | team-session-unify | session-panel-unify |
|---|---|---|
| execute | ≈11h（加载上下文一步 3h06m） | 67min（加载上下文 1min） |

根因不是流程骨架，而是：①58KB 根层模块大卡被每个 task 子代理整读（细粒度卡已存在但流程不消费）；②design.md 28KB 每 Wave/每子代理重复整读；③同一份 design×diff 被 acceptance 与 stage review 消费两遍；④符号影响面/模块归属等机械工作由 agent 手工做。完整分析见 `docs/token-cost-optimization-plan.md`。

## 目标

- backend 类变更全流程 input token 降 40%+（子代理模块文档读取 58KB→≤10KB 细卡）
- 「加载上下文」步可沿用重入（指纹一致不重做）
- 模块卡/知识库膨胀可检测、可治理（软上限 + sidecar 迁出）

## 方案（P0→P2，全落地）

- **P0a** `src/module-resolve.js`：跨全部 `_module-map.yaml` 级联最长前缀匹配（子项目细卡优先），execute「加载上下文」注入 per-task 卡表（`{MODULE_RESOLVE_TABLE}`）、Wave prompt 注入本 Wave 分级段；新命令 `sillyspec modules resolve --change`
- **P0b** `sillyspec modules split-changelog [--force]`：模块卡「变更索引」历史段迁出 `<module>.changelog.md` sidecar（默认 dry-run）；doctor 新增 doc_bloat 维度（卡 >12KB / uncategorized >20KB 告警）；execute/quick 的变更索引追加目标改 sidecar
- **P1a** buildWavePrompt 注入 design.md「非目标/兼容策略」两节热区 + 全章节行号索引（Wave 前置不再整读全文）
- **P1b** acceptance「对照设计检查」产物唯一化：逐项对照只落 stage review review.json 的 checklist，不再另写 design-check.md；gate 撞 docHash 用 `register-stage-review --refresh-hash` 修复不重审
- **P2a** symbol-impact 骨架带 tasks.md sha256 指纹（16 hex），重入指纹一致直接沿用
- **P2b**（并入 P0b doctor 维度）knowledge/uncategorized.md 膨胀告警

## 非目标

- 不砍审查层（task review / 三项必查保留——合并的是材料重复读取，不是质量门）
- 不动 tasks.md/task 卡/plan 三处结构（任务真相契约）
- 不动测试策略（Redis 探测 + -n auto 已另行修复）
- 不动 SillyHub 派发链路

## 验证

- `test/token-cost-optimization.test.mjs` 47 断言全绿；全量套件 282 文件零失败（doc-ref-check 行号漂移已同步修复）
- 真实项目冒烟：multi-agent-platform team-session-unify 14 task 全部解析到 5.8–9.9KB 细卡（原指引为 58KB/38KB 大卡）；split-changelog dry-run 报出 backend 27.5KB + frontend 28.1KB 待迁出
