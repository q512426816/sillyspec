---
author: qinyi
created_at: 2026-09-20 22:10:00 +08:00
---

# Decisions — 2026-09-20-taskcard-yaml-hardgate

## D-001@v1: 坏 YAML 修法采用「共享 frontmatter 解析源 + plan 门硬校验 + 契约门禁不空过 + 探针 7 文案区分」（方案 A）

- type: architecture
- status: confirmed
- source: user
- date: 2026-09-20
- question: task 卡 frontmatter 非法 YAML 被静默吞（三消费点各吞各的：契约硬门禁空真过门 / 探针 7 假防御文案 / plan 与 verify 两套解析口径分裂）——修硬拦还是修文案还是修生成器？
- answer: 方案 A（用户在 2026-09-20 调查报告问题 A 修法中拍板，会话「继续」确认）：①新增 `src/taskcard-frontmatter.js` 单一解析源（frontmatter 提取 + jsYaml.load，js-yaml mark 换算文件行:列，零依赖防环——plan-postcheck 与 worktree-apply 有既有依赖边，共享逻辑放新模块两侧 import）；②plan 门禁新增硬校验：task 卡 frontmatter 非法 YAML 即 ERROR（报错带 文件:行:列 + js-yaml 原始信息），落点 validateCrossTaskContracts 预检——契约/验收字段不可读时对账无从谈起；③`[plan.cross-task-contract]` 遇解析失败不许空过：parseTaskContracts catch 不再用空数组冒充「无契约字段」；④探针 7 防御行区分「真无 acceptance」与「frontmatter 非法 YAML」（parseTaskAcceptance 透出解析失败态）。
- normalized_requirement: 同一 frontmatter 只有一套提取+解析实现；坏 YAML 在 plan 门被硬拦（fail-closed，带行:列定位）；契约门禁零假阴性（解析失败=ERROR 而非空过）；verify 探针对坏 YAML 的文案如实陈述不冒充缺失；好卡（合法 YAML）行为零回归。
- impacts: src/taskcard-frontmatter.js（新增）、src/stages/plan-postcheck.js（parseTaskContracts/validateCrossTaskContracts）、src/verify-probes.js（parseTaskAcceptance/探针 7 构建+渲染）、test/（新增夹具与用例）。
- evidence: 用户 2026-09-20 21:43 调查报告问题 A（P0）修法三条 + 复现素材（multi-agent-platform 仓 task-01:20 / task-02:22 / task-03:26 三处 `rows[]（…）` 未引号方括号+全角括号进 flow 序列，jsYaml 抛 `missed comma between flow collection entries`）；brainstorm Step 4 方案轮。
- 锚点: src/stages/plan-postcheck.js:327（parseTaskContracts）、src/verify-probes.js:1722（parseTaskAcceptance）
- 模块域: stages
- priority: P0
- 故障面: 硬拦后存量手写坏卡变更会在 plan 门被阻（预期行为——先修卡再过门）；js-yaml mark 行号是 YAML 文本内 0 基，换算文件行号须 +2（首行 `---` + 次行起为 YAML），换算错误会误导定位。
- 退役判据: taskcard 生成器全面接管 provides/expects_from 序列化（yamlScalar 同款转义）且手写卡绝迹时，硬校验可降为 warning。

## D-001@v2: 硬校验落点重定位——validatePlanFeasibility 入口（步骤 0b），非契约门禁预检

- type: architecture
- status: confirmed
- source: code
- date: 2026-09-20
- question: frontmatter 合法性硬校验放 validateCrossTaskContracts 预检（v1 落点）还是 validatePlanFeasibility 入口？
- answer: 移至 validatePlanFeasibility 步骤 0b（紧随 :1298 重复键检测）。理由：①D-004@v1 先例——重复键（js-yaml 4 对重复映射键 throw）与非法 YAML 同为 jsYaml 抛错类，当时终裁「只能在 feasibility 入口单点拦截」，四处下游 catch 静默降级保留；②runPlanPostcheck 聚合器 1b 可行性先于 1c 契约校验同 pass 运行（src/stages/plan-postcheck.js:1741-1760），入口拦截即 plan 门全链路覆盖，「契约门禁空过」在聚合路径上不可能发生；③knowledge conventions「双维度报同一漂移信号时后加维度须豁免」——契约门禁再报 YAML 错=同一信号双维度重复刷屏。validateCrossTaskContracts 保持纯契约对账语义；parseTaskContracts 的 yamlError 键（显式降级注记）供独立消费方判读，jsdoc 注明 YAML 合法性归 feasibility。
- normalized_requirement: 坏 YAML 卡在 plan 门被 feasibility 单点拦截（带 文件:行:列）；契约校验对坏卡不产生假阳性对账错误；同一坏信号不双维度重复上报。
- impacts: src/stages/plan-postcheck.js（validatePlanFeasibility :1247 增步骤 0b；validateCrossTaskContracts 不加预检）。
- evidence: brainstorm Step 7 Design Grill 交叉审查——消费点审计发现 plan-postcheck 内 jsYaml.load 共 4 处 catch（:179/:332/:848/:1378，:224 注释自认）+ feasibility :1377 对非法 YAML 已知悉但仅跳过 best-effort；:1294-1300 重复键单点拦截先例。
- 锚点: src/stages/plan-postcheck.js:1298（detectDuplicateTopKeys 调用点，0b 紧随其后）
- 模块域: stages
- priority: P0
- supersedes: D-001@v1 的「落点 validateCrossTaskContracts 预检」条目；v1 其余内容（共享解析源/三态契约/探针 7 文案区分/additive 键）不变。

