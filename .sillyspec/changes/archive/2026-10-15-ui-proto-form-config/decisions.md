---
author: flow-machine-draft
created_at: 2026-10-15T10:35:34.957Z
---
# 决策记录（Decisions）— 2026-10-15-ui-proto-form-config

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 风险1：local.yaml 手写 YAML 嵌套缩进错 → 解析失败被当未登记。对策：js-yaml fail-soft + 缺席与解析失败同态（registered:false）+ 强提醒文案会持续出现倒逼修复；不做 YAML 校验器（越界）。 - 风险2：repos override 匹配不到（触达路径未落 local.yaml repos 注册）→ 静默退仓级。对策：可接受降级（仓级兜底即用户登记的默认态），guidance 不额外告警（噪音大于收益）。 - 风险3：新行破坏字节级既有断言。对策：无参路径逐字不变已由 guidance-output-neutrality/ui-visual-guidance 既有测试锁定；新四态行禁生态命令词。 - 死路：考虑过把 form 校验做硬门（登记非法即拒收口）——放弃：local.yaml 是用户配置面不是变更产物，硬门会把配置笔误升级成流程阻断；警告+强提醒足够。
