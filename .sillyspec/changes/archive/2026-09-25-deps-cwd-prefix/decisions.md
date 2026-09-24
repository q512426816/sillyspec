---
author: flow-machine-draft
created_at: 2026-09-24T23:42:59.573Z
---
# 决策记录（Decisions）— 2026-09-25-deps-cwd-prefix

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=cd 目录推断按 S+ 取词，引号路径或带空格目录名不支持——模块命令惯例为无引号简单目录（local.yaml 模板与 R15/R16 实配均如此），不支持面留注释；死路=把 deps 批次 cwd 切到模块目录再拼根相对路径——等价但要动批次执行器两处，重定基一处收口更小。
