---
author: flow-machine-draft
created_at: 2026-11-04T05:13:24.652Z
---
# 提案书（Proposal）— 2026-11-04-junction-guard-rename-content

## 动机

任务原话转写：跨仓错绑告警与 rename op 带内容两护栏

动机：2026-11-04 跨工作区污染事故根因为本机 daemon junction 错绑（平台 workspace→sillyspec 仓），CLI 忠实跟随错绑指针无任何告警；且归档 rename op 不带内容，服务端源行缺失时 422 拒收整批（文件树同步 5 连败、40MB 积压近因）。用户指令（2026-11-04）：两护栏下个 session 一并做。

成功标准：
- resolvePlatformSpecDir 解析结果与 cwd 分属不同 git 仓时大声告警（含指针路径与修复指引）；同仓/无 git 仓/显式 --spec-dir 覆盖三种形态零告警
- computeSpecOps 的 rename op 携带 content（base64，与 add/update 同款），服务端源行缺失可物化目标不再 422

## 变更范围

按成功标准机械推导，共 2 条验收面：
1. resolvePlatformSpecDir 解析结果与 cwd 分属不同 git 仓时大声告警（含指针路径与修复指引）；同仓/无 git 仓/显式 --spec-dir 覆盖三种形态零告警
2. computeSpecOps 的 rename op 携带 content（base64，与 add/update 同款），服务端源行缺失可物化目标不再 422

## 成功标准（可验证）

1. resolvePlatformSpecDir 解析结果与 cwd 分属不同 git 仓时大声告警（含指针路径与修复指引）；同仓/无 git 仓/显式 --spec-dir 覆盖三种形态零告警
2. computeSpecOps 的 rename op 携带 content（base64，与 add/update 同款），服务端源行缺失可物化目标不再 422
