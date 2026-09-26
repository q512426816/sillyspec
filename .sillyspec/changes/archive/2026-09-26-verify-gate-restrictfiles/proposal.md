---
author: flow-machine-draft
created_at: 2026-09-26T01:13:44.372Z
---
# 提案书（Proposal）— 2026-09-26-verify-gate-restrictfiles

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:134a80759ebbc1460a5ac9e20d225feefa374001f8533493ab7f31c07f8deaad:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-verify-gate-restrictfiles 留痕重锚 -->
任务原话转写：动机：五阶段 verify 阶段门（gates.js:1016 runVerifyTestCheck）未传 restrictFiles——quick 门（quick-audit.js:584）传了本会话声明文件做模块收窄，verify 门同形下（变更全提交后跑 verify --done）文件面解析 0 命中可能假 skip（该实测的没实测）——验收侧虚焊。归档 design 与评审 P2 已留痕此缺口（并行会话转达）。
成功标准：
- gates.js verify 测试对账门的 runVerifyTestCheck 调用传入 restrictFiles=resolveVerifyChangedFiles（includeWorkingTree: true，与 gates.js:1135 lint scope 同源口径）；空清单时不传（走全量——防 restrict 空数组反而制造假 skip）
- verify.js 步骤渲染首部加一行长会话提示（上下文已重时建议新会话跑 verify——R18 实证 verify 段轮均 3-4 倍长会话税）
- 测试：gates 文本级接线钉（restrictFiles 在场）+ 既有 gates/verify 套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:34d8e1f0a8758e8d8b099b80e9622853d86eb6cf97d955f89289fc66fdf4674a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-verify-gate-restrictfiles 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. gates.js verify 测试对账门的 runVerifyTestCheck 调用传入 restrictFiles=resolveVerifyChangedFiles（includeWorkingTree: true，与 gates.js:1135 lint scope 同源口径）
2. 空清单时不传（走全量——防 restrict 空数组反而制造假 skip）
3. verify.js 步骤渲染首部加一行长会话提示（上下文已重时建议新会话跑 verify——R18 实证 verify 段轮均 3-4 倍长会话税）
4. 测试：gates 文本级接线钉（restrictFiles 在场）+ 既有 gates
5. verify 套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:26c47ef851f4c2022cd03d5b4d0356eba4c4cc23f90ad6bff7fda304e27c87bf:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-verify-gate-restrictfiles 留痕重锚 -->
1. gates.js verify 测试对账门的 runVerifyTestCheck 调用传入 restrictFiles=resolveVerifyChangedFiles（includeWorkingTree: true，与 gates.js:1135 lint scope 同源口径）
2. 空清单时不传（走全量——防 restrict 空数组反而制造假 skip）
3. verify.js 步骤渲染首部加一行长会话提示（上下文已重时建议新会话跑 verify——R18 实证 verify 段轮均 3-4 倍长会话税）
4. 测试：gates 文本级接线钉（restrictFiles 在场）+ 既有 gates
5. verify 套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
