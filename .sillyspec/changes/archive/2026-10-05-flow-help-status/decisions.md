---
author: flow-machine-draft
created_at: 2026-10-05T14:39:26.293Z
---
# 决策记录（Decisions）— 2026-10-05-flow-help-status

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：用法行进一步变长（终端窄时折行观感下降）——接受，与既有单行长风格一致。试过但放弃：把 status 提示拆成第二行独立输出——放弃理由：exit(2) 前多行 stderr 无既有先例，且既有测试按单行 includes 断言，拆行增加断言面无收益。
