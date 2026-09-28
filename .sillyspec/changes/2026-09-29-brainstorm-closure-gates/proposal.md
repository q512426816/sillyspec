---
author: flow-machine-draft
created_at: 2026-09-28T16:25:52.578Z
---
# 提案书（Proposal）— 2026-09-29-brainstorm-closure-gates

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:0f728862a5337b8887d2f36f0a9d3c437a09cdee26c4b6e69860083b16c7d741:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-closure-gates 留痕重锚 -->
任务原话转写：头脑风暴阶段补闭环收口门（会话审查＋子代理核验实证的六个无主开口）：①proposal 成功标准在完整路径零校验（轻量路径 --input 有 exit 2 硬门，重路径反而软）；②requirements 的 D-xxx@vN 决策覆盖仅 prompt 约定（机器校验只盯 design.md）；③「⚠️ 自审存疑」标记无消费者（写了没人收口）；④风险登记表应对策略列无内容校验（风险列了没闭环）；⑤no-placeholder-line 原语在引擎可用但 brainstorm 零规则使用（占位符拦截空白）；⑥design-init 预填的决策追踪「待确认」残留无门禁。判据：开放可以，但每个开口必须能回答「谁、在哪个阶段、以什么证据关掉它」。六个口子全部按此判据补机器收口（warning 级不阻断，先例：故障面/退役判据软警告——观测一个周期后再评估棘轮升级）。

成功标准：
- brainstorm --done 时 proposal.md 缺「成功标准」章节 → warning（scale≠small 生效，small 豁免）
- decisions.md 存在当前版本 D-xxx@vN 且 requirements.md 未引用该 D（裸号词边界匹配）→ warning 逐条点名
- design.md 中「自审存疑：」标记行无闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）→ warning，含闭合 token 不报
- design.md 风险登记表 R-xx 行应对策略列为空或占位词（待填/待补充/TODO/TBD）→ warning，显式「接受：理由」不报
- proposal/requirements/tasks/design 独立成行占位词（默认占位表＋待完善/待设计/待确认）→ warning
- design.md 残留「待确认」→ warning（决策追踪逐行改「已覆盖」后消除）
- 新规则全部经 stage-contract-spec manifest 声明（renderStageContract 事前契约自动覆盖、事前==事后同源），引擎纯 kind 优先（新增 literal-none kind），复杂判定 custom kind 留 validator
- 全量测试通过：新增闭环门测试文件，存量 stage-contract-spec/引擎/相关测试零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d6d6d365bb99d955babea559b3ec7e135ae8d08e4cb018165f6b138e8da2ebe3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-closure-gates 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. brainstorm --done 时 proposal.md 缺「成功标准」章节 → warning（scale≠small 生效，small 豁免）
2. decisions.md 存在当前版本 D-xxx@vN 且 requirements.md 未引用该 D（裸号词边界匹配）→ warning 逐条点名
3. design.md 中「自审存疑：」标记行无闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）→ warning，含闭合 token 不报
4. design.md 风险登记表 R-xx 行应对策略列为空或占位词（待填/待补充/TODO/TBD）→ warning，显式「接受：理由」不报
5. proposal/requirements/tasks/design 独立成行占位词（默认占位表＋待完善/待设计/待确认）→ warning
6. design.md 残留「待确认」→ warning（决策追踪逐行改「已覆盖」后消除）
7. 新规则全部经 stage-contract-spec manifest 声明（renderStageContract 事前契约自动覆盖、事前==事后同源），引擎纯 kind 优先（新增 literal-none kind），复杂判定 custom kind 留 validator
8. 全量测试通过：新增闭环门测试文件，存量 stage-contract-spec/引擎/相关测试零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:add06f623116129324d2985e0a8b552ebe5820421b4bb9b91f4461b54ed7e7fd:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-closure-gates 留痕重锚 -->
1. brainstorm --done 时 proposal.md 缺「成功标准」章节 → warning（scale≠small 生效，small 豁免）
2. decisions.md 存在当前版本 D-xxx@vN 且 requirements.md 未引用该 D（裸号词边界匹配）→ warning 逐条点名
3. design.md 中「自审存疑：」标记行无闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）→ warning，含闭合 token 不报
4. design.md 风险登记表 R-xx 行应对策略列为空或占位词（待填/待补充/TODO/TBD）→ warning，显式「接受：理由」不报
5. proposal/requirements/tasks/design 独立成行占位词（默认占位表＋待完善/待设计/待确认）→ warning
6. design.md 残留「待确认」→ warning（决策追踪逐行改「已覆盖」后消除）
7. 新规则全部经 stage-contract-spec manifest 声明（renderStageContract 事前契约自动覆盖、事前==事后同源），引擎纯 kind 优先（新增 literal-none kind），复杂判定 custom kind 留 validator
8. 全量测试通过：新增闭环门测试文件，存量 stage-contract-spec/引擎/相关测试零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
