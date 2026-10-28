---
author: flow-machine-draft
created_at: 2026-10-28T06:00:09.550Z
---
# 决策记录（Decisions）— 2026-10-28-cp-review-debt

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险是 `:(glob)**/<dir>` pathspec 语义与预期偏差（不同 git 版本对 glob 魔法的 `**` 行为）——对策：测试直接断言嵌套路径不进快照树（行为锚而非语法锚），实测 git 版本（本机）通过；若某些老 git 不支持 glob 魔法，reset 会报错走 fail-open skip（存档退化但 tick 不受影响），属安全方向。 放弃的方案：① 把 .env* 也改成任意深度——敏感文件按项目根级约定，深层同名文件多为模板/示例（.env.example），全局排除过宽；② restore 校验改 merge-base --is-ancestor——祖先判定过宽（主历史全部提交都是链祖先，非 checkpoint 的普通提交会被放行读档）；③ 显示面也去帽——超长链列屏无信息量，帽是展示层的合理取舍（评审债的本质是校验被显示帽绑架，不是帽本身）。
