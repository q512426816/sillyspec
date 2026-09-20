---
author: qinyi
created_at: 2026-09-20 22:35:00 +08:00
plan_level: light
---

# 轻量计划（Light Plan）：task 卡 frontmatter 非法 YAML 硬门禁与单一解析源

> plan_level=light 理由：9 文件中 5 个为测试夹具/测试文件，实现面仅 3 个 src 文件（1 新模块 + 2 处局部改造）、单仓、4 task、无 schema/状态机/跨技术层——规模信号偏大来自夹具数量而非复杂度。

## 来源
brainstorm 定稿（design.md 13 节 + D-001@v1/@v2，独立审查双 pass）：multi-agent-platform 仓 2026-09-20-scope-audit-cross-repo-platform 变更实证三消费点静默吞坏 YAML——契约门禁空真过门（P0）/ 探针 7 假防御文案 / plan 与 verify 两套解析口径分裂。

## Wave 划分

### Wave 1（共享解析源）
- task-01

### Wave 2（双侧消费，无共享文件可并行）
- task-02
- task-03

### Wave 3（测试收口）
- task-04

## 范围
- NEW:src/taskcard-frontmatter.js——单一 frontmatter 解析源（splitFrontmatter + parseTaskFrontmatter，js-yaml mark 换算文件 1 基行:列，CRLF 容错，除 js-yaml 零依赖）
- src/stages/plan-postcheck.js——parseTaskContracts 归一共享源 + yamlError 显式降级键；validatePlanFeasibility 步骤 0b 硬校验（紧随 :1298 重复键检测，双报豁免：duplicated mapping key 且 dupKeys 非空时跳过）
- src/verify-probes.js——parseTaskAcceptance 三态契约（no-frontmatter/invalid-yaml/ok）；探针 7 构建（:2141）与 renderProbe7Lines（:1942）按 fmError 区分渲染
- NEW:test/fixtures/taskcard-bad-yaml/task-01.md、NEW:test/fixtures/taskcard-bad-yaml/task-02.md、NEW:test/fixtures/taskcard-bad-yaml/task-03.md——multi-agent-platform 三张原卡整卡拷贝（坏行 20/22/26；TaskCard target_files 按此三条显式路径落卡，不使用 | 合写）
- NEW:test/taskcard-frontmatter-hardgate.test.mjs + 修改 test/acceptance-matrix-probe.test.mjs（契约迁移）+ test/cross-task-contracts.test.mjs（邻接用例）

## 验收
- AC-01：三张坏卡夹具经 parseTaskFrontmatter 返回 !ok 且 error.line === 20/22/26、column 与 js-yaml mark+1 一致，message 含 `missed comma between flow collection entries`
- AC-02：validatePlanFeasibility 对坏卡 changeDir 返回 ok=false，errors 含「frontmatter 非法 YAML」+ 文件:行:列；好卡零新增错误
- AC-03：parseTaskContracts 对坏卡返回 provides=[]、expectsFrom={} 且 yamlError 非 null；对合法卡返回契约内容且 yamlError 为 null
- AC-04：validateCrossTaskContracts 对坏卡不产生假阳性契约错误（纯契约语义，D-001@v2）
- AC-05：parseTaskAcceptance 三态：坏卡 → {status:'invalid-yaml', acceptance:[]}；无 frontmatter → status:'no-frontmatter'；合法 → status:'ok' + 归一数组
- AC-06：renderProbe7Lines 对挂 fmError 的卡输出「frontmatter 非法 YAML」行、不输出「卡无 acceptance——防御」行；真无 acceptance 合法卡保留防御行
- AC-07：重复键卡（dupKeys 非空 + duplicated mapping key）0b 跳过不双报，:1298 原文案独占
- AC-08：test/cross-task-contracts.test.mjs 与 test/acceptance-matrix-probe.test.mjs 迁移后全绿；相关测试面（plan-postcheck/verify-probes 邻接）全绿零回归

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-02, task-03 | AC-01/03/05/06（共享源+归一与 yamlError+三态契约+文案区分） |
| D-001@v2 | task-02 | AC-02/04/07（feasibility 0b 落点+双报豁免+纯契约语义） |
