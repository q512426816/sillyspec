---
author: flow-machine-draft
created_at: 2026-10-10T07:55:50.271Z
---
# 决策记录（Decisions）— 2026-10-10-dyn-subset-nontest-runner-face

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：预填面收紧的漏检边界——连字形态 `foo_test.js`（无 `.test.` 点锚）不再预填。取向与 isTestFileName 注释一致（宁紧勿松：漏检落 agent 手查是 fail-visible，误判产生脏绑定+假败是 fail-hidden 更糟）；js 生态主流形态是 `.test.`/`.spec.`，连字形态罕见，且执行侧权威口径本就不认它（预填了也进不了执行批）。放弃的方案：a) 在 `collectFrLinkedTests` 读侧直接过滤非测试路径——绑定语义是「FR 覆盖证据」不限测试文件（capability 证据可以是源码/文档），读侧过滤会让合法证据绑定静默失效，改在执行侧拦「当测试跑」这一步；b) node --test 批加 `--experimental-strip-types` 类运行参数迁就 TS 源码——治标且方向反了（源码本就不该进测试执行面，`./config.js` 类 ESM 后缀映射在裸 node 下无解）。
