---
author: flow-machine-draft
created_at: 2026-09-25T15:41:34.992Z
---
# 提案书（Proposal）— 2026-09-25-quick-channel-retire

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:125a1111df1fed2e21f43e6ba02e92005bb66d3ae454395c648855aecfbd6468:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-quick-channel-retire 留痕重锚 -->
任务原话转写：动机：quick 通道此前降为存量过渡通道（退役中，横幅劝导），用户决策跳过过渡期直接退役——新会话一律拒绝，通道即刻关闭；在途会话仍需可收尾（不拆 --done/--cancel，防全球存量安装的在途会话搁浅）。
改动面：run quick 渲染入口对『新会话』（guard.json 不存在）硬拒 exit 1 并指路 flow start 轻量变更；在途会话（guard 存在）渲染/续跑/--done/--cancel 不变。模板 agents-instruction.md 与仓库 AGENTS.md 去 quick 可选通道表述（规则 6 改已退役墓碑、判规模选道去掉 quick 支路）；package.json 3.30.0→3.31.0 解锁模板传播（74a08e29 惯例）。新启会话的 quick 测试改夹具预置 guard/ql 条目或转拒绝断言；新增拒绝门测试。不触碰并行会话在改文件（src/flow-draft.js、src/run/command.js、src/run/complete-handlers.js、src/run/complete.js）。
成功标准：
- 新 quick 会话被拒：exit 1＋指路 flow start 文案，不落 guard.json、不写 QUICKLOG 条目
- 预置在途会话（guard.json 已存在）可继续渲染步骤并 --done 收尾全通
- 全量 npm test 与 npm run lint 绿
- templates/agents-instruction.md 与 AGENTS.md 不再有 quick 作为可选通道的表述（墓碑/收尾说明除外）
- quicklog commit / scope-audit quick 查询等存量数据工具行为不变
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:199fbe294b052ed0a1d4733eed30ef800017ba52bf37d8b11c1805bc72931f2e:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-quick-channel-retire 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. 新 quick 会话被拒：exit 1＋指路 flow start 文案，不落 guard.json、不写 QUICKLOG 条目
2. 预置在途会话（guard.json 已存在）可继续渲染步骤并 --done 收尾全通
3. 全量 npm test 与 npm run lint 绿
4. templates/agents-instruction.md 与 AGENTS.md 不再有 quick 作为可选通道的表述（墓碑/收尾说明除外）
5. quicklog commit
6. scope-audit quick 查询等存量数据工具行为不变
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:f27638ff452b735bd734622841854fab97f628c60f39e920a19d146c65cf06c8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-quick-channel-retire 留痕重锚 -->
1. 新 quick 会话被拒：exit 1＋指路 flow start 文案，不落 guard.json、不写 QUICKLOG 条目
2. 预置在途会话（guard.json 已存在）可继续渲染步骤并 --done 收尾全通
3. 全量 npm test 与 npm run lint 绿
4. templates/agents-instruction.md 与 AGENTS.md 不再有 quick 作为可选通道的表述（墓碑/收尾说明除外）
5. quicklog commit
6. scope-audit quick 查询等存量数据工具行为不变
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
