---
author: flow-machine-draft
created_at: 2026-10-22T17:10:34.488Z
---
# 提案书（Proposal）— 2026-10-23-flow-done-preflight

## 动机

任务原话转写：flow done 收口预检一次报全

动机与背景：2026-10-23 四子代理收口画像实证：621 次 flow done 调用/255 变更=2.44 次/变更，净浪费 152 次 RTT（24.5%）源于逐门 fail-fast 串行拒绝；其中 dirty-gap 门在实测门之后——56% 触发率的门每次拦截都先付一轮完整实测（本仓 58s 起、大仓分钟级）；review.json schema 违规（历史 14 次）也要等 review 子步才拒，与 dirty-gap 同轮存在时逐个报。新增收口预检（fail-together）：实测门前只读收集全部便宜阻断条件一次报全（b1ab65b2「两条修复一次给全」模式升格），命中即拦在付费实测之前；全过静默零行为变化。用户已显式授权「干吧，做完有价值的内容并归档」——autopilot 直跑到底（需求已含决策：方案经 2026-10-23 四子代理独立分析定案，--no-prestage 声明留痕）。

成功标准：
- flow done 在实测门（runQuickTestLintGate）之前运行只读收口预检：dirty-gap 预判（与 patch 子步同源 collectFreezeFiles 判定链，只读）＋独占 worktree 孤儿面预判（scanOrphanFace 只读）＋review.json 在场时的 schema 预验（validateReviewJson）——命中任一阻断条件时全部条件+处置出路一次打印后 exit 1，实测不启动，不写任何子步完成标记
- 预检与权威门同判定同源（镜像 patch 子步的 turbo/--freeze-dirty/--accept-dirty-gap/--accept-orphan-face 旗标语义与子步已完成跳过守卫）：预检不放行任何权威门会拦的面；全过时零额外输出、既有 8 子步与标记零变化；预检内部异常 fail-safe 静默放行（权威门仍在原子步原序）
- 处置后重跑走既有断点续语义（--accept-dirty-gap 等旗标照常生效），patch/review 权威门照常复核
- e2e 测试：dirty 命中时实测未启动且一次报全；坏 review.json 预检先拦；全过路径预检静默且收口形态不变

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. flow done 在实测门（runQuickTestLintGate）之前运行只读收口预检：dirty-gap 预判（与 patch 子步同源 collectFreezeFiles 判定链，只读）＋独占 worktree 孤儿面预判（scanOrphanFace 只读）＋review.json 在场时的 schema 预验（validateReviewJson）——命中任一阻断条件时全部条件+处置出路一次打印后 exit 1，实测不启动，不写任何子步完成标记
2. 预检与权威门同判定同源（镜像 patch 子步的 turbo/--freeze-dirty/--accept-dirty-gap/--accept-orphan-face 旗标语义与子步已完成跳过守卫）：预检不放行任何权威门会拦的面；全过时零额外输出、既有 8 子步与标记零变化；预检内部异常 fail-safe 静默放行（权威门仍在原子步原序）
3. 处置后重跑走既有断点续语义（--accept-dirty-gap 等旗标照常生效），patch/review 权威门照常复核
4. e2e 测试：dirty 命中时实测未启动且一次报全；坏 review.json 预检先拦；全过路径预检静默且收口形态不变

## 成功标准（可验证）

1. flow done 在实测门（runQuickTestLintGate）之前运行只读收口预检：dirty-gap 预判（与 patch 子步同源 collectFreezeFiles 判定链，只读）＋独占 worktree 孤儿面预判（scanOrphanFace 只读）＋review.json 在场时的 schema 预验（validateReviewJson）——命中任一阻断条件时全部条件+处置出路一次打印后 exit 1，实测不启动，不写任何子步完成标记
2. 预检与权威门同判定同源（镜像 patch 子步的 turbo/--freeze-dirty/--accept-dirty-gap/--accept-orphan-face 旗标语义与子步已完成跳过守卫）：预检不放行任何权威门会拦的面；全过时零额外输出、既有 8 子步与标记零变化；预检内部异常 fail-safe 静默放行（权威门仍在原子步原序）
3. 处置后重跑走既有断点续语义（--accept-dirty-gap 等旗标照常生效），patch/review 权威门照常复核
4. e2e 测试：dirty 命中时实测未启动且一次报全；坏 review.json 预检先拦；全过路径预检静默且收口形态不变
