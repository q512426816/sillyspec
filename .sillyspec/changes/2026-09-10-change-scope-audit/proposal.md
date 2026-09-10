---
author: qinyi
created_at: 2026-09-10T00:00:00+08:00
---
# 提案书（Proposal）

## 动机
变更收尾时（execute --done / verify / archive --confirm）用户与 agent 缺一份「计划改动 × 实际改动」的机械对账视图：实际改动文件已有成熟收集链路（resolveReconcileActualFiles 三源并集 / auditQuickCompletion 窗口归属），但只出文件清单不出行数；计划侧（design.md 文件清单）从未与实际侧做过文件级三态对账。用户确认改动范围时只能手跑 git diff。

## 关键问题
1. 实际改动只有文件名没有 +/- 行数，用户确认范围缺量化感。
2. 计划（design.md 清单）与实际（git diff）无机器对账：计划外文件（scope creep）与计划未动文件（遗漏）不可见。
3. 对账能力绑死在阶段 --done 时点，执行中途无法随时查看。
4. quick 流程的窗口归属审计（baseline 快照/他者退栈/软归属）只活在 --done 一次，且无行数。

## 变更范围
- 纯函数 `computeChangeScopeAudit`（新文件 src/scope-audit.js）双模式：
  - full-flow：计划侧 design.md 文件清单解析 × 实际侧 resolveReconcileActualFiles + `git diff --numstat` → 文件级三态（✓ 计划内 / ⚠️ 计划外 / ⚠️ 计划未动）+ 真实 +/- 行数
  - quick：guard.json 声明 × auditQuickCompletion 窗口 → 归属状态表（已声明/软归属/未声明/他者声明）+ 行数
- 独立命令 `sillyspec scope-audit --change <name|quick-session-id>`（含 --json），随时查看
- 薄注入 ×3：execute --done 打全表；verify --done 打一行漂移确认；archive --confirm 注入全表
- quick --done 审计输出升级行数（同一 numstat 采集函数）
- 行数特例：untracked 新文件 wc -l 全 + 行；binary 显 BIN；quick 提交后降级读 QUICKLOG 记录态

## 不在范围内
- 计划侧行数估算（含 LLM 大概值）——不做（D-001 否决）
- ⚠️ 计划外/未声明项阻断门禁——advisory 不阻断（D-006）
- plan 阶段 T-shirt 尺寸标记（后续独立变更）
- 兼容性：旧变更无 design.md 清单结构时降级「实际侧 only」视图

## 成功标准（可验证）
- scope-audit 命令对活跃 full-flow 变更输出三态全表，行数与手跑 `git diff --numstat` 一致
- scope-audit 对 quick 会话（guard.json 存在）输出归属表；对已提交 quick 提示降级读 QUICKLOG
- execute --done 后控制台出现全表；verify --done 出现一行汇总；archive --confirm prompt 含全表
- 三态判定：计划外文件/计划未动文件在测试夹具下正确分档
- 并行会话声明文件（他者 --files）不进本变更表（复用既有退栈链路）
