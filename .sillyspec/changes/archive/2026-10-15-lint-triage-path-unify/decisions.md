---
author: flow-machine-draft
created_at: 2026-10-15T10:51:50.351Z
---
# 决策记录（Decisions）— 2026-10-15-lint-triage-path-unify

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：降档被滥用掩盖真失败——unattributable（输出无可识别路径）与鉴定链异常都保守返回 false 硬拦，且降档仅在「lint 单独失败」时生效（testFailed 优先 throw），配合降档 warning 三行提示（含存量债文件清单与清偿建议），滥用面可控。试过放弃：①只在 quality-scan 复制一份 triage 代码——制造第二实现即复发原缺陷（两路径分叉），放弃；②把降档判定塞进 verify-postcheck.js——该文件正被并行会话在途迭代（active WIP），编辑即 interleaved 提交风险，放独立新模块避开。
