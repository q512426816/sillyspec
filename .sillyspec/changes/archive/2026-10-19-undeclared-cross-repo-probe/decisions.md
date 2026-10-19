---
author: flow-machine-draft
created_at: 2026-10-19T10:31:17.688Z
---
# 决策记录（Decisions）— 2026-10-19-undeclared-cross-repo-probe

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：未提交面无法归属，并行会话在注册仓的 WIP 可能被点名为「本变更未标注交付」——故只做 advisory 且文案标注「疑似/人工确认」，不做阻断。放弃方案：①按文件类别判定「仅脚手架面」（类别表会随工具演进漂移、误伤合法 skill 变更，且生产实证的 `.codex/**` 不在旧分类集内）——改用真实窗口 diff 作证据；②升级为阻断+签收——跨仓交付是该工作区常态，阻断等于对常态路径收税，且探测本身可能受并行 WIP 干扰，宁 advisory。
