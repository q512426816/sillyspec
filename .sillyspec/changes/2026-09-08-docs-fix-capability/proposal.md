---
author: qinyi
created_at: 2026-09-08 09:23:33
---

# 提案书（Proposal）— 2026-09-08-docs-fix-capability

## 动机

multi-agent-platform 仓 1058→0 文档失效引用清理（2026-09-07）复盘：约 80% 修复工作是确定性操作，本可由 CLI 完成，实际耗费 4 个临时脚本 + 7 个子代理 + 约 50 轮交互。本变更把其中有工具价值的部分沉淀为 CLI 能力，并消掉工具自身的解析假阳性。

## 关键问题

1. **解析假阳性**（约 6 处「修不掉的失效」）：Next.js 路由组 `(dashboard)` 被 REF_RE 截断误报、含 `...` 的省略号路径被当字面路径——文档是对的但工具报错
2. **批量路径迁移无工具**：`modules/` → `backend/app/modules/` 这类已知改名规则，清理中靠手写约 150 条映射的临时脚本
3. **历史快照文档干扰门控**：归档/审计文档引用天然过时，不应计入 docs check 失效
4. **歧义不可编程消费**：多命中 tie 的候选行号只进 reason 文本，脚本拿不到
5. **报告出口不统一**（用户 2026-09-08 实证）：docs check 失败报告走 stderr，capture_output 只读 stdout 的脚本拿空

## 变更范围

- FR-1 解析修复：REF_RE 展开循环形支持括号路径（Grill 修订：原子序列形 ReDoS 否决）；`...` 模糊路径跳过；顿号拆分测试锚定
- FR-2 `docs migrate --from X --to Y`：确定性前缀迁移，默认 dry-run、`--apply` 写盘+自动复核
- FR-3 snapshot/archive 豁免双通道（路径段 + frontmatter），`--no-exempt` 可关
- FR-4 `--json` fix 对象增 candidates 数组（机械候选，无置信度）
- FR-5 非 JSON 报告内容统一 stdout（stderr 仅留诊断）

## 不在范围内（显式清单）

- 不做路径自动推断引擎（置信度打分/上下文匹配）——等第二次批量事件再认领
- 不做 `docs fix` 一站式循环收敛命令、`--interactive`
- 不做 `docs gate --delta-only`（基线 0 时计数 ratchet 等价）
- 不支持 `第 N 行` 中文行号记法
- 不改 docs gate 判定逻辑（豁免语义自动跟随）

## 成功标准（可验证）

- 旧配置（无新 flag）下 `docs check` 输出逐字不变（豁免默认开是唯一的计数变化方向：只减不增）
- 括号路径 `app/(dashboard)/x.tsx:21` 全量提取且真实校验；markdown 链接 `[t](foo.js:12)` 行为零回归
- 长 token 无 `:N` 后缀（GitHub 源码 URL 形态）不触发回溯挂死（Grill 压测线性）
- `docs migrate --from A --to B` dry-run 输出计划且零写盘；`--apply` 写盘后 postCheck 报告失效数
- archive/finished 路径段或 `doc_type: snapshot` frontmatter 的文档不进 invalid 计数；`--no-exempt` 恢复全量
- `docs check` 失败时 stdout 可捕获失效清单；--json 输出与 exit code 不变
