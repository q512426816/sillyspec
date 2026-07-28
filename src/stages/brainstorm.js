export const definition = {
  name: 'brainstorm',
  title: '头脑风暴',
  description: '探索需求、分析技术方案、识别风险',
  steps: [
    {
      name: '进度确认',
      // 重命名自「状态检查」（③ status 消歧）：老进度里的「状态检查」completed 由迁移逻辑承接，防 currentIdx 回跳
      migratedFrom: ['状态检查'],
      prompt: `检查当前变更的进度状态（sillyspec.db）。用 \`sillyspec progress show\` 查流程进度，不要用 \`sillyspec status\`（项目级快照，不推进流程）。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 "brainstorm"
3. 如果有进行中的 brainstorm，提示选择继续或重新开始
4. 如果未初始化，提示先运行 sillyspec init
5. **检查变更名称是否有意义**：如果当前变更名是自动生成的（如 \`2026-06-02-new-change-a3f2b7c1\`），询问用户确认实际变更名，然后运行 \`sillyspec change-rename <旧名> <新名>\` 重命名

### 输出
当前状态摘要（1-2 句话）

### 注意
- 以 CLI 返回为准，不要自行推断阶段
- 如果阶段不对，输出正确提示并停止
- **不要用 mv 命令重命名变更目录**，必须使用 \`sillyspec change-rename\`，否则 DB 和目录会脱节`,
      outputHint: '状态摘要',
      optional: false
    },
    {
      name: '加载项目上下文',
      prompt: `加载项目现有上下文，理解代码结构和约定；并做一次早期规模筛查，判断小变更是否该直接走 quick。

### 操作
1. 读取项目总览 \`{SPEC_ROOT}/docs/<project>/scan/PROJECT.md\` + 共享规范 + 子项目上下文
2. 加载项目信息：\`cat {SPEC_ROOT}/projects/*.yaml 2>/dev/null\`
3. 加载本地配置：\`cat {SPEC_ROOT}/local.yaml 2>/dev/null\`
4. 棕地项目：读取 {SPEC_ROOT}/docs/<project>/scan/ 下的 STRUCTURE.md、CONVENTIONS.md、ARCHITECTURE.md
5. **加载模块索引**：读取 \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`（如存在）
   - 这一步是高频操作，_module-map.yaml 回答"哪个文件属于哪个模块、模块之间怎么依赖"
   - 用 tags/aliases 字段做需求关键词→模块的粗匹配
   - 用 entrypoints 字段快速了解模块对外能力
6. 查看进行中的变更：\`ls {SPEC_ROOT}/changes/ | grep -v archive\`
   - 有相关同名变更 → 提示用户，避免重复
7. 检查全局模板：\`ls ~/.sillyspec/templates/\`
   - 有匹配模板 → 询问是否基于模板
   - 无相关内容 → 跳过，不输出

### 模块匹配方法
读取 _module-map.yaml 后，根据用户描述的需求关键词，匹配相关模块：
- 需求中提到"登录""认证""token" → 匹配 tags/aliases 中含这些词的模块
- 需求中提到特定文件路径 → 匹配 paths 字段
- 匹配结果用于后续 design.md 的文件变更清单

### 子项目判定
- 单项目：直接确认，不需要等待
- 多项目且用户已指定：直接确认，不需要等待
- 多项目且用户未指定：列出项目列表，需要用户确认本次需求属于哪个子项目

### 早期规模筛查（判断是否该走 quick）
加载上下文后，用需求描述 + 模块上下文**粗判**本次变更规模：
- **明显 small**（满足：预计改动 ≤ 2 个文件、单模块、无 schema/API/状态机/权限变更；或属于改文案/修 bug/样式调整/配置微调等纯执行类）→ 输出：「此变更规模较小，建议直接走 quick 流程」+ 一句依据，给出建议命令 \`sillyspec run quick "<需求>"\`。用户同意则本阶段可在此收尾（\`--done\` 并提示转 quick），不必继续走完整设计流程。
- **拿不准或明显 large**（涉及多模块、schema、状态流转、新架构等）→ 不要提示 quick，继续进入下一步「对话式探索与需求澄清」。
- 这是**粗判**，只为让明显的小变更免走完整设计流程；不确定就继续，后续「用户确认并生成规范文件」步骤会基于 design.md 文件清单做精判兜底。

### 输出
项目现状理解摘要（3-5 句话，关键约定和架构决策）+ 可能涉及的模块列表 + 本次需求所属子项目 + （如命中）quick 建议

### 注意
- 棕地项目必须读取数据模型章节
- 模块匹配只是粗筛，后续步骤会细化`,
      outputHint: '上下文摘要',
      optional: false
    },
    {
      name: '对话式探索与需求澄清',
      migratedFrom: ['协作与复用检查', '原型/设计图分析', '需求范围评估', '对话式探索', '需求澄清 Grill'],
      conditionalWait: true,
      repeatableWait: true,
      maxWaitRounds: 8,
      waitReason: '等待用户回答需求问题或澄清',
      waitOptions: ['回答见--answer', '信息够了，进入方案讨论'],
      prompt: `通过对话探索需求细节、分析原型（如有）、判断拆分/批量、并对歧义点做需求澄清 Grill。本步骤合并了原有的对话探索、原型分析、需求范围评估、需求澄清 Grill 四个环节——按下方 A→D 顺序按需执行，能一次问清的不要拆成多轮。

### A. 原型/设计图分析（如用户提供）
如果用户提供了截图、图片或 HTML 原型，先分析提取：
1. 识别图片中的页面结构（区域、组件、布局）
2. 提取表单字段（名称、类型、必填、选项）
3. 提取交互流程（页面跳转、按钮行为）
4. 提取标注和备注（业务规则、权限说明）
5. 展示分析结果，请用户确认遗漏
- 没有原型则跳过本节
- 图片信息 > 文字描述，不要忽略视觉信息

### B. 对话式探索
1. 从最核心的一个问题开始（用户到底想要什么？）
2. **提出问题后必须暂停等待用户回答**，不要替用户回答
3. 根据用户回答判断：信息够了 → 进入 C/D 或正常完成 / 需要追问 → 暂停等待下一个回答
4. 探索顺序（按需）：目的 → 约束 → 边界 → 成功标准
5. 多选题优于开放式问题
6. YAGNI — 砍掉不需要的功能

### C. 需求范围评估（拆分/批量判断）
1. 根据分析结果判断复杂度。满足以下任意 2 条建议拆分：
   - 3+ 个可独立交付的功能模块
   - 3+ 种角色有不同权限和视图
   - 跨页面状态流转（审批流、多步表单）
   - 模块间耦合度低可独立开发
2. 满足以下条件建议走**批量模式**：
   - 任务数量 > 10 且任务间有重复模式（如 100 个报表、50 个表单、N 个相似页面）
   - 本质是「模板 × 数据」而非 N 个独立功能
   - 直接逐个开发会导致 plan.md 膨胀和上下文溢出
3. 需要拆分 → 生成 MASTER.md，规划子阶段
4. 检测到批量模式 → 输出提示并建议用户确认
5. 都不需要 → 继续（简单 CRUD 不拆）

**批量模式指引**（确认后，后续 plan/execute 按此调整）：
- **不要**把每个实例列为独立任务（不要写 100 个 checkbox）
- plan 设计通用架构（引擎/模板/配置格式），任务数控制在 10 个以内
- 数据转换用脚本完成（Excel → 配置文件），不消耗 AI 上下文
- execute 每个 Wave 独立模块，Wave 间通过接口定义解耦
- verify 用脚本全量验证 + AI 抽查边界案例

**半批量场景**（大部分相似但有少量特殊任务）：
- **主簇**（>10 个相似）→ 走批量模式（引擎 + 配置）
- **小簇**（2-5 个相似）→ 走简化版批量（基于主簇模板扩展）
- **孤立任务**（1 个）→ 走标准开发流程
- 建议用「继承 + override」配置解决特殊任务，配置解决不了的才写定制代码
- 架构设计时预留扩展点（hooks/overrides）

### D. 需求澄清 Grill（对仍未稳定的歧义点）
汇总 B/C 后仍未稳定的歧义点，按类型列出：
- 术语歧义：同一个词可能指向不同实体/角色/状态
- 边界歧义：哪些场景做、哪些不做、失败怎么处理
- 前提风险：这个需求是否不该存在，是否已有更简单的现有方案
- 代码冲突：用户描述与现有代码/scan/module 文档不一致

**能通过代码或文档确认的不要问用户，先读取**：
- \`{SPEC_ROOT}/docs/<project>/scan/ARCHITECTURE.md\`
- \`{SPEC_ROOT}/docs/<project>/scan/CONVENTIONS.md\`
- \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`
- 相关源码文件

**给每个未解决歧义分级**：
- P0：影响数据模型、权限边界、状态机/工作流、兼容策略、不可逆架构取舍、跨模块所有权
- P1：影响用户场景、验收标准、错误处理、默认值
- P2：文案、展示细节、低风险交互偏好

**执行规则**：
- P1/P2 歧义 0-2 个且无 P0：不进入 Grill 追问，在后续设计中内联处理并记录依据
- P1/P2 歧义 >= 3 个：按优先级逐个澄清
- 任意 P0 歧义：必须澄清；如果需要用户判断，暂停问一个问题
- 不要问用户"要不要 Grill"。由你根据歧义风险决定；只在需要业务判断/取舍时等待用户回答

**追问策略**（进入澄清时）：
1. **一次只问一个问题**：按 P0 → P1 → P2 顺序，深度优先处理最关键歧义
2. **能查代码就不问**：问题可由源码、scan 文档、模块文档回答时，先查证并给出结论
3. **术语碰撞立即指出**：用户用词与 glossary/代码实体/模块文档冲突时，当场说明冲突并要求选择 canonical term
4. **模糊词精化**：把"账户/任务/状态/会话/执行"这类多义词拆成明确实体或状态
5. **场景压力测试**：用具体 case 逼出边界（失败重试、部分成功、历史数据、权限不足、并发修改、兼容旧配置）
6. **前提挑战优先**：如果现有设计或代码已有简单路径，先说明"可能不该新增"

**决策记录草稿**：每解决一个有实现影响的问题，生成一个稳定 ID 的记录草稿（不要把闲聊都记录进去）：

\`\`\`markdown
## D-001@v1: <短标题>
- type: term | boundary | premise | architecture | compatibility | risk
- status: accepted | rejected | superseded
- source: user | code | docs
- question: <被解决的问题>
- answer: <用户确认或代码查证结果>
- normalized_requirement: <可测试的约束>
- impacts: [FR-?, task-?, verify-?]
- evidence: <文件路径/代码位置/用户回答轮次>
\`\`\`

### 铁律 — 不要自问自答 / 等待用户
- 这是人机协作步骤：提出问题后必须暂停等用户回答，**不要在输出里模拟用户回答然后说"需求已明确"**（命令由 CLI 在下方注入）
- 需要拆分或批量模式时：列出方案并暂停等用户确认
- 不需要追问、无歧义、需求已清晰时：可正常完成本步骤（不必强行 --wait）
- 2-3 轮问答即进入方案讨论；达到 maxWaitRounds=8 后必须总结已确认内容与剩余风险，不要无限追问

### 输出
需求理解摘要（用户确认的需求点列表）+ 拆分/批量结论（如适用）+ D-xxx@vN 决策记录草稿 + 剩余风险（如有）

### 注意
- 第一次进入此步骤时，按 A→D 顺序处理；有原型先分析，再探索，再判规模，再澄清
- 用户通过 \`--continue --answer "回答"\` 回答后，本步骤会再次执行，此时检查是否需要追问或可以结束`,
      outputHint: '需求理解与决策记录草稿',
      optional: false
    },
    {
      name: '提出 2-3 种方案',
      requiresWait: true,
      waitReason: '等待用户选择方案',
      waitOptions: ['方案A', '方案B', '方案C'],
      prompt: `基于需求理解和澄清结果，提出 2-3 种实现方案。

### 操作
1. 每种方案列出：核心思路、优势、劣势
2. 如果上一步产生了 D-xxx@vN 决策记录，方案必须说明覆盖/违反哪些当前版本决策
3. 给出推荐方案和理由

### 铁律 — 必须等待用户选择方案
- 列出方案对比表和推荐后必须暂停等用户选择，**不要自己说"推荐方案 A"然后当用户选了**（命令由 CLI 在下方注入）

### 输出
方案对比表 + 推荐方案

### 注意
- 方案差异要实质性的，不要为了凑数
- 推荐理由要具体`,
      outputHint: '方案对比和推荐',
      optional: false
    },
    {
      name: '分段展示设计',
      migratedFrom: ['HTML 原型生成'],
      requiresWait: true,
      waitReason: '等待用户确认设计方案',
      waitOptions: ['确认', '需要修改', '推翻重来'],
      prompt: `展示完整设计方案供用户确认；如适合可视化，顺带生成 HTML 原型。

### 操作
1. 简单项目：几句话整体描述
2. 复杂项目：按模块/Phase 分段展示，每段 200-300 字
3. 展示完整设计方案（不要逐段停顿，一次性展示）
4. 确认变更名（格式：\`YYYY-MM-DD-<简短描述>\`，例如 \`2026-05-13-user-auth\`）
5. 暂停等待用户确认或修改意见

### HTML 原型生成（适合可视化时）
判断本次设计是否适合生成 HTML 原型：
- 适合：有 UI 组件/布局/交互流程/状态转换/架构图
- 不适合：纯后端逻辑/配置修改/无可视化意义
如果适合，生成一个独立的 HTML 文件（内联 CSS + JS），保存到：
\`{SPEC_ROOT}/changes/<change-name>/prototype-<名称>.html\`
- 单文件，浏览器直接打开
- 展示关键布局结构和交互流程
- 不需要完整功能，重点是让用户确认设计方向
- 使用 ASCII/流程图/线框图风格，不需要精美 UI
展示给用户确认设计方向。不适合则跳过。

### 铁律 — 必须等待用户确认设计
- 展示完整设计方案后必须暂停等用户确认，**不要自己说"设计已充分确认"然后推进**（命令由 CLI 在下方注入）

### 输出
完整设计方案 + 变更名（+ 原型文件路径，如生成）

### 注意
- 不要一次输出大段文字，按模块/Phase 分段
- 变更名必须以当天日期开头（YYYY-MM-DD-），后跟英文短横线分隔的简短描述`,
      outputHint: '用户确认的设计方案',
      optional: false
    },
    {
      name: '写设计文档并自审',
      prompt: `撰写 design 文档并进行 AI 自审。

### 文件标题规则（sillyhub 平台解析识别用）
design.md 第一行标题必须用中文：# 设计文档（Design）— <变更简述>

### design.md 必须包含的章节
1. **背景**：为什么做、解决什么问题
2. **设计目标**：要达成什么
3. **非目标**：明确不做的事（防止 scope creep）
4. **拆分判断**（如适用）：为什么这样组织变更、为什么不走批量模式
5. **总体方案**：技术方案（分 Phase/Wave）
6. **文件变更清单**（必填）：

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/xxx/NewFile.java | ... |
| 修改 | src/xxx/ExistingFile.java | 新增 xx 方法 |
| 删除 | src/xxx/OldFile.java | 已被 xx 替代 |

7. **接口定义**：方法签名、数据结构（代码类任务必填）
7.5. **生命周期契约表**（涉及以下关键词时必填，否则可省略）：

   如果本次变更涉及以下任何关键词：
   session / lease / agent_run / daemon / lifecycle / state transition / complete / end / claim / heartbeat

   则必须在 design.md 中包含「生命周期契约表」章节，格式如下：

   | 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
   |---|---|---|---|---|
   | claim lease | daemon | backend | leaseId, claimToken, agentRunId | pending → running |
   | create session | backend | daemon | sessionId, leaseId, claimToken | session active |
   | submit message | daemon | backend | leaseId, claimToken, agentRunId | append messages |
   | turn result | daemon | backend | runId, status, output | running → completed/failed |
   | session end | daemon | backend | sessionId, reason | active → ended |

   判断规则：
   - design.md 或需求中出现上述关键词 → 必须生成此表
   - 表中的每个事件 → 必须有对应代码任务、接口任务、测试任务
   - 表中的必需字段 → 必须出现在相关 DTO/interface 定义中
   - 缺少任一事件 → 在 design.md 风险登记中明确记录

   **判定方法**：在自审阶段，如果检测到上述关键词但 design.md 中没有此表 → 自审不通过
8. **数据模型**（如涉及）：表结构/字段变更
9. **兼容策略**（brownfield 必填）：
   - 未配置新功能时行为不变
   - 新旧逻辑的回退路径
   - 不改变的 API / 表结构
10. **风险登记**：

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | ... | P0/P1/P2 | ... |

11. **决策追踪**（如存在 Grill/重大决策）：
   - 列出当前版本 D-xxx@vN 决策 ID
   - 说明每个 D-xxx@vN 被哪些 FR-xxx / 设计章节覆盖
   - 标注仍未解决的 D-xxx@vN 或剩余风险
12. **自审**（AI 对自身设计的校验）

### 操作
1. 确认变更目录存在：\`mkdir -p {SPEC_ROOT}/changes/<change-name>\`（Windows 用 \`mkdir {SPEC_ROOT}/changes\\<变更名>\` 或 PowerShell \`New-Item -ItemType Directory -Force -Path {SPEC_ROOT}/changes/<change-name>\`）
   - 变更名格式必须为 \`YYYY-MM-DD-<简短描述>\`（如 \`2026-05-13-user-auth\`）
2. 将确认的设计写入 \`{SPEC_ROOT}/changes/<change-name>/design.md\`
3. 如果对话探索或方案讨论产生了实现相关决策，写入 \`{SPEC_ROOT}/changes/<change-name>/decisions.md\`：
   - decisions.md 是本次变更的决策台账，不是长期术语表
   - 只记录有实现/验收影响的决策，闲聊和低风险偏好不记录
   - 每条记录必须有稳定版本 ID：D-001@v1、D-002@v1 ...
   - 若后续 Design Grill 修正该决策，新记录使用 D-001@v2，并写明 supersedes: D-001@v1
   - 每条记录必须包含：type、status、source、question、answer、normalized_requirement、impacts、evidence、priority
   - 长期术语只在 archive/scan 时再提升到 \`{SPEC_ROOT}/docs/<project>/glossary.md\`
4. 格式自检（只查章节齐全；语义一致性/可行性/YAGNI 不在本步查，交给下一步 Design Grill 独立审查）：
   - design.md 含全部必填章节（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
   - 如存在 decisions.md，design.md 是否引用所有当前版本 D-xxx@vN
   - 涉及 session/lease/agent_run/daemon/lifecycle 等关键词时，是否含「生命周期契约表」
5. 缺章节 → 补齐后重检；章节齐全 → 进入下一步（Design Grill 做语义层交叉审查）

### 输出
design.md 文件路径 + 自审结果

### 注意
- 自审不通过不要进入下一步
- 不确定的问题标注「⚠️ 自审存疑」`,
      outputHint: 'design.md 文件路径 + 自审结果',
      optional: false
    },
    {
      name: 'Design Grill 交叉审查',
      conditionalWait: true,
      waitReason: '等待用户处理 Design Grill 发现的结构性问题',
      waitOptions: ['按推荐修正', '补充回答', '显式跳过'],
      prompt: `默认执行 Design Grill，对已经写出的 design.md 做交叉审查。

### 定位
这是设计完成后的质量门，不是需求探索。目标不是继续发散，而是找出 design.md 内部、四件套之间、文档与外部约束之间的结构性矛盾。

### 审查执行方式（CLI 按变更规模判定，占位符由 run.js 注入）
tier: {REVIEW_TIER}（{REVIEW_TIER_REASON}）
- tier=self：当前 agent 直接执行下方交叉审查（小变更）
- tier=independent：必须用 Agent tool 启动一个独立的设计审查子代理（独立上下文，不共享你的分析与倾向），子代理按下方"交叉审查模型"审查 design.md 并输出 review.json。review.json 产物契约（CLI Stage Review Gate 将硬校验，schema + 完整示例 + docHash 算法如下，照抄改值）:
{REVIEW_JSON_CONTRACT}
  子代理只产出 review + Unresolved Blockers，**是否调用 sillyspec run brainstorm --wait 仍由你（主 agent）根据其 verdict 决定**（子代理不直接操作 CLI 状态机）。

### 默认行为
1. 默认必须执行一次交叉审查；不要让用户凭主观判断决定"要不要 Grill"。
2. 只有以下情况可以轻量跳过，并必须记录原因：
   - 用户明确要求 no-grill / 显式跳过
   - 文档是一页以内、单模块、无状态流转、无 schema/API/兼容策略变更
   - plan_level 明确为 none，且只改 1-2 个文件
3. 即使跳过，也要输出"Design Grill skipped"和原因，不能静默跳过。

### 输入材料
1. 必须读取完整 \`{SPEC_ROOT}/changes/<change-name>/design.md\`
2. 读取 proposal.md、requirements.md、tasks.md、decisions.md（如存在）
3. 读取 scan/module docs：
   - \`{SPEC_ROOT}/docs/<project>/scan/ARCHITECTURE.md\`
   - \`{SPEC_ROOT}/docs/<project>/scan/CONVENTIONS.md\`
   - \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`
   - 命中的模块文档
4. 按 design.md 文件变更清单读取相关源码、测试、配置、schema 或样例数据；矛盾经常藏在设计与外部约束交叉处，素材宁可多读，不要只读摘要。

### 交叉审查模型
按三层检查并输出 cross-check matrix：
1. **定义层**：模糊概念是否有可测试定义。例如"高可用""异常数据""本地缓存""重试"。
2. **一致性层**：跨章节/跨产物是否打架。例如数据流 vs 容错策略、schema vs 输入格式、非目标 vs tasks。
3. **可行性层**：关键假设是否有来源。例如 P99 延迟、上游 SLA、缓存 TTL、数据量、权限模型、兼容旧配置。

### 交叉点抽取
重点找这些交叉点：
- 模块 A 依赖模块 B 的实体/状态/接口
- requirements.md 的 FR 与 design.md 的数据模型/API/状态机
- design.md 的容错策略与数据流、缓存、重试、回滚
- tasks.md 的执行范围与 design.md 的非目标
- decisions.md 的 D-xxx@vN 与 design.md 当前说法
- scan/module docs 或源码中的真实约束与 design.md 假设

### 问答处理
1. 先自动交叉审查，不要一上来问用户。
2. 没有结构性问题：正常完成，输出"Design Grill passed"，附 cross-check matrix。
3. 发现问题：
   - 对能从代码/文档确定的问题，直接给出推荐修正。
   - 对需要业务判断的问题，每次只问一个最关键问题，然后等待用户。
   - P0/P1 未决项必须进入 Unresolved Blockers，不能带着进入 plan。
4. 用户回答后，更新 design.md 和 decisions.md；如果推翻旧决策，新增版本 D-xxx@v2，而不是覆盖 D-xxx@v1。

### decisions.md 版本规则
\`\`\`markdown
## D-001@v2: 缓存异常时的 fallback 语义
- type: definition | consistency | feasibility | boundary | architecture | compatibility | risk
- priority: P0 | P1 | P2
- status: accepted | unresolved | rejected | superseded
- supersedes: D-001@v1
- source: design-grill
- question: §3 数据流与 §7 容错策略冲突时以哪个为准？
- answer: 采用 §7 的重试语义，缓存只作为只读 fallback。
- normalized_requirement: TTL 过期且上游仍异常时返回 stale 标记，不刷新缓存。
- impacts: [FR-02, task-03, verify-02]
- evidence: design.md §3/§7, src/cache/...
\`\`\`

### 输出格式
\`\`\`markdown
## Design Grill Result
status: passed | needs-user-input | blocked | skipped

## Cross-Check Matrix
| ID | 层级 | 交叉点 | 证据 A | 证据 B | 结论 | 决策 |
|---|---|---|---|---|---|---|
| X-001 | consistency | 数据流 vs 容错 | design §3 | design §7 | conflict | D-001@v2 |

## Question Distribution
| 分类 | 数量 | 含义 |
|---|---|---|
| immediately_answered | N | 心里清楚但文档缺失 |
| needs_thinking | N | 需要用户判断 |
| unresolved | N | 真正设计漏洞 |

## Unresolved Blockers
| ID | priority | 问题 | 阻塞原因 | 下一步 |
|---|---|---|---|---|
\`\`\`

### 铁律 — 等待用户
- 发现 P0/P1 结构性矛盾且需要用户判断时，暂停等用户（命令由 CLI 在下方注入）
- 用户显式跳过时必须在 decisions.md 记录 accepted risk；P0/P1 skip 仍必须写入 Unresolved Blockers
- 完成前必须确认没有 P0/P1 unresolved blocker，否则不能进入 plan。`,
      outputHint: 'Design Grill 交叉审查结果',
      optional: false
    },
    {
      name: '用户确认并生成规范文件',
      requiresWait: true,
      waitReason: '等待用户最终确认设计方案',
      waitOptions: ['确认', '需要修改', '推翻重来'],
      prompt: `用户确认设计方案，按变更规模生成规范文件并给出实现路径建议。

### 规模评估（展示前先做）
读取 design.md 的「文件变更清单」，判断本次变更规模：
- **small（小变更）**：改动 ≤ 2 个文件、单模块、无跨模块依赖、无状态机/schema/API 变更
- **large（大变更）**：不满足上述任意一条
在 design.md frontmatter 写入 \`scale: small\` 或 \`scale: large\`（frontmatter 不存在则补 \`author\`/\`created_at\`/\`scale\`）。规模决定下面的产物范围和实现路径。
（注：早期「加载项目上下文」步骤已做过一次粗判并可能建议过走 quick；此处基于 design.md 文件清单做精判兜底。）

### 操作
1. 展示 design.md 摘要 + **规模评估结果（small/large + 一句依据）** 给用户
2. 暂停等待用户选择：✅ 确认 / ✏️ 修改 / ❌ 推翻重来
3. 确认后，**按规模生成规范文件**：
   - **scale=large**：在 \`{SPEC_ROOT}/changes/<change-name>/\` 下生成完整四件套（design.md / decisions.md 可选 / proposal.md / requirements.md / tasks.md），实现路径 → \`sillyspec run plan --change <变更名>\`
   - **scale=small**：只生成/补全 design.md（proposal/requirements/tasks 对 quick 无用，不生成），实现路径 → \`sillyspec run quick --linked-changes <变更名>\`
   - 两种规模都执行 \`git add .sillyspec/\` — 暂存规范文件（不要 commit，由用户通过统一提交工具处理）。**平台模式跳过 git add**（specRoot 不在 sourceRoot 的 git repo 内）

所有规范文件头部必须包含 YAML frontmatter：
\`\`\`yaml
---
author: <git-user>
created_at: <now-datetime>
---
\`\`\`

### proposal.md 格式要求
\`\`\`markdown
# 提案书（Proposal）

## 动机
为什么做、解决什么核心问题

## 关键问题
为什么现有方案不够（展开 2-3 个具体痛点）

## 变更范围
本次做什么

## 不在范围内（显式清单）
- 不做 X
- 不做 Y

## 成功标准（可验证）
- 旧配置默认行为不变
- 新功能在配置后可用
- ...
\`\`\`

### requirements.md 格式要求
\`\`\`markdown
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者 | ... |

## 功能需求

### FR-01: 需求名称
覆盖决策：D-001@v1, D-002@v1（如适用）
Given 前提条件
When 触发动作
Then 期望结果

（每个边界条件独立 GWT 块）

## 非功能需求
- 兼容性：...
- 可回退：...
- 可测试：...

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | ... |
\`\`\`

### decisions.md 格式要求（仅在有 Grill/重大决策时生成）
\`\`\`markdown
# 决策记录（Decisions）

## D-001@v1: 决策短标题
- type: definition | consistency | feasibility | term | boundary | premise | architecture | compatibility | risk
- priority: P0 | P1 | P2
- status: accepted | unresolved | rejected | superseded
- supersedes:
- source: user | code | docs
- question: 被解决的问题
- answer: 用户确认或代码查证结果
- normalized_requirement: 可测试的约束
- impacts: [FR-01, task-01, verify-01]
- evidence: 用户回答轮次或代码/文档路径
\`\`\`

### 后续变更包处理
如果 MASTER.md 中规划了后续变更包（拆分后的子阶段），**必须同时为每个后续包创建独立变更目录**：
1. 读取 MASTER.md 中的变更包列表（包名 + 边界描述）
2. 为每个后续包创建目录：\`mkdir -p {SPEC_ROOT}/changes/<后续包名>\`
3. 每个目录生成骨架文件：
   - \`proposal.md\`：从 MASTER.md 中提取该包的动机和边界
   - \`design.md\`：从 MASTER.md 中提取该包的职责描述（标记为「待设计 - 本包 design 在该包进入 brainstorm 时完善」）
   - \`requirements.md\`：从 MASTER.md 中提取该包的需求范围（标记为「待完善」）
   - \`tasks.md\`：创建空任务列表，标记为「待 plan 阶段展开」
4. \`git add .sillyspec/\` — 暂存所有新增文件（不要 commit，由用户通过统一提交工具处理）。**平台模式跳过 git add**（specRoot 不在 sourceRoot 的 git repo 内）
5. 后续变更包的骨架文件同样必须包含 \`author: <git-user>\` 和 \`created_at: <now-datetime>\`

### 铁律 — 必须等待用户最终确认
- 展示 design.md 摘要后暂停等用户确认，**不要自己说"用户已确认"然后生成文件**（命令由 CLI 在下方注入）
- 只有用户明确确认（--answer "确认"）后才生成规范文件**

### 输出
所有规范文件路径（含后续变更包目录列表）

### 注意
- 禁止在确认前推进到后续阶段
- 禁止自动 commit
- 推翻重来回到「对话式探索与需求澄清」步骤
- 表名/字段名/类名必须来自真实代码或标注"新增"
- 如果存在 decisions.md，requirements.md 必须引用全部当前版本 D-xxx@vN；没有覆盖的 D-xxx@vN 必须标注为剩余风险
- 如果 Design Grill 产生 P0/P1 unresolved blocker，必须回到 design 修正，不能进入 plan/quick
- tasks.md 只列任务名，细节在 plan 阶段展开
- **规范 md 文件第一行标题用中文**（sillyhub 平台解析识别用）：tasks.md 第一行用 # 任务清单（Tasks）（proposal/design/requirements/decisions 见各自模板，均已含中文标题）`,

    }
  ]
}
