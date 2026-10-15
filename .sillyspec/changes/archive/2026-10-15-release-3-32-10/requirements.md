---
author: flow-machine-draft
created_at: 2026-10-15T05:42:09.555Z
---
# 需求规格（Requirements）— 2026-10-15-release-3-32-10

## 功能需求

### FR-01: package.json 与 package-lock.json version=3.32.10 且 test/quick-retired.test.mjs R5 版本锚断言同步并跑绿

- 版本面必须同步为 3.32.10：package.json 与 package-lock.json 的 version 字段一致为 3.32.10，且 test/quick-retired.test.mjs 的 R5 版本锚断言值与文案必须同步为 3.32.10，锚测试必须跑绿；本版零新增代码交付，随版内容为既有两笔 feat 提交（向量能力自动探测终态、向量开关发现性三触点）。

#### 场景：主路径

Given 本地 3.32.9、npm 线上 latest=3.32.9；When `npm version 3.32.10 --no-git-tag-version` 连带 lock 同步且 R5 锚断言改写；Then `node --test test/quick-retired.test.mjs` 全绿，断言「R5 package.json 版本 3.32.10」通过。

### FR-02: git push origin main 成功（pre-push 三门放行），origin/main 与本地一致

- 版本面提交与本地积压提交（两笔 feat、归档留痕与清偿）必须经显式 pathspec 提交后推送 origin main 成功；pre-push 三门（lint / 全量测试 / docs gate）必须放行，被拦时禁止跳过 hook、必须修复后重推。

#### 场景：主路径

Given 版本面三文件与积压提交在本地 main；When `git push origin main`；Then pre-push 三门全绿放行，推送回执含远端哈希区间，origin/main 与本地一致。

### FR-03: npm publish 回执含 sillyspec@3.32.10 与 shasum，传播后双核验 version=3.32.10 且 dist-tags.latest=3.32.10

- 发布前必须预核验通道存活（latest=3.32.9）；publish 回执必须含 shasum；传播后必须双核验 version=3.32.10 且 dist-tags.latest=3.32.10，任一不符即视为发布失败禁止带病收口。

#### 场景：主路径

Given 预核验 latest=3.32.9 通过证通道存活；When npm publish；Then 发布回执含 sillyspec@3.32.10 与 shasum，传播后双核验 version=3.32.10 且 dist-tags.latest=3.32.10。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 版本锚 3.32.10」
FR-02: 不适用：推送动作由 pre-push hook 三门（lint/全量测试/docs gate）客观核验，push 回执写进交付提交消息留痕，无独立测试面
FR-03: 不适用：发布回执与双核验属外部 registry 交互，回执（shasum/传播核验）写进交付提交消息留痕，registry 无本地测试面
