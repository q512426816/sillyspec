
## ql-20260909-004-f629 | 2026-09-09 06:15:01 | archive 三重核对机械化——CLI 代算 + prompt 注入
状态：已完成
关联变更：（无）
文件：
- src/archive-delta.js（audit）
- src/stages/archive.js（prompt 消费化）
- src/run/prompt.js（注入）
- test/archive-closeout-mech.test.mjs（4 用例）
需求：archive 三重核对机械化——CLI 代算 + prompt 注入
根因：轮次经济学 §3.1 archive 收口项：让 agent 手跑 git diff 逐文件比对是纯机械轮
方案：archive-delta auditModuleImpactAgainstDiff（三源 diff × 矩阵集合比对）；prompt.js {ARCHIVE_IMPACT_AUDIT} 注入；archive.js 步骤 prompt 消费化；卡+sidecar+镜像
结果：closeout-mech 4/4；archive-delta/prompt 族回归 3/3 绿；lint 过；_verify 0
