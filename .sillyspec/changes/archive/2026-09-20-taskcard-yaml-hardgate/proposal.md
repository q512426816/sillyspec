---
author: qinyi
created_at: 2026-09-20 13:56:11
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
2026-09-20 multi-agent-platform 仓变更实证：task 卡 frontmatter 非法 YAML（provides/expects_from 值含未引号方括号+全角括号的 flow 序列）被 sillyspec 三个消费点各自静默吞错，其中 `[plan.cross-task-contract]` 硬门禁空真过门（假阴性）最重——契约防线在坏数据面前等于没有。

## 关键问题
1. **门禁假阴性（P0）**：src/stages/plan-postcheck.js:332 parseTaskContracts catch 返回空 → 契约对账无 consumer 可查 → 空过。实测当时 plan gate pass 是假阴性，契约正确性仅靠事后人工审查兜底。
2. **误导文案**：src/verify-probes.js:1733 parseTaskAcceptance catch 返回 [] → :1943 渲染「卡无 acceptance——防御，plan-postcheck 已拦」——plan 侧存在性检查是宽收正则拦不住这种坏法，防御承诺失实。
3. **口径分裂**：plan 侧宽收正则与 verify 侧 jsYaml 严格解析两套实现无单一源，同一文件两处判读不一致。

## 变更范围
新增共享 frontmatter 解析源（src/taskcard-frontmatter.js）；plan 门禁新增 frontmatter 合法性硬校验（坏卡 ERROR 带 文件:行:列）；parseTaskContracts/parseTaskAcceptance 归一共享源并显式透出解析失败态；探针 7 渲染区分「真无 acceptance」与「frontmatter 非法 YAML」；以 multi-agent-platform 三张坏卡为夹具的测试。

## 不在范围内（显式清单）
- 不修 multi-agent-platform 仓坏卡数据（填写侧债务，坏卡转测试夹具）
- 不改 taskcard.js 生成器序列化（坏值系手填，生成器默认不生成 provides/expects_from）
- 不改 hasAcceptanceCriteria 宽收正则（职责是「在场」非「合法」）
- 不动 execute 阶段 task-review 卡片读取（无实证缺陷）
- 问题 B/C/D/E（--init 刷新、unused 口径、gate 落盘、豁免提示路径）另走 quick

## 成功标准（可验证）
- 三张坏卡夹具：validatePlanFeasibility 返回 ok=false 且 errors 含 文件:行:列（20/22/26，独立审查实测修正）与 js-yaml message（聚合 pass 中契约校验不再空过）
- parseTaskContracts 对坏卡返回 yamlError 非 null（显式降级，非空数组冒充）；契约校验对坏卡不产生假阳性对账错误
- 探针 7 对坏卡渲染「frontmatter 非法 YAML」行、对真无 acceptance 卡保留原防御行
- 合法卡（含无 frontmatter/无契约字段）既有用例全绿零回归
