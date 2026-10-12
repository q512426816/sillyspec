---
author: flow-machine-draft
created_at: 2026-10-12T02:00:34.482Z
---
# 需求规格（Requirements）— 2026-10-12-release-3-32-6

## 功能需求

### FR-01: package.json version=3.32.6 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test test/quick-retired.test.mjs 零失败）

- package.json version MUST 为 3.32.6，test/quick-retired.test.mjs 的 R5 版本锚断言 MUST 同步为 3.32.6 且 node --test test/quick-retired.test.mjs MUST 零失败——仓库自证版本面与发布面一致。

#### 场景：版本面自证

- Given package.json version=3.32.6
- When node --test test/quick-retired.test.mjs
- Then R5 版本锚断言通过、退出码 0

### FR-02: git push origin main 成功（含本变更工件、随版修复两提交与既有未推送提交；pre-push 拦截时修复而非跳过）

- 本变更工件、随版修复提交（17ad14e1/f42d2726）与既有未推送提交 MUST 全部推达 origin/main；pre-push hook 拦截时 MUST 修复根因后重推（禁止 --no-verify 跳过）。

#### 场景：推送闭环

- When git push origin main
- Then origin/main HEAD = 本地 HEAD 且 hook 全过

### FR-03: npm publish 成功且钉扎通道双核验：npm view sillyspec version=3.32.6 且 dist-tags.latest=3.32.6（发布前预核验 latest=3.32.5 已确认通道可信）

- 发布 MUST 走腾讯 DoH（1.12.12.12）解析 + NODE_OPTIONS --require 进程级钉扎通道；发布前 MUST 预核验钉扎 npm view 返回 latest=3.32.5（通道存活证明，失败即停）；发布后 MUST 双核验 npm view sillyspec version=3.32.6 且 dist-tags.latest=3.32.6。

#### 场景：钉扎发布闭环

- Given 钉扎通道预核验 latest=3.32.5 通过
- When npm publish 后等待传播
- Then npm view sillyspec version=3.32.6 且 dist-tags.latest=3.32.6

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 文档与版本」
FR-02: 不适用：git push 为外部通道操作，无仓内自动化测试面（回执=推送回执区间留痕于 tasks/design）
FR-03: 不适用：npm publish 为外部 registry 操作，无仓内自动化测试面（回执=publish shasum + 双核验输出留痕于 tasks/design）
