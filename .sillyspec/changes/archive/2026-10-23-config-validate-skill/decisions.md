---
author: flow-machine-draft
created_at: 2026-10-23T01:59:51.175Z
---
# 决策记录（Decisions）— 2026-10-23-config-validate-skill

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：schema 是文档级注册（readers 字符串指向读码点），键定义与真实 reader 行为可能漂移——校验过≠运行时一定读对。对策：①校验声明口径=「schema 注册面」（人类/--json 输出明示）；②段内必填只对 required:true 硬键生效（凭据族，reader 行为简单）；③doctor 的运行时维度（编码完整性等）互补不重叠。放弃方案：①把校验做进每个 reader（69 处散改，爆炸面大，弃）；②自动修复坏键（--fix）——写用户配置文件需谨慎，v1 只报不修，弃；③缺文件报错——违反零配置契约（缺省即全默认形态），弃。
