---
author: flow-machine-draft
created_at: 2026-10-13T05:20:01.442Z
---
# 需求规格（Requirements）— 2026-10-13-release-3-32-8

## 功能需求

### FR-01: package.json version=3.32.8 且 test/quick-retired.test.mjs R5 版本锚断言绿

- package.json version **必须**为 3.32.8（npm version --no-git-tag-version，连带 package-lock.json）；test/quick-retired.test.mjs R5 锚断言**必须**同步 3.32.8 且 `node --test test/quick-retired.test.mjs` 零失败。源码零改动（随版内容为今日已归档变更 2026-10-13-cli-pit-fix-batch，版本面只做数字推进）。

#### 场景：主路径

Given 版本面提交；When node --test test/quick-retired.test.mjs；Then 零失败。

### FR-02: git push origin main 成功（pre-push 拦截时修复而非跳过）

- `git push origin main` **必须**成功，携带今日全部交付与归档提交及版本面；pre-push hook（lint+test+docs 三门）拦截时**必须**修复问题后重推（禁止跳过 hook）。

#### 场景：主路径

When git push origin main；Then 成功回执（无 rejected）。

### FR-03: npm publish 钉扎通道：预核验 latest=3.32.7 → publish → 双核验 version=3.32.8 且 dist-tags.latest=3.32.8

- 发布**必须**走钉扎通道（进程级 dns.lookup 钉扎，零系统改动；IP 经腾讯 DoH 1.12.12.12 直连解析刷新，历史 PIN 104.16.0.34 不保证仍有效）；发布前**必须**预核验钉扎 `npm view sillyspec version` 返回 3.32.7（通道存活证明）——失败时先重解析 DoH 更新 PIN 再核验，仍失败即停不带病发布；发布后**必须**双核验 version=3.32.8 且 dist-tags.latest=3.32.8。

#### 场景：主路径

Given 预核验 3.32.7 通过；When npm publish（钉扎）；Then 发布回执含 shasum，双核验两值均 3.32.8。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 版本锚 3.32.8」
FR-02: 不适用：发布操作面——以 push 回执为证据（任务勾选带证据补录）
FR-03: 不适用：发布操作面——以预核验/发布/双核验三段回执为证据（任务勾选带证据补录）
