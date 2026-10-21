---
author: flow-machine-draft
created_at: 2026-10-21T00:00:00.000Z
---
# 需求规格（Requirements）— 2026-10-21-release-3-33-3

## 功能需求

### FR-01: 版本面（必须）

package.json 与 package-lock.json 必须升至 3.33.3（npm version --no-git-tag-version 连带 lock 同步）；R5 版本锚（test/quick-retired.test.mjs 断言 pkg.version）必须同步 3.33.3 且该测试文件单跑绿。

#### 场景：主路径

Given 版本面提交落盘
When node --test test/quick-retired.test.mjs
Then 1/1 绿且断言值为 3.33.3。

### FR-02: 推送与门（必须）

git push origin main 必须成功；pre-push 三门（lint + 全量 test + docs gate 棘轮）必须全过（全量在此跑属口径内——push 门正是全量归属位）；推送回执（范围 sha）留痕。

#### 场景：主路径

Given 13+ 版本面提交在本地 main
When git push origin main
Then pre-push 门全绿、远端推进、回执记录 a..b 范围。

### FR-03: 发布与双核验（必须）

npm publish 必须成功（回执 shasum/文件数留痕）；传播等待后双核验：npm view sillyspec version=3.33.3 且 dist-tags.latest=3.33.3。

#### 场景：主路径

Given push 完成
When npm publish && 等待传播 && npm view
Then version=3.33.3、dist-tags.latest=3.33.3。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 package.json 版本 3.33.3」（既有锚同步）
FR-02: 不适用：推送门（回执属 git/CI 面，pre-push 自证）
FR-03: 不适用：发布回执（npm view 双核验留痕于提交消息与归档件）
