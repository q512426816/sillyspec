---
author: flow-machine-draft
created_at: 2026-10-16T08:28:38.146Z
---
# 提案书（Proposal）— 2026-10-16-ci-linux-residual-fix

## 动机

任务原话转写：CI test job linux 余项清偿：backlog-batch-a mock constants 不可重定义炸整文件 + feedback-batch2 ⑥ 段大小写折叠平台差断言

动机与背景：CI 上马后最新跑（38868232912，HEAD 7f4892ce）全量 818 文件收敛至 814 通过/2 失败，余项两类：①test/backlog-batch-a.test.mjs 在 linux 上 mock.module('fs') 装载 CJS 内置模块时对 mock exports 逐键 ObjectDefineProperty，fs.constants 在 linux 是 writable:false/configurable:false 数据属性 → TypeError: Cannot redefine property: constants 整文件炸（windows 上同属性 writable:true 侥幸不炸——本地 12/12 绿与 CI 红的分叉点；同仓 worktree-junction-fail-loud.test.mjs 已有 delete fsExports.constants 既定解法）；②test/feedback-batch2-hardening.test.mjs ⑥ 段把「大小写折叠命中」写成跨平台断言，实现口径（src/verify-postcheck.js pathKey 的 foldCase）仅 win32/darwin 折叠，linux 大小写敏感须如实落②类。两处均属首轮上 CI 的跨平台适配欠账，非产品逻辑缺陷。本轮同时建立本地 Linux 复现能力（Docker node:24-alpine 容器挂载仓 + git），失败面先本地复现再修，不靠盲推等 CI。

成功标准：
- test/backlog-batch-a.test.mjs 在 linux 与 windows 双端退出码 0（12/12 通过）
- test/feedback-batch2-hardening.test.mjs 双端退出码 0；⑥ 段 linux 钉「大小写不符如实落②类不放水」、win32/darwin 钉「折叠命中」，./ 前缀+尾部注记与 NEW 未建两项跨平台钉死
- 本地 Linux 容器内全量 npm test 零失败（818 文件）
- 推送后 CI test job 转绿（lint/docs-gate 维持绿）
- 零回归：两文件其余断言、src 实现（quicklog.js/verify-postcheck.js）行为不改
- quick 审计 EOL 假 M 探测在 git ≤2.43（Debian 12 / Ubuntu 24.04 默认 git）不得静默失效——改走 diff --numstat + 源码钉锁形态（容器 git 2.39.5 实证过滤失效，CI runner git 2.55 看不出来）

## 变更范围

按成功标准机械推导，共 7 条验收面：
1. test/backlog-batch-a.test.mjs 在 linux 与 windows 双端退出码 0（12/12 通过）
2. test/feedback-batch2-hardening.test.mjs 双端退出码 0；⑥ 段 linux 钉「大小写不符如实落②类不放水」、win32/darwin 钉「折叠命中」，./ 前缀+尾部注记与 NEW 未建两项跨平台钉死
3. 本地 Linux 容器内全量 npm test 零失败（818 文件）
4. 推送后 CI test job 转绿（lint/docs-gate 维持绿）
5. 零回归：两文件其余断言、src 实现（quicklog.js/verify-postcheck.js）行为不改
6. src/verify-postcheck.js 不含裸 NUL 字节（复合键分隔符以 `\u0000` 转义书写），grep/rg 检索不再被二进制判定吞掉命中
7. quick 审计 EOL 假 M 探测在 git ≤2.43 上不得静默失效（改走 diff --numstat + 源码钉锁形态）

## 成功标准（可验证）

1. test/backlog-batch-a.test.mjs 在 linux 与 windows 双端退出码 0（12/12 通过）
2. test/feedback-batch2-hardening.test.mjs 双端退出码 0；⑥ 段 linux 钉「大小写不符如实落②类不放水」、win32/darwin 钉「折叠命中」，./ 前缀+尾部注记与 NEW 未建两项跨平台钉死
3. 本地 Linux 容器内全量 npm test 零失败（818 文件）
4. 推送后 CI test job 转绿（lint/docs-gate 维持绿）
5. 零回归：两文件其余断言、src 实现（quicklog.js/verify-postcheck.js）行为不改
6. src/verify-postcheck.js 不含裸 NUL 字节（复合键分隔符以 `\u0000` 转义书写），grep/rg 检索不再被二进制判定吞掉命中——排查本轮⑥段口径时的真实致盲点，随本次一并清偿（源码卫生面，运行时字符串值逐字节不变）
7. quick 审计 EOL 假 M 探测在 git ≤2.43 上不得静默失效——改走 diff --numstat + 源码钉锁形态；容器 git 2.39.5 实证过滤失效、WSL git 2.43.0 同怪癖，CI runner git 2.55 看不出该版本差故必须钉形态
