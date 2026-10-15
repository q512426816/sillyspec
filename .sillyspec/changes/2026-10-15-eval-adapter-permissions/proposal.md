---
author: flow-machine-draft
created_at: 2026-10-15T13:02:13.308Z
---
# 提案书（Proposal）— 2026-10-15-eval-adapter-permissions

## 动机

任务原话转写：eval adapter 权限修复——claude headless 无权限预授致 Write 全被自动拒绝（真根因，\0NN 转义理论证伪）

动机：workdir 命名修复（2026-10-15-eval-workdir-naming）后重跑臂 A 仍被拦——claude 自身 JSON 输出的 permission_denials 数组实锤：eval.config.json 的 adapter command（claude -p --output-format json --max-turns N）无任何权限旗标，headless 模式无交互授批通道，Write/Bash 全部自动拒绝（is_error=false 但 agent 实际只读空转烧 token）。这是评测适配器配置缺陷：被测工作目录是一次性 gitignored 草稿目录（每次重跑清空重建），标准做法是 skip-permissions。上一变更采纳的 \0NN 转义根因理论被受控重跑证伪（run- 前缀命名下仍被拦）——命名前缀保留（无害加固），真根因随本变更修正并留痕。

成功标准：
- eval.config.json 的 arms.A/B 共用 adapter.command 追加 --dangerously-skip-permissions（两臂同旗标）
- 新增测试断言 adapter command 含该旗标（配置漂移保护：有人删旗标时测试红）
- workdir 命名修复变更的 design 风险节补记根因修正（转义理论证伪的诚实留痕）——以 knowledge/decisions 或本变更 design 记录
- 变更自身测试面跑绿，lint 通过

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. eval.config.json 的 arms.A/B 共用 adapter.command 追加 --dangerously-skip-permissions（两臂同旗标）
2. 新增测试断言 adapter command 含该旗标（配置漂移保护：有人删旗标时测试红）
3. workdir 命名修复变更的 design 风险节补记根因修正（转义理论证伪的诚实留痕）——以 knowledge/decisions 或本变更 design 记录
4. 变更自身测试面跑绿，lint 通过

## 成功标准（可验证）

1. eval.config.json 的 arms.A/B 共用 adapter.command 追加 --dangerously-skip-permissions（两臂同旗标）
2. 新增测试断言 adapter command 含该旗标（配置漂移保护：有人删旗标时测试红）
3. workdir 命名修复变更的 design 风险节补记根因修正（转义理论证伪的诚实留痕）——以 knowledge/decisions 或本变更 design 记录
4. 变更自身测试面跑绿，lint 通过
