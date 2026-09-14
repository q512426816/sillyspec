---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — setup

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-902@v1 local.yaml 读写侧 CRLF 归一且幂等跳过分支落盘治愈
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/local-register.js:35
最近确认：71a7fe6
理由：parseRepoRegistry 等解析入口必须先归一 CRLF（正则 `(.*)$` 的 `.` 不匹配 `\r`，CRLF 文件条目全失配返回空 Map → execute fail-closed 报「未注册」）；registerRepoInLocalYaml 的幂等跳过分支在磁盘原文含 `\r` 时也要落盘一次治愈——否则 CLI 报 ✅ 而磁盘永不治愈，register-repo 死循环。

## D-005@v2 test_strategy 实为两值，skip 接线兑现声明语义 + 增 evidence-auto
状态：implemented
锚点：未记录
最近确认：test123
理由：修正认知前提：`full/module` 语义不变；`skip` 从「声明未接线（配置后实际全量）」接线为「真跳过」；新增 `evidence-auto`（按 module-impact.md 推荐检查组合，缺失降级 module）；消费端 extractTestStrategy 在 src/verify-postcheck.js 接线（v1 遗漏的真实 reader）
来源：2026-08-23-adopt-harness-practices
supersedes：D-005@v1

## D-003@v1 提示克制语义：全零静默、每收尾最多一行、提示后清零、可关默认开
状态：implemented
变更：2026-09-11-friction-signal-hint
锚点：未记录
最近确认：2a46c07
理由：照抄 teamai 的克制约束并适配：① 任何类型计数全零 → 收尾零输出（顺利会话零打扰）；② 每次收尾最多输出一行；③ 提示输出后计数清零（「每会话最多提示一次」的等价实现——同一段摩擦只提示一次）；④ 措辞保持「若其中有值得沉淀的坑」条件式（防 agent 为消除提示而制造记录）；⑤ local.yaml 新键 friction_hint.enabled，默认 true，可一键关。

## D-001@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
锚点：未记录
文件：src/config-schema.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-001@v1 选道判据从文件数改为"有无落盘设计决策"
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：现行「≤3 文件且范围明确走 quick」中文件数是唯一可核验项、成了事实主判据；实证（sillyhub quicklog 交叉表）显示它量错维度——跨 2-3 模块×≤3 文件的改动文档同步率仅 24%，而单模块×4-6 文件反而 74%。改为语义判据：入口只回答"本次改动有没有需要落盘的设计决策"，有则走完整流程；AGENTS.md 判规模条款与 init 模板同步改写。

## D-009@v1 门禁阈值支持 local.yaml quick-gate 段覆写，缺省=校准默认值
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14（execute Step2 期追加）：THRESHOLDS 四键（l1_span/l1_files/l2_span/l2_files_degraded）经 local.yaml quick-gate 段覆写，未配置时用代码内默认值（即 task-05 校准定稿值）。与 D-007 否决的「配置化 gate 引擎」边界不同——不引入规则表达式/检查项配置面，仅四个数值键；默认值仍集中 quick-gate-profile.js 单点，config-schema.js 按「local.yaml 键单一数据源」惯例登记四 optional 键。
