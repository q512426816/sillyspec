---
author: flow-machine-draft
created_at: 2026-11-22T16:59:06.946Z
---
# 需求规格（Requirements）— 2026-11-22-release-3349

> 发版单（用户指令 2026-11-22：「做完后提交推送，发布新版 npm 最小版本升级 3.34.9」）。代码面由词汇通道+优化三单各自变更实测门验证完毕并已推送（a83768b3）。

## 功能需求

### FR-01: package.json version 由 3.34.8 改为 3.34.9，无其他文件改动

- package.json 的 version 字段**必须**改为 `3.34.9`（patch 最小升级），**禁止**改动其他任何字段或其他源码文件（发布内容=已验证的 main 现状，本单零代码变更）。

#### 场景：主路径
Given main @ a83768b3 已验证推送 / When bump 版本 / When `git diff` 仅 package.json version 一行变更。

### FR-02: npm publish 成功发布 3.34.9（发布回执 tag/URL 留痕）

- `npm publish` **必须**成功发布 3.34.9；发布回执（npm 版本页 URL / dist-tag）**必须**留痕于本变更（验证回执或提交消息）。

#### 场景：主路径
Given package.json version=3.34.9 / When npm publish / Then 退出码 0，`npm view sillyspec version` 显示 3.34.9。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯版本号配置改动，验收=git diff 单行变更审读
FR-02: 不适用：发布操作无测试面，验收=npm publish 回执 + npm view sillyspec version=3.34.9
