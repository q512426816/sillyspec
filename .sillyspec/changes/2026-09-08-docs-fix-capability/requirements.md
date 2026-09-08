---
author: qinyi
created_at: 2026-09-08 09:25:12
---

# 需求规格（Requirements）— 2026-09-08-docs-fix-capability

## 角色

| 角色 | 说明 |
|---|---|
| 文档维护者（agent/人） | 写/改 .md 文档中的 file:line 引用，期望工具不误报、批量迁移可一条命令完成 |
| 脚本消费者（巡检/CI） | 以 --json 或 stdout 捕获 docs check 结果做批量决策 |
| gate 使用者 | pre-push 门控不被历史快照文档干扰 |

## 功能需求

### FR-01: 括号路径正确解析（Next.js 路由组）
覆盖决策：D-006@v1（展开循环形，原子序列形 ReDoS 否决）
Given 文档含 `frontend/src/app/(dashboard)/ppm/shared.tsx:21` 且该文件存在
When 跑 docs check
Then 引用全量提取并按真实路径校验（不截断为 ppm/shared.tsx）
And markdown 链接 `[t](foo.js:12)` 仍提取 `foo.js:12`（零回归）
And 长 token 无 `:N` 后缀（GitHub 源码 URL 形态）不触发回溯挂死（线性耗时）

### FR-02: 省略号模糊路径跳过校验
Given 文档含 `frontend/app/api/.../stream/route.ts` 省略号路径
When 跑 docs check
Then 该引用标记为模糊引用跳过校验（skippedFuzzy 计数），不计 invalid

### FR-03: 中文顿号并列引用拆分
Given 文档含 `a.py:21、b.py:63`（顿号分隔）
When 跑 docs check
Then 提取为两条独立引用（回归测试锚定，字符集排除全角标点）

### FR-04: docs migrate --from/--to 确定性路径迁移
覆盖决策：D-002@v1、D-004@v1（薄新模块复用提取器）
Given 文档集含引用 `modules/agent/service.py:361`
When 跑 `docs migrate --from "modules/" --to "backend/app/modules/"`（无 --apply）
Then 输出迁移计划（doc/行/旧→新/unverified 标记），零写盘，exit 0
When 加 `--apply`
Then applyFixes 写盘 + 自动 docs check 复核报告失效数；unverified>0 或 postCheck 失效 → exit 1

### FR-05: snapshot/archive 文档豁免
覆盖决策：D-003@v1（双通道）
Given 文档路径含 `archive/` 或 `finished/` 段，或 frontmatter 含 `doc_type: snapshot`
When 跑 docs check（默认）
Then 该文档整体跳过校验，skippedExempt 计数
When 加 `--no-exempt`
Then 全部文档照常校验（含 archive/snapshot）

### FR-06: --json 输出补 candidates 数组
Given 多命中 tie 歧义引用或带 `/` 路径的文件不存在引用
When 跑 docs check --json
Then fix 对象含 candidates 数组（机械数据：{file, line?}，无置信度）

### FR-07: 非 JSON 报告内容统一 stdout
覆盖决策：D-005@v1
Given docs check 存在失效引用（非 --json 模式）
When 跑 docs check
Then stdout 可捕获失效清单/重锚报告/修复指引；stderr 仅含 ⚠️ 诊断或为空
And --json 输出与 exit code 语义逐字节不变

## 非功能需求

- 兼容性：--json 只增字段不删字段；exit code 三档语义不变；旧 `docs migrate`（无 flag）行为保留
- 可回退：豁免可 `--no-exempt` 关闭；migrate 默认 dry-run 零写盘；正则变更可回退（R-01 对账）
- 可测试：全部行为单测覆盖（含 ReDoS 压测用例）
- 性能：正则线性耗时（Grill 验证 evil 用例 0.01ms）；豁免路径段判定免 IO

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | 全部 | 范围边界（五项做/四项不做） |
| D-002@v1 | FR-04 | migrate 确定性语义 |
| D-003@v1 | FR-05 | 豁免双通道 |
| D-004@v1 | FR-04 | 薄新模块复用提取器 |
| D-005@v1 | FR-07 | stdout/stderr 双轨出口 |
| D-006@v1 | FR-01 | REF_RE 展开循环形（Grill 修订） |
