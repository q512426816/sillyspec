---
author: flow-machine-draft
created_at: 2026-10-11T14:09:32.860Z
---
# 需求规格（Requirements）— 2026-10-11-release-3-32-5

## 功能需求

### FR-01: package.json version=3.32.5 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test test/quick-retired.test.mjs 零失败）

- 发布前 package.json version 必须为 3.32.5，且 test/quick-retired.test.mjs 的 R5 版本锚断言（pkg.version === '3.32.5'）必须运行全绿（版本面与本变更 task-01 同提交落地，发布前复跑确认）。

#### 场景：发布前版本面复跑

- Given：package.json=3.32.5、R5 锚=3.32.5（d4ff0584 已提交）
- When：node --test test/quick-retired.test.mjs
- Then：零失败（pass 1，R5 断言通过）

### FR-02: git push origin main 成功（含本变更工件、随版修复归档件与既有未推送提交；pre-push 拦截时修复而非跳过）

- main 上全部未推送提交（本 release 变更工件 + 版本面 + 2026-10-11-resurrect-guard-verify-hardening 交付与归档件 + 平台墓碑收敛）必须以显式 pathspec 提交并成功推送 origin main；pre-push hook（lint+test+docs gate）拦截时必须修复问题而非跳过。

#### 场景：推送

- Given：main 领先 origin 5 提交（墓碑收敛 + 变更 1 交付 + 归档 + 版本面）
- When：git push origin main
- Then：pre-push 门放行（lint + test + docs gate 基线 0），推送成功远端与本地一致（61198e87..d4ff0584）

### FR-03: npm publish 成功且钉扎通道双核验：npm view sillyspec version=3.32.5 且 dist-tags.latest=3.32.5（发布前预核验 latest=3.32.4 已确认通道可信）

- npm publish 必须经 DNS 钉扎通道（腾讯 DoH 1.12.12.12 直连 IP 解析真实 Cloudflare IP 段 + NODE_OPTIONS --require 进程级钉扎，复刻 3.32.2/3.32.3/3.32.4 绕行）成功发布；发布前必须经同一钉扎通道预核验 latest=3.32.4（通道可信证明，预核验失败即停不带病发布）；发布后传播 ≥180s 必须双核验 npm view sillyspec version=3.32.5 且 dist-tags.latest=3.32.5（未钉扎查询在劫持环境下不可信，禁止用作核验）。

#### 场景：发布与核验

- Given：真实 latest=3.32.4（钉扎预核验已确认），本地 package.json=3.32.5，钉扎脚本 /tmp/dns-pin-registry.cjs 钉 104.16.0.34（DoH 实测段 104.16.x.34 内）
- When：npm publish（钉扎）→ 传播 180s → npm view sillyspec version + dist-tags（钉扎）
- Then：publish 成功（+ sillyspec@3.32.5，shasum 762bd0f57a6f58b6283046fe86bf74fe1a1424ea，330 files），双核验 version=3.32.5 且 latest=3.32.5

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 文档与版本（FR-03）」块（pkg.version === '3.32.5' 断言）
FR-02: 不适用：git push 为发布操作面非代码行为，无测试可绑；证据=本次推送回执（pre-push 门 lint+test+docs gate 全绿放行，61198e87..d4ff0584）
FR-03: 不适用：npm publish 为外部通道操作非代码行为，无测试可绑；证据=发布回执（shasum 762bd0f5…）与钉扎双核验输出（version=3.32.5、dist-tags.latest=3.32.5）
