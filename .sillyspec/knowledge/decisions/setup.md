---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — setup

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-902@v1 local.yaml 读写侧 CRLF 归一且幂等跳过分支落盘治愈
状态：implemented
锚点：src/local-register.js:35
最近确认：71a7fe6
理由：parseRepoRegistry 等解析入口必须先归一 CRLF（正则 `(.*)$` 的 `.` 不匹配 `\r`，CRLF 文件条目全失配返回空 Map → execute fail-closed 报「未注册」）；registerRepoInLocalYaml 的幂等跳过分支在磁盘原文含 `\r` 时也要落盘一次治愈——否则 CLI 报 ✅ 而磁盘永不治愈，register-repo 死循环。

## D-005@v2 test_strategy 实为两值，skip 接线兑现声明语义 + 增 evidence-auto
状态：implemented
锚点：未记录
最近确认：2c35ab2
理由：修正认知前提：`full/module` 语义不变；`skip` 从「声明未接线（配置后实际全量）」接线为「真跳过」；新增 `evidence-auto`（按 module-impact.md 推荐检查组合，缺失降级 module）；消费端 extractTestStrategy 在 src/verify-postcheck.js 接线（v1 遗漏的真实 reader）
supersedes：D-005@v1
