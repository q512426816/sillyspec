---
author: flow-machine-draft
created_at: 2026-10-10T05:35:39.229Z
---
# 需求规格（Requirements）— 2026-10-10-release-3-32-4

## 功能需求

### FR-01: 版本面核验——package.json version=3.32.4 且 quick-retired R5 版本锚断言绿

发布前 package.json version 必须为 3.32.4，且 test/quick-retired.test.mjs 的 R5 版本锚断言（pkg.version === '3.32.4'）必须运行全绿（版本面已在 af6fd5ac/666a90f8 落地，本条为发布前复跑确认）。

#### 场景：发布前版本面复跑

- Given：package.json=3.32.4、R5 锚=3.32.4（均已提交）
- When：node --test test/quick-retired.test.mjs
- Then：零失败（R5 断言通过）

### FR-02: git push origin main 成功（含本变更工件与既有未推送提交）

main 上的全部未推送提交（含本 release 变更工件与随版修复归档件）必须以显式 pathspec 提交并成功推送 origin main；pre-push hook 拦截时必须修复问题而非跳过。

#### 场景：推送

- Given：main 领先 origin 34+ 提交（两修复变更归档件 + 版本面 + 本变更）
- When：git push origin main
- Then：推送成功，远端 main 与本地一致

### FR-03: npm publish 成功且钉扎通道双核验 latest=3.32.4

npm publish 必须经 DNS 钉扎通道（腾讯 DoH 解析真实 IP + NODE_OPTIONS --require 进程级钉扎，复刻 3.32.2/3.32.3 绕行）成功发布，且发布后经同一钉扎通道双核验 npm view sillyspec version=3.32.4 与 dist-tags.latest=3.32.4（未钉扎查询在劫持环境下不可信——本次发布前实测未钉扎返回 3.32.2 系污染数据）。

#### 场景：发布与核验

- Given：真实 latest=3.32.3（3.32.3 发布留痕 308772b2），本地 package.json=3.32.4，DNS 钉扎脚本就绪
- When：npm publish（钉扎）→ 等传播 → npm view sillyspec version + dist-tags（钉扎）
- Then：version=3.32.4 且 latest=3.32.4

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 package.json 版本 3.32.4 版本锚」（发布前复跑零失败）
FR-02: 不适用：git push 为外部传输操作，无单测面；由推送命令输出与远端状态核验
FR-03: 不适用：npm publish 为外部发布操作，无单测面；由钉扎通道 npm view version/dist-tags 双核验

## 核验留痕

- FR-01 ✅：node --test test/quick-retired.test.mjs 零失败（R5 断言 pkg.version === '3.32.4'，发布前复跑）。
- FR-02 ✅：git push origin main 成功（8698c0d4..d33dc4c5，pre-push lint+test+docs gate 放行；docs 基线陈旧 39<80 自动重锚 39→42——棘轮只紧不松）；归档件随后续推送上远端。
- FR-03 ✅：npm publish 成功（+ sillyspec@3.32.4，shasum a1c7bbaee0140b0e13751633bae58220243dc346，328 files，unpacked 13.3 MB）；传播等待 180s 后钉扎通道双核验通过——npm view sillyspec version=3.32.4 且 dist-tags.latest=3.32.4。
- 过程注记：发布环境 DNS 劫持仍在本轮实证——未钉扎 npm view 返回 latest=3.32.2（污染数据，真实为 3.32.3）；腾讯 DoH（1.12.12.12 直连）解析真实 Cloudflare IP 池 104.16.x.34，钉扎 IP 自 3.32.3 用的 104.16.19.35 刷新为 104.16.11.34（.sillyspec/.runtime/dns-pin.cjs，gitignore 面，进程级注入零系统改动，复刻 3.32.2/3.32.3 同款绕行）；发布前钉扎预核验 latest=3.32.3 确认通道可信后发布；github.com 解析不受影响，推送不经钉扎。
