---
author: flow-machine-draft
created_at: 2026-09-27T12:57:41.421Z
---
# 提案书（Proposal）— 2026-09-27-pushgate-green-repair

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:71e1e4ea492741dad97ff91728c1d76cd5eee466529ffb6103681fd59e2a5527:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-green-repair 留痕重锚 -->
任务原话转写：推送门全量红的既有面修复：a) renderExample 缺 ui_visual_gate/hunk_gate 两个 live 键的示例 token（config-schema.test 防漂耦合红 2 例，9e4572e9 登记门键时未同步 example）；b) docs/sillyspec/platform-interface-map.md 17 处 shared.js/index.js 行号锚漂移（5 处 index.js 为既有漂移，12 处 shared.js 由本日批量收口提交 a034202e 的代码插入行推移造成）。成功标准：
- test/config-schema.test.mjs 全绿（example 含全部 live 键首段+末段 token）
- test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）
- 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:88aadf6816c1e52e461a02ddd8e7608e58259562a0e209f42859119201d9f363:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-green-repair 留痕重锚 -->
按成功标准机械推导，共 2 条验收面：
1. test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）
2. 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:f166506418182e462d47ec8e53553acc6919a6247aeac57c177a686a4d2b195f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-green-repair 留痕重锚 -->
1. test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）
2. 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
