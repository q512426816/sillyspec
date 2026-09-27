---
author: flow-machine-draft
created_at: 2026-09-27T04:26:07.089Z
---
# 任务注册表（Tasks）— 2026-09-27-ui-visual-guidance

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: src/ui-visual.js 模块——检测启发式（input 词表+声明文件面扩展名兜底）/须知文案/分级探针/local.yaml 档位读取（CRLF 容错）/段落渲染 (FR-01 FR-02 FR-06)
- [x] task-02: verify-probes.js 注册探针 12——runVerifyProbes 计算（fail-soft）+ return 对象 + renderVerifyProbesReport 段渲染（旧 result 无键兜底零回归） (FR-02)
- [x] task-03: flow.js 双接线——start 输出按 detectUiTouch 条件注入「UI 变更执行须知」；flow done probes 子步 error 档拦截（reportMidFail+exit 1）/warn 档提示 (FR-01 FR-03)
- [x] task-04: run/gates.js verify 收尾 error 门（探针 10 块后同款形状）+ config-schema.js ui_visual_gate 键（warn|error|off，默认 warn） (FR-02 FR-03)
- [x] task-05: 单测 12 用例（检测正反例/三档/降级硬规则正反向/裁决放行/跨行不误配/CRLF/仓中立/四形态渲染）+ 相关回归 16 用例全绿；check-syntax 剩 test-bindings.js 存量债非本变更引入 (FR-04 FR-05)
- [x] task-06: 自食其力验证——本变更触发探针 12 自检（uiTouched+降级声明双命中），补 visual-evidence.md 用户裁决留痕后 level=ok；补前为 error 恒拦路径实证 (FR-03)
