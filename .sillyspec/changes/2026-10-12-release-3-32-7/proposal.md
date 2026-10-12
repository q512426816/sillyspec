---
author: flow-machine-draft
created_at: 2026-10-12T15:10:24.425Z
---
# 提案书（Proposal）— 2026-10-12-release-3-32-7

## 动机

任务原话转写：发布变更（照 3.32.1~3.32.6 惯例三步：版本面 → 推送 → 钉扎发布）。用户显式指令「提交推送代码，发布新版 npm 3.32.7」。

随版内容（今日已归档七变更）：approve-channel-attest（spec 断点通道化治理）/ review-probe-injection（项目评审探针 local.yaml 数据驱动双面注入）/ tick-evidence-multi-anchor（tick --evidence 证据补录 + reviewedAgainst 跨仓双形态锚）/ cli-friction-signal（deps 阻断报错自足 + 哨兵扫描面声明 + 跨仓标记子仓指路）/ fire-dogfood-retrospective（复盘快照 docs）/ thick-taskbook-cli（厚档评审任务书 CLI 单源双出口）/ verify-handover-hint（运行验证移交场景三处文案显性化）。

成功标准：
- package.json version=3.32.7 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test 零失败）
- git push origin main 成功（pre-push 拦截时修复而非跳过）
- npm publish 走钉扎通道（腾讯 DoH 解析 + NODE_OPTIONS --require 进程级钉扎，脚本 /tmp/dns-pin-registry.cjs）；发布前预核验钉扎 npm view 返回 latest=3.32.6（通道存活证明，失败即重解析 DoH 更新 PIN 或停）；发布后双核验 npm view sillyspec version=3.32.7 且 dist-tags.latest=3.32.7

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. package.json version=3.32.7 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test 零失败）
2. git push origin main 成功（pre-push 拦截时修复而非跳过）
3. npm publish 走钉扎通道（腾讯 DoH 解析 + NODE_OPTIONS --require 进程级钉扎，脚本 /tmp/dns-pin-registry.cjs）；发布前预核验钉扎 npm view 返回 latest=3.32.6（通道存活证明，失败即重解析 DoH 更新 PIN 或停）；发布后双核验 npm view sillyspec version=3.32.7 且 dist-tags.latest=3.32.7

## 成功标准（可验证）

1. package.json version=3.32.7 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test 零失败）
2. git push origin main 成功（pre-push 拦截时修复而非跳过）
3. npm publish 走钉扎通道（腾讯 DoH 解析 + NODE_OPTIONS --require 进程级钉扎，脚本 /tmp/dns-pin-registry.cjs）；发布前预核验钉扎 npm view 返回 latest=3.32.6（通道存活证明，失败即重解析 DoH 更新 PIN 或停）；发布后双核验 npm view sillyspec version=3.32.7 且 dist-tags.latest=3.32.7
