---
author: flow-machine-draft
created_at: 2026-10-22T23:49:53.216Z
---
# 提案书（Proposal）— 2026-10-23-turbo-docs-auto

## 动机

任务原话转写：turbo docs-auto 常设授权档

动机与背景：--turbo 极速档目前仅用户逐次显式触发（AGENTS.md 选道表钉死「禁止 agent 自行启用」），纯文档/配置变更每个都付全量仪式（评审定档 86% 因盲维作答必评、UI 探针、hunk 门）。新增 local.yaml 常设授权键 turbo: docs-auto：仓主一次授权，CLI 按提交∪脏面自动判定纯文档面（复用 quick-audit 的 CODE_PATH_SEGMENT_RE/CODE_EXTENSION_RE 单一源分类器，不新增路径枚举），命中即等效 turbo 降档并留一行授权源输出；判定 fail-closed（面空/判定异常/含代码文件一律走全量）。用户已显式授权继续（2026-10-23「继续」）——autopilot 直跑到底，--no-prestage 声明需求已含决策（方案经四子代理分析定案）。

成功标准：
- local.yaml 新键 turbo: docs-auto（readFlowConfig 逐键正则，未配置/坏值 fail-soft 恒 false）：cmdFlowDone 入口在旗标档未开且 tier 非 thick 时判面——changedFilesSinceBaseline（提交∪脏面，dirty_gate_ignore 命中前缀剔除后）非空且无任何文件命中代码分类器 → turbo 等效 true（turboSource=docs-auto），五个消费点（实测门/评审豁免/dirty advisory/UI 探针/hunk 门）读同一变量零改动继承
- 面判定 fail-closed：面空/含代码文件/读取或判定异常一律不降档走全量；降档时输出一行授权源留痕（turbo(docs-auto)＋授权源 local.yaml＋升厚即失效）；实测门合成 skipped 的 reason 文案区分授权源（docs-auto 档不显示「用户显式触发」）
- 旗标档（--turbo）行为逐字不变；未配置键的仓行为零变化（零回归锚）
- 测试：配置+纯文档面→收口完成无评审任务书+授权源行；同面未配置→评审照常定档（任务书 exit）；配置+src 面→不降档评审照常；unit readFlowConfig 键三态

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. local.yaml 新键 turbo: docs-auto（readFlowConfig 逐键正则，未配置/坏值 fail-soft 恒 false）：cmdFlowDone 入口在旗标档未开且 tier 非 thick 时判面——changedFilesSinceBaseline（提交∪脏面，dirty_gate_ignore 命中前缀剔除后）非空且无任何文件命中代码分类器 → turbo 等效 true（turboSource=docs-auto），五个消费点（实测门/评审豁免/dirty advisory/UI 探针/hunk 门）读同一变量零改动继承
2. 面判定 fail-closed：面空/含代码文件/读取或判定异常一律不降档走全量；降档时输出一行授权源留痕（turbo(docs-auto)＋授权源 local.yaml＋升厚即失效）；实测门合成 skipped 的 reason 文案区分授权源（docs-auto 档不显示「用户显式触发」）
3. 旗标档（--turbo）行为逐字不变；未配置键的仓行为零变化（零回归锚）
4. 测试：配置+纯文档面→收口完成无评审任务书+授权源行；同面未配置→评审照常定档（任务书 exit）；配置+src 面→不降档评审照常；unit readFlowConfig 键三态

## 成功标准（可验证）

1. local.yaml 新键 turbo: docs-auto（readFlowConfig 逐键正则，未配置/坏值 fail-soft 恒 false）：cmdFlowDone 入口在旗标档未开且 tier 非 thick 时判面——changedFilesSinceBaseline（提交∪脏面，dirty_gate_ignore 命中前缀剔除后）非空且无任何文件命中代码分类器 → turbo 等效 true（turboSource=docs-auto），五个消费点（实测门/评审豁免/dirty advisory/UI 探针/hunk 门）读同一变量零改动继承
2. 面判定 fail-closed：面空/含代码文件/读取或判定异常一律不降档走全量；降档时输出一行授权源留痕（turbo(docs-auto)＋授权源 local.yaml＋升厚即失效）；实测门合成 skipped 的 reason 文案区分授权源（docs-auto 档不显示「用户显式触发」）
3. 旗标档（--turbo）行为逐字不变；未配置键的仓行为零变化（零回归锚）
4. 测试：配置+纯文档面→收口完成无评审任务书+授权源行；同面未配置→评审照常定档（任务书 exit）；配置+src 面→不降档评审照常；unit readFlowConfig 键三态
