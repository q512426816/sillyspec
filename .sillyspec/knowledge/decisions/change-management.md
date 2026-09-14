---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — change-management

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-905@v1 quicklog 标签切段先严格边界扫描再宽松兜底
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/quicklog.js:493
最近确认：71a7fe6
理由：quicklog 单行四字段（需求：/根因：/方案：/结果：）切段必须两层——真实标签 = 上一标签之后首次出现且前导是串首/空白/句末标点（。；！？）的字样，正文引用标签字样（前导是「/（ 等弱字符）不构成新边界；严格扫描失败才退回宽松顺序扫描，缺标签返回 null 落单行兜底由 --done 契约校验拦截——残余边界（正文引用且前导恰为空白/句末标点）仍可能错位，改写标签语义时勿简化该两层逻辑。

## D-004@v1 : quick 流程纳入——复用 auditQuickCompletion 窗口归属，归属状态表而非三态
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：用户问「quick 的范围是否也能统计到呢」，评估后纳入。quick 无事前计划（--files 是事后声明），不做三态做归属状态表：已声明（--files）/ 软归属（同模块测试）/ ⚠️ 未声明 / 他者声明（排除面）。窗口归属复用 auditQuickCompletion（baseline 快照/他者退栈/软归属已存在）；随时查看依赖 guard.json 持久化 + locateQuickSessionGuard。quick 提交后窗口已 commit，降级读 QUICKLOG 条目文件行（记录态非实时）。

## D-002@v1 apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。

## D-001@v1 归类闭环选型——agent 归类 + 人抽审（非全自动、非拆分）
状态：implemented
变更：2026-09-14-knowledge-loop-close
锚点：未记录
最近确认：d8fd9ce
理由：选 agent 归类+人抽审：quick --done 收尾时 CLI 拿刚落盘条目根因字段跑 matchKnowledge 渲染归类提议；新子命令 knowledge classify 一次确认后落位（追加目标知识文件 + 更新 INDEX + 从 uncategorized 删除，均可逆）；人闸从逐条确认后置为 archive/doctor 抽审位；配 knowledge-baseline 棘轮（仿 docs-check-baseline 范式：uncategorized 条数 ≤ 基线放行、降则自动收紧）软警告起步。方案 B（全自动）被否——归类错误无审计面、违背"不信口头"主轴；方案 C（拆分延后）被否——归类与注入共享 matchKnowledge 基础设施，拆开则学习闭环两端各自不完整。

## D-002@v1 消费端从「建议读」升级为「机械注入 + 遥测」，不做消费硬门禁
状态：implemented
变更：2026-09-14-knowledge-loop-close
锚点：未记录
最近确认：d8fd9ce
理由：CLI 在 prompt 组装时用任务描述跑 matchKnowledge，命中文件内容直接注入 prompt（top-3 限额，仿「📦 模块上下文」注入先例）+ 每次命中落 .runtime/knowledge-hits.jsonl（仿既有 decision-hits.json 遥测先例）+ 新子命令 knowledge stats 输出命中矩阵（从未命中的文件列死重清单）。明确不做「必须消费」硬门禁——先遥测后优化，数据说话再决定是否升级门禁。
