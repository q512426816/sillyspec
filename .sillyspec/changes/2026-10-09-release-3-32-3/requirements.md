---
author: flow-machine-draft
created_at: 2026-10-09T15:28:35.294Z
---
# 需求规格（Requirements）— 2026-10-09-release-3-32-3

## 功能需求

### FR-01: package.json version=3.32.3 且 quick-retired 测试 R5 版本锚同步（pkg.version === '3.32.3' 断言绿）

- package.json version **必须**为 3.32.3，且 test/quick-retired.test.mjs 的 R5 版本锚断言同步为 pkg.version === '3.32.3'，测试运行**必须**全绿。

#### 场景：主路径

- Given：线上 latest 与本地均为 3.32.2，本次 patch+1
- When：node --test test/quick-retired.test.mjs
- Then：R5 断言 pkg.version === '3.32.3' 通过，套件零失败

### FR-02: git push origin main 成功（含本变更归档）

- 版本面提交与本变更归档件**必须**以显式 pathspec 提交并成功推送 origin main（pre-push hook 拦截时修复问题而非跳过）。

#### 场景：主路径

- Given：main 领先 origin 若干提交（含 rejected-write-side 五笔与本次版本面）
- When：git push origin main
- Then：推送成功，远端 main 与本地一致

### FR-03: npm publish 成功且 npm view sillyspec version=3.32.3（latest 核验）

- npm publish **必须**成功，且发布后 npm view sillyspec version **必须**返回 3.32.3（latest 核验通过）。

#### 场景：主路径

- Given：npm 线上 latest=3.32.2，本地 package.json 已是 3.32.3
- When：npm publish && npm view sillyspec version
- Then：发布成功，npm view 返回 3.32.3

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 package.json 版本 3.32.3 版本锚」（本次已跑零失败）
FR-02: 不适用：git push 为外部传输操作，无单测面；由推送命令输出与远端状态核验
FR-03: 不适用：npm publish 为外部发布操作，无单测面；由 npm view sillyspec version=3.32.3 核验

## 核验留痕

- FR-01 ✅：node --test test/quick-retired.test.mjs 零失败（R5 断言 pkg.version === '3.32.3'）；flow done 实测与 pre-push 门全绿。
- FR-02 ✅：git push origin main 成功（344cbf7d..3d34bf06，pre-push lint+test+docs gate 39=基线放行）；归档件随后续推送上远端。
- FR-03 ✅：npm publish 成功（+ sillyspec@3.32.3，shasum 4e6fc9f5b39838eed13578d2c8f7ecf313a14028，330 files）；传播约 3 分钟后 npm view sillyspec version=3.32.3、dist-tags latest=3.32.3 双核验通过。
- 过程注记：发布时 registry.npmjs.org 本地 DNS 与阿里 DoH 均被劫持至停放 IP 103.73.220.77，腾讯 DoH（1.12.12.12）解析出真实 Cloudflare IP 段（104.16.x.34）；经进程级 DNS 钉扎（NODE_OPTIONS --require 临时脚本，仅本进程、零系统改动，复刻 3.32.2 发版同款绕行）完成发布与核验；github.com 解析不受影响，推送照常。
