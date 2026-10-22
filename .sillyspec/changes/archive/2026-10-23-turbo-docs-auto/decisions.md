---
author: flow-machine-draft
created_at: 2026-10-22T23:59:24.040Z
---
# 决策记录（Decisions）— 2026-10-23-turbo-docs-auto

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：误降档（有代码面被判纯文档→跳过实测与评审）。对策三重：①分类器复用实测门同源常量（实测门「宁可多跑不可漏跑」口径的同一双通道正则——src 段+代码扩展名）；②面含脏面（未提交代码文件也拦降档）且经 dirty_gate_ignore 剔除后判（已知残渣口径与 dirty 门同源）；③判定异常/面空 fail-closed 全量。放弃方案：①docs-auto 档保留评审 1/4 采样（与旗标档差异化）——需把评审豁免从 turbo 单布尔改成分源路由，五个消费点的简单继承就破了，采样校准由豁免面既有 1/4 承担，docs-auto 不叠加机制，弃（如实披露：docs-auto 档与旗标档同形全免）；②按 requirements/design 声明面判纯文档——声明可谎报/滞后，git 面是机械事实，弃。
