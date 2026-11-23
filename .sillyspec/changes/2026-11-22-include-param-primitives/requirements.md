---
author: flow-machine-draft
created_at: 2026-11-21T23:27:44.739Z
---
# 需求规格（Requirements）— 2026-11-22-include-param-primitives

## 功能需求

### FR-01: resolvePromptIncludes 支持 {{include:name|key=value}} 参数化语法，模板内参数占位被实参替换；无参写法向后兼容，模板缺失仍保留占位符并 warn

- resolvePromptIncludes **必须**支持 `{{include: name|key=value|key2=value2}}` 参数化语法：模板文件内的 `{{param:key}}` 占位被对应实参替换（参数名匹配 `[\w-]+`，实参值允许中文/字母/数字/空格/短横线/斜杠，禁 `|`、`{`、`}`）。
- 无参写法 `{{include: name}}` **必须**向后兼容，渲染结果与现状逐字一致；既有三模板（testcase-design/taskcard-rules/verify-probes）渲染零变化。
- 模板缺失**必须**保留占位符并 console.warn（fail-soft 语义不变）；带参引用但模板内 `{{param:key}}` 无对应实参时**必须**保留该占位原样并 warn。
- 替换**禁止**递归（单次替换语义不变；模板内容中的 `{{include:}}` 不再展开）。

#### 场景：主路径（带参解析）
Given 模板 review-subagent-discipline.md 内含 `{{param:budget}}` 与 `{{param:scope}}` 占位 / When 输入 `{{include: review-subagent-discipline|budget=12|scope=design 审查}}` / Then 两个占位分别被 `12` 与 `design 审查` 替换，无 `{{param:` 残留。

#### 场景：向后兼容
Given 既有无参引用 `{{include: testcase-design}}` / When resolvePromptIncludes 处理 / Then 渲染结果与改动前逐字一致。

#### 场景：缺参与模板缺失
Given 带参引用缺某实参，或模板文件不存在 / When resolvePromptIncludes 处理 / Then 对应占位符原样保留且 console.warn 各自提示，不抛错。

### FR-02: 高 2「前台同步执行禁后台」与高 5「评审豁免声明」抽为 templates/prompts/ 模板，原 6 处引用位改 include 引用，渲染文本语义不变

- 高 2 逐字段（execute.js「铁律」节与 verify.js「长测试/构建执行铁律」节各一行）**必须**抽为模板 `templates/prompts/foreground-sync.md`，两处引用位改 `{{include: foreground-sync}}`；渲染后**必须**保留四禁令语义（run_in_background:true / & / nohup / disown 禁令与「后台任务易被会话生命周期回收」理由句逐字保留）。
- 高 5 评审豁免块（brainstorm.js、plan.js、execute.js 三处独立 `> 🚪` 引用块，近逐字）**必须**抽为模板 `templates/prompts/review-unsupervised-exempt.md`，三处改 include 引用；渲染后**必须**保留豁免机制语义（无嵌套派发能力→写 review-unsupervised.md 声明、不自审表演、门见声明放行留痕）。
- execute.js dispatchExec 段中「按上方评审豁免处理」的指针句为引用提及非豁免块本体，**保留原文不动**（最小扰动）。
- 尾注差异（Task Review 层已退役的注记详略）统一为模板单一文案，**必须**含「Task Review 层已退役」语义。

#### 场景：直抽后渲染对照
Given 抽取前三阶段渲染文本快照 / When 引用位改 include 后重新渲染 / Then 高 2/5 对应纪律句逐字在场（含禁令枚举与产物路径 review-unsupervised.md），无占位符残留。

### FR-03: 高 4「审查子代理纪律包」与高 9「材料包基准面四句」以参数化模板抽取，budget/pack 等侧重差异以参数传入

- 高 4（brainstorm 展开版 / plan、execute 浓缩版的共性纪律：时间盒收敛、写通道降级、审查经济学三律、只读纪律）**必须**抽为参数化模板 `templates/prompts/review-subagent-discipline.md`，`budget`（12/10/15）与 `scope`（design 审查/plan 审查/QA 对照 diff）以参数传入；渲染后各阶段预算数字与审查侧重描述**必须**与原文一致。
- 阶段特有差异段（plan/execute 的「既往结论勿重验」、execute 的「gate 重试修复」）按最小扰动原则：共性主体入模板，特有段保留 stage 原文紧邻 include 引用位——**必须**保证三阶段渲染语义不减损。
- 高 9（材料包基准面共性句：checklist 只对包作答/包外定向列明禁全量扫读/不足→cannot_verify 列缺件）**必须**抽为参数化模板 `templates/prompts/material-pack-baseline.md`，`pack`（grill-first/plan-review/execute-qa）以参数传入；三处引用位（brainstorm「输入材料」、plan「prompt 要点」、execute「操作」）改带参 include。

#### 场景：参数化渲染对照
Given 三阶段抽取前渲染文本 / When 改带参 include 后渲染 / Then 各阶段 budget 数字（12/10/15）、pack 名、特有段（既往勿重验/gate 重试修复）语义句均在场，无 `{{param:` 残留。

### FR-04: docs/prompt/ 金档经 _extract.mjs 再生与改动一致；include 计数测试核对更新跑绿；知识注入段仍禁 include

- `node docs/prompt/_extract.mjs` 再生的 docs/prompt/_extracted.json 与各 stage md **必须**与本次 stages 改动一致（prompt 正文以 _extracted.json 为准）。
- 既有 include 计数测试（execute-testcase-design-include / plan-taskcard-include / quick-testcase-design-include 等）**必须**核对并跑绿：新增模板名不破坏按名计数断言；若既有断言计数受引用位改写影响，同步更新断言并在测试注释留痕。
- 知识注入段禁 include 约束**必须**维持（knowledge-inject.test.mjs 相关断言不放松）。
- docs/prompt/README.md 若记载 include 语法，**SHOULD** 同步补充参数化语法说明。

#### 场景：金档与禁令一致
Given stages 引用位改写完成 / When 跑 _extract.mjs 再生并跑既有 include 计数测试 / Then 金档反映新引用形态且全部测试绿，knowledge-inject 禁令断言原样通过。

### FR-05: 新增单测覆盖参数化解析/渲染/缺参行为并跑绿

- 新增 `test/prompt-include-params.test.mjs` **必须**覆盖：带参解析（单参/多参/中文值）、无参向后兼容（既有模板逐字一致）、缺参保留+warn、模板缺失保留占位符+warn、值字符集边界（禁 |、{、}）、新模板存在性与三阶段渲染落位（高 2/5/4/9 关键语义句在对应渲染函数输出中场）。

#### 场景：单测全绿
Given 全部新用例 / When 运行测试 / Then 全部通过，exit 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/prompt-include-params.test.mjs「带参解析/无参向后兼容/缺参与模板缺失/值字符集」
FR-02: test/prompt-include-params.test.mjs「高 2/5 模板存在与渲染语义句在场」
FR-03: test/prompt-include-params.test.mjs「高 4/9 带参渲染：budget/pack 落位与特有段在场」
FR-04: test/execute-testcase-design-include.test.mjs「既有按名计数不回归」+ test/knowledge-inject.test.mjs「知识注入段禁 include 维持」+ docs/prompt/_extract.mjs 再生金档（命令面验收）
FR-05: test/prompt-include-params.test.mjs「全量用例跑绿 exit 0」
