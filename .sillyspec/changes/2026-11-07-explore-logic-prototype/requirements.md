---
author: flow-machine-draft
created_at: 2026-11-07T12:59:56.828Z
---
# 需求规格（Requirements）— 2026-11-07-explore-logic-prototype

## 功能需求

### FR-01: explore prompt 触发面含「状态机/流程/时序类歧义文字问答装不下」形态

- `sillyspec run explore` 渲染的原型生成节 prompt 中，触发条件必须包含 UI/交互讨论之外的第二触发面：状态机/流程/时序类歧义（文字多轮问答装不下的），agent 在该场景下可以提议出原型。

#### 场景：状态机歧义触发提议

- Given：用户在 explore 话题中提出状态流转对不齐的歧义（文字多轮问答装不下）
- When：agent 渲染 explore prompt 并考虑是否提议原型
- Then：prompt 原型生成节的触发条件覆盖此形态（不只 UI/交互方案），提议动作合法

### FR-02: 逻辑形含三要素（纯逻辑模块/状态面板每步重渲染/领域语言标注）+ 非 JS 项目复刻失真声明 + 不进变更目录（UI 契约件专属）

- prompt 必须含逻辑原型形态要求三要素：内联纯逻辑模块（状态机/流转规则）、状态面板（每步操作后重渲染全量状态）、领域语言标注；非 JS 项目必须声明「JS 复刻模拟器、验证的是复刻件非真码」的翻译失真可能；逻辑形产物禁止进变更目录（`prototype-*.html` 命名是 UI 契约件专属，防误平息 gates UI 视觉证据探针）。

#### 场景：非 JS 项目生成逻辑原型

- Given：目标项目非 JS 生态，用户明确要求对某状态机出原型
- When：agent 生成逻辑形粗选件
- Then：产物含三要素、带复刻失真声明、只落 `{SPEC_ROOT}/explore/`（不复制进变更目录）

### FR-03: 对比判据含结构性分歧要求（布局/信息层级/流转结构）与真实数据密度要求

- prompt 必须含多方案对比判据：各方案须在布局/信息层级（UI 形）或流转结构（逻辑形）上实质性分歧；颜色文案级差异禁止计为对比方案；mock 数据 SHOULD 取真实形状与密度（不在空态页面上做判断）。

#### 场景：多方案对比粗选

- Given：explore 讨论产出 2-3 个 UI 方案并出对比原型
- When：agent 生成对比粗选件
- Then：各方案结构性分歧（非颜色文案微调），mock 数据为真实形状与密度

### FR-04: 粗选件定位不变：手绘合法、不进变更目录、仅用户明确要求触发

- 本次扩展必须保持粗选件既有定位不变：手绘单文件（内联 CSS+JS）在探索期合法、产物不进变更目录与项目源码、仅用户明确要求时生成（agent 只可提议）。

#### 场景：定位回归

- Given：任何 explore 会话
- When：agent 考虑生成原型
- Then：触发面扩了但生成门槛不变——未经用户明确要求不写原型文件，写也只落 explore 目录

### FR-05: brainstorm.js 零改动；docs/prompt 提取与 explore.md 同步一致

- src/stages/brainstorm.js 必须零改动（git diff 不含该文件）；`node docs/prompt/_extract.mjs` 再生 `_extracted.json` 后，docs/prompt/explore.md 的 prompt 正文必须与源码 `definition.steps[].prompt` 逐字一致。

#### 场景：提取一致性

- Given：explore.js prompt 已改
- When：运行提取脚本并比对 explore.md
- Then：explore.md prompt 正文与源码逐字一致，无手改漂移

### FR-06: .claude/skills/sillyspec-explore/SKILL.md 同步（含 description 触发词）

- SKILL.md 的「生成 HTML 原型」段必须同步两形态（UI 形/逻辑形）与扩后的触发面；frontmatter description 必须含逻辑原型触发词（状态机/流程推演类）。

#### 场景：skill 触发词命中

- Given：用户说「推演下这个状态机」类话题
- When：skill 按 description 匹配
- Then：sillyspec-explore 可被匹配命中（不再只覆盖 UI 原型触发词）

### FR-07: explore 相关既有测试面跑绿（change-exists-validation / cli-top-level-aliases / default-no-dir-and-affinity）

- explore 相关既有测试面必须全绿：流程行为零回归（豁免/顶层别名/亲和与重置）。

#### 场景：行为回归

- Given：explore.js prompt 文本已改
- When：跑三个相关测试面
- Then：全绿（prompt 文本扩展不触碰流程行为）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：prompt 文案规范面——逐字断言与文案强耦合无回归价值，验收靠 _extracted.json 与源码一致性比对（FR-05 承接）
FR-02: 不适用：prompt 文案规范面——同上，机械比对承接
FR-03: 不适用：prompt 文案规范面——同上
FR-04: 不适用：定位不变=改动面检查（git diff 仅 explore prompt 段），无行为测试面
FR-05: 不适用：文档一致性由提取脚本机械保证；brainstorm.js 零改动由 git diff 验证
FR-06: 不适用：SKILL.md 为文档规范面，人工验收
FR-07: test/change-exists-validation.test.mjs「explore 阶段豁免变更存在校验」/ test/cli-top-level-aliases.test.mjs「explore 顶层别名转发」/ test/default-no-dir-and-affinity.test.mjs「default 键不物化 + explore 亲和与完成重置」
