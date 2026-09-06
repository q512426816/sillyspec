---
author: qinyi
created_at: 2026-09-07T00:25:17+08:00
---

# 提案书（Proposal）

## 动机

把 archify 借鉴已验证的「agent 产出结构化 IR + 机器确定性核验」机制从 scan 侧推进到变更流程（种子稿 `docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md` 的 P3a 分期）：plan 阶段声明「打算动哪些文件」，机器在 verify 阶段对账「实际动了哪些文件」，让计划落空与 scope creep 从散文判断变成机器可检出的结构化事实。

## 关键问题

1. **scope creep 检出不全**：现有 gates 的 symbol-impact 只能抓部分越权改动；文件级「声明 vs 实改」对账是最廉价的近似，但当前没有任何环节做这件事。
2. **计划幻觉无核验**：plan 侧任务可以引用不存在的文件路径（幻觉），直到 execute 才暴露；声明侧机器核验（存在或显式 NEW:）能在 plan --done 就拦住。
3. **事实源不权威**：review.json 的 changedFiles 是 agent 手写，不能作为对账权威；git diff/status/apply-pathspec 才是机器事实。

## 变更范围

- task 卡 frontmatter 新增 `target_files[]`（精确路径或 `NEW:` 前缀）+ taskcard 骨架/规则/prompt 指引三落点
- plan-postcheck 新增第 7 项检查 `validateTargetFiles`（格式/存在性/design 清单与 allowed_paths 双交叉）
- verify-postcheck 新增纯函数 `reconcileTargetFiles`（三源 actual 口径覆盖 worktree 存活/post-apply 两形态，三类差集）
- gates.js verify 块新增接线（ERROR 阻断照既有先例，不改既有五项检查）
- 测试套件（两形态×三模式矩阵 + 门禁冒烟）

## 不在范围内（显式清单）

- P3b（verify 验证结论表）/ P3c（design facts）/ P3d（archive delta 回灌）——独立变更立项（D-001@v1）
- 不改 review.json schema、worktree-apply allow-set、quick 流程
- 不做 per-task 门禁归因（尽力归因仅报告附注）、touches_modules/wave 预分组、跨仓对账
- 不改 dashboard 前端

## 成功标准（可验证）

- 声明了不存在路径且非 NEW: 的 task 卡在 plan --done 被 ERROR 拦截
- 声明没做（②类）在 verify gate 产生 ERROR 阻断；做了没声明（③类）产生 WARNING；三类差集有测试锁定
- 无 target_files 的存量卡：每变更汇总一条 WARNING，对账 skipped，零红门禁
- post-apply 场景下 NEW: 文件不产生假红（三源口径测试覆盖）
- 既有 review.json / gates 五项检查 / worktree-apply 行为零回归
