---
author: flow-machine-draft
created_at: 2026-10-10T05:35:39.229Z
---
# 提案书（Proposal）— 2026-10-10-release-3-32-4

## 动机

任务原话转写：发布 sillyspec@3.32.4 到 npm（复刻 3.32.2/3.32.3 发布惯例：release change + 版本面 FR + push FR + publish 钉扎通道核验 FR + 核验留痕归档）。版本面已就绪：package.json=3.32.4（af6fd5ac）+ quick-retired R5 版本锚=3.32.4（666a90f8，测试已跑绿）。本版载入修复：worktree 打捞归档感知（复活防护，2026-10-10-worktree-salvage-archive-aware）+ 漂移治理面等价保留评审（评审后修 P2 不再整轮重评，2026-10-10-drift-review-governance-keep）+ cli-uninit-cwd-gate 归档件等。环境注记：registry.npmjs.org 本地 DNS 被劫持（前两版实证），publish/核验须经腾讯 DoH（1.12.12.12）解析真实 IP + 进程级钉扎（NODE_OPTIONS --require .sillyspec/.runtime/dns-pin.cjs）；github.com 不受影响推送照常；早前未钉扎 npm view 返回 latest=3.32.2 系污染数据，真实 latest=3.32.3（3.32.3 发布留痕 308772b2），发布 3.32.4 版本序合法。

成功标准：
- 版本面核验：package.json version=3.32.4 且 quick-retired R5 锚断言绿（已达成，发布前复跑确认）
- git push origin main 成功（含本变更工件与既有 34+ 提交；pre-push hook 拦截则修复不跳过）
- npm publish 成功，钉扎通道双核验 npm view sillyspec version=3.32.4 且 dist-tags.latest=3.32.4
- 核验留痕写入 requirements（发布 shasum/files 数/传播等待/绕行注记），flow done 归档

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 版本面核验：package.json version=3.32.4 且 quick-retired R5 锚断言绿（已达成，发布前复跑确认）
2. git push origin main 成功（含本变更工件与既有 34+ 提交；pre-push hook 拦截则修复不跳过）
3. npm publish 成功，钉扎通道双核验 npm view sillyspec version=3.32.4 且 dist-tags.latest=3.32.4
4. 核验留痕写入 requirements（发布 shasum/files 数/传播等待/绕行注记），flow done 归档

## 成功标准（可验证）

1. 版本面核验：package.json version=3.32.4 且 quick-retired R5 锚断言绿（已达成，发布前复跑确认）
2. git push origin main 成功（含本变更工件与既有 34+ 提交；pre-push hook 拦截则修复不跳过）
3. npm publish 成功，钉扎通道双核验 npm view sillyspec version=3.32.4 且 dist-tags.latest=3.32.4
4. 核验留痕写入 requirements（发布 shasum/files 数/传播等待/绕行注记），flow done 归档
