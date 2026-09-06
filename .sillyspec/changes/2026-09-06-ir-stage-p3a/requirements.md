---
author: qinyi
created_at: 2026-09-07T00:25:17+08:00
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| 开发者（agent） | plan 阶段填写 task 卡 target_files 声明；execute 零新增负担 |
| CLI（机器） | plan-postcheck 核验声明；verify 侧机器对账；gates 阻断 |
| 审阅者 | 消费对账三类差集（envelope checks / verify 产物）识别计划落空与 scope creep |

## 功能需求

### FR-01: target_files 声明字段支持
覆盖决策：D-001@v1, D-002@v1
Given plan 阶段展开任务清单、生成 task 卡
When task 卡骨架生成与规则查询
Then 骨架 frontmatter 含 `target_files:` 占位与格式注释（精确路径或 `NEW:` 前缀，禁 glob/目录前缀），taskcard-rules.md 含正反例，src/stages/plan.js 任务清单步与 TaskCard 生成步 prompt 含填写指引

### FR-02: plan 侧声明核验（validateTargetFiles）
覆盖决策：D-002@v1
Given 变更目录下存在 task 卡（含或不含 target_files）
When plan --done 触发 postcheck
Then 格式非法（glob/目录前缀/绝对路径）或路径不存在且非 `NEW:` 前缀 = ERROR；字段缺失 = 每变更汇总一条 WARNING；声明 design.md 文件清单外路径 = WARNING；声明 allowed_paths 白名单外文件 = WARNING；已存在文件带 `NEW:` 前缀 = WARNING

### FR-03: verify 侧机器对账（reconcileTargetFiles）
覆盖决策：D-002@v1, D-004@v1
Given task 卡带 target_files 声明且 change 存在实际改动
When verify gate 调用对账
Then 输出三类差集：①声明且做了（matched）②声明没做（missing，ERROR）③做了没声明（undeclared，WARNING，附尽力归因仅报告）；实际改动全部由 CLI 从 git 取（diff/status/apply-pathspec），agent 零手抄

### FR-04: actual 数据三源口径（两形态覆盖）
覆盖决策：D-004@v1
Given change 处于 worktree 存活形态（meta.json 存在）或 post-apply 形态（meta 已清理）
When 对账取实际改动文件
Then 形态 A = resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true })；形态 B = 主仓 merge-base diff ∪ status --porcelain --untracked-files=all（splitOwnVsForeignDiffFiles 过滤并行 WIP）∪ apply-pathspec-<change>.txt 兜底；统一 filterDeliverableFiles 过滤；NEW: 前缀文件在两形态下均可见（无假红）；跨仓 diff 不并入（ctx=null）；git 不可用降级 WARNING 跳过

### FR-05: gates 接线与产物透传
覆盖决策：D-002@v1, D-004@v1
Given 对账结果产出
When verify gate 执行
Then gates.js verify 块新增 reconcileTargetFiles 调用，②类 ERROR 阻断（照 runVerifyTestCheck 先例），既有五项检查语义/顺序零改动；checks 条目走诊断信封格式（evidence 实测清单 + supportedFixes），落盘 .runtime/verify-runs/ 并透传 machine-interface envelope（additive）

## 非功能需求

- 兼容性：存量 task 卡（无 target_files）零红门禁；SillyHub 消费契约仅 additive 字段；known_failures 豁免机制沿用
- 可回退：全部改动为新增检查/字段/接线，回退 = 移除接线与字段占位，无数据迁移
- 可测试：两形态×三模式（git worktree/native/in-place）测试矩阵；门禁阻断冒烟（②类在场 verify gate 红）

## 决策覆盖矩阵（如存在 decisions.md）

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | 全部 | 范围界定=P3a；P3b/c/d 排除见 proposal 不在范围清单 |
| D-002@v1 | FR-01, FR-02, FR-03, FR-05 | 方案A：机器 diff 权威、②红③黄、per-task 归因仅报告 |
| D-003@v1 | —（流程义务） | 归档/交付时列出 P3b/c/d 待立项提醒（非功能需求，由收尾动作兑现） |
| D-004@v1 | FR-03, FR-04, FR-05 | Grill 修正：gates 接线、三源口径、ctx=null、prompt 锚点 |
