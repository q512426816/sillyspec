# 决策记录

## D-001@v1 search 位置参数兼容取代只改文档
- 状态：implemented
- 模块域：cli
- 问题：AGENTS.md 模板写 search "<关键词>"（位置形态）但 CLI 只认 --query——反馈建议修 AGENTS.md，修文档还是修 CLI？
- 答案：修 CLI：加位置参数回退（--query 缺失取首个非 flag token），--query 保持兼容且并存时优先。理由：AGENTS.md 由 init 分发且重跑 init 同版本不更新，只改文档治不了存量仓；CLI 兼容让模板/两仓 AGENTS.md/子命令 help 四处既有写法一次性全变真，模板零改动。
落地层：用户原话保留——平台仓反馈（2026-11-04）「AGENTS.md 写的用法是 sillyspec knowledge search \"<关键词>\"，但实际 CLI 要求 --query 显式 flag，文档与 CLI 不一致，建议顺手修 AGENTS.md」
