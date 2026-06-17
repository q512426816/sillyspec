export const definition = {
  name: 'brainstorm',
  title: '头脑风暴',
  description: '探索需求、分析技术方案、识别风险',
  steps: [
    {
      name: '状态检查',
      prompt: `检查当前变更的进度状态（sillyspec.db）。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 "brainstorm"
3. 如果有进行中的 brainstorm，提示选择继续或重新开始
4. 如果未初始化，提示先运行 sillyspec init
5. **检查变更名称是否有意义**：如果当前变更名是自动生成的（如 \`2026-06-02-new-change\`），询问用户确认实际变更名，然后运行 \`sillyspec change-rename <旧名> <新名>\` 重命名

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
      prompt: `加载项目现有上下文，理解代码结构和约定。

### 操作
1. 读取 CODEBASE-OVERVIEW.md + 共享规范 + 子项目上下文
2. 加载项目信息：\`cat .sillyspec/projects/*.yaml 2>/dev/null\`
3. 加载本地配置：\`cat .sillyspec/local.yaml 2>/dev/null\`
4. 棕地项目：读取 .sillyspec/docs/<project>/scan/ 下的 STRUCTURE.md、CONVENTIONS.md、ARCHITECTURE.md
5. **加载模块索引**：读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（如存在）
   - 这一步是高频操作，_module-map.yaml 回答"哪个文件属于哪个模块、模块之间怎么依赖"
   - 用 tags/aliases 字段做需求关键词→模块的粗匹配
   - 用 entrypoints 字段快速了解模块对外能力
6. 查看进行中的变更：\`ls .sillyspec/changes/ | grep -v archive\`

### 模块匹配方法
读取 _module-map.yaml 后，根据用户描述的需求关键词，匹配相关模块：
- 需求中提到"登录""认证""token" → 匹配 tags/aliases 中含这些词的模块
- 需求中提到特定文件路径 → 匹配 paths 字段
- 匹配结果用于后续 design.md 的文件变更清单

### 子项目判定
- 单项目：直接确认，不需要等待
- 多项目且用户已指定：直接确认，不需要等待
- 多项目且用户未指定：列出项目列表，需要用户确认本次需求属于哪个子项目

### 输出
项目现状理解摘要（3-5 句话，关键约定和架构决策）+ 可能涉及的模块列表 + 本次需求所属子项目

### 注意
- 棕地项目必须读取数据模型章节
- 模块匹配只是粗筛，后续步骤会细化`,
      outputHint: '上下文摘要',
      optional: false
    },
    {
      name: '协作与复用检查',
      prompt: `检查是否有同名变更或可复用模板。

### 操作
1. 检查已有变更：\`ls .sillyspec/changes/ | grep -v archive\`
   - 有相关变更 → 提示用户，避免重复
2. 检查全局模板：\`ls ~/.sillyspec/templates/\`
   - 有匹配模板 → 询问是否基于模板
3. 无相关内容 → 跳过，不输出

### 输出
检测到的相关变更和可用模板（无则输出"无冲突，继续"）`,
      outputHint: '已有变更和可用模板',
      optional: true
    },
    {
      name: '原型/设计图分析',
      prompt: `如果用户提供了截图、图片或 HTML 原型，分析提取结构。

### 操作
1. 识别图片中的页面结构（区域、组件、布局）
2. 提取表单字段（名称、类型、必填、选项）
3. 提取交互流程（页面跳转、按钮行为）
4. 提取标注和备注（业务规则、权限说明）
5. 展示分析结果，请用户确认遗漏

### 输出
页面结构树 + 字段列表 + 交互流程图

### 注意
- 没有原型则跳过此步骤
- 多页面时逐页分析，不要一次全部输出
- 图片信息 > 文字描述，不要忽略视觉信息`,
      outputHint: '页面结构和交互流程',
      optional: true
    },
    {
      name: '需求范围评估',
      conditionalWait: true,
      waitReason: '等待用户确认拆分/批量模式方案',
      waitOptions: ['同意拆分', '不需要拆分', '走批量模式'],
      prompt: `评估需求复杂度，判断是否需要拆分或走批量模式。

### 操作
1. 根据分析结果判断复杂度
2. 满足以下任意 2 条建议拆分：
   - 3+ 个可独立交付的功能模块
   - 3+ 种角色有不同权限和视图
   - 跨页面状态流转（审批流、多步表单）
   - 模块间耦合度低可独立开发
3. 满足以下条件建议走**批量模式**：
   - 任务数量 > 10 且任务间有重复模式（如 100 个报表、50 个表单、N 个相似页面）
   - 本质是「模板 × 数据」而非 N 个独立功能
   - 直接逐个开发会导致 plan.md 膨胀和上下文溢出
4. 需要拆分 → 生成 MASTER.md，规划子阶段
5. 检测到批量模式 → 输出提示并建议用户确认
6. 都不需要 → 继续

### 批量模式指引
确认后，后续 plan/execute 按以下原则调整：
- **不要**把每个实例列为独立任务（不要写 100 个 checkbox）
- plan 设计通用架构（引擎/模板/配置格式），任务数控制在 10 个以内
- 数据转换用脚本完成（Excel → 配置文件），不消耗 AI 上下文
- execute 每个 Wave 独立模块，Wave 间通过接口定义解耦
- verify 用脚本全量验证 + AI 抽查边界案例

### 半批量场景
如果任务中大部分相似但有少量特殊任务（如 20 个任务中 15 个相似、5 个特殊）：
- **主簇**（>10 个相似）→ 走批量模式（引擎 + 配置）
- **小簇**（2-5 个相似）→ 走简化版批量（基于主簇模板扩展）
- **孤立任务**（1 个）→ 走标准开发流程
- 建议用「继承 + override」配置解决特殊任务，配置解决不了的才写定制代码
- 架构设计时预留扩展点（hooks/overrides），让特殊任务能"挂上去"而不是"另起炉灶"

### 铁律 — 何时需要等待用户
- **需要拆分或批量模式时**：列出方案并暂停等待用户确认
  - 调用：\`sillyspec run brainstorm --wait --reason "等待用户确认拆分方案" --options "同意拆分,不需要拆分" --output "拆分方案摘要"\`
- **不需要拆分也不需要批量模式时**：正常完成即可

### 输出
拆分方案 / 批量模式确认 / "无需拆分"确认

### 注意
- 简单 CRUD 不拆`,
      outputHint: '拆分方案或无需拆分确认',
      optional: true
    },
    {
      name: '对话式探索',
      requiresWait: true,
      repeatableWait: true,
      maxWaitRounds: 3,
      waitReason: '等待用户回答需求问题',
      waitOptions: ['继续补充', '信息够了，进入方案讨论'],
      prompt: `通过对话探索需求细节。

### 操作
1. 从最核心的一个问题开始（用户到底想要什么？）
2. **提出问题后必须暂停等待用户回答**，不要替用户回答
3. 根据用户回答判断：信息够了 → 正常完成 / 需要追问 → 暂停等待下一个回答
4. 探索顺序（按需）：目的 → 约束 → 边界 → 成功标准

### 铁律 — 不要自问自答
- **这是人机协作步骤，你必须暂停等待用户输入。**
- 每次提出问题后，调用：
  \`sillyspec run brainstorm --wait --reason "等待用户回答需求问题" --options "回答见--answer" --output "你的问题"\`
- **绝对禁止**：在自己输出中模拟用户的回答，然后说"需求已明确"
- 2-3 轮问答就应进入方案讨论
- 多选题优于开放式问题
- YAGNI — 砍掉不需要的功能

### 输出
需求理解摘要（用户确认的需求点列表）

### 注意
- 第一次进入此步骤时，提出第一个问题并暂停
- 用户通过 \`--continue --answer "回答"\` 回答后，本步骤会再次执行，此时检查是否需要追问或可以结束`,
      outputHint: '需求理解摘要',
      optional: false
    },
    {
      name: '需求澄清 Grill',
      conditionalWait: true,
      repeatableWait: true,
      maxWaitRounds: 8,
      waitReason: '等待用户回答需求澄清 Grill',
      waitOptions: ['回答见--answer', '信息够了，结束需求澄清'],
      prompt: `执行可选的需求澄清 Grill pass。

### 定位
这是 design.md 之前的需求澄清，不是设计后的 Design Grill。目标是把需求/术语/边界中仍需要人类判断的点问清楚；Design Grill 后续仍会默认执行，用来审查已经写出的 design.md 是否自洽。

### 入口判断
1. 汇总「对话式探索」后仍未稳定的歧义点，按类型列出：
   - 术语歧义：同一个词可能指向不同实体/角色/状态
   - 边界歧义：哪些场景做、哪些不做、失败怎么处理
   - 前提风险：这个需求是否不该存在，是否已有更简单的现有方案
   - 代码冲突：用户描述与现有代码/scan/module 文档不一致
2. 能通过代码或文档确认的不要问用户，先读取：
   - \`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`
   - \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`
   - \`.sillyspec/docs/<project>/modules/_module-map.yaml\`
   - 相关源码文件
3. 给每个未解决歧义分级：
   - P0：影响数据模型、权限边界、状态机/工作流、兼容策略、不可逆架构取舍、跨模块所有权
   - P1：影响用户场景、验收标准、错误处理、默认值
   - P2：文案、展示细节、低风险交互偏好
4. 执行规则：
   - P1/P2 歧义 0-2 个且无 P0：输出"需求澄清 Grill skipped"，在后续设计中内联处理并记录依据
   - P1/P2 歧义 >= 3 个：进入本 pass，按优先级逐个澄清
   - 任意 P0 歧义：进入本 pass；如果需要用户判断，必须暂停问一个问题
5. 不要问用户"要不要 Grill"。本步骤由 AI 根据歧义风险决定是否执行；只在需要业务判断/取舍时等待用户回答。

### 追问策略
1. **一次只问一个问题**：按 P0 → P1 → P2 顺序，深度优先处理最关键歧义。
2. **能查代码就不问**：如果问题可由源码、scan 文档、模块文档回答，先查证并给出结论；只有业务判断/取舍才问用户。
3. **术语碰撞立即指出**：用户用词与 glossary/代码实体/模块文档冲突时，当场说明冲突并要求选择 canonical term。
4. **模糊词精化**：把"账户/任务/状态/会话/执行"这类多义词拆成明确实体或状态。
5. **场景压力测试**：用具体 case 逼出边界，例如失败重试、部分成功、历史数据、权限不足、并发修改、兼容旧配置。
6. **前提挑战优先**：如果现有设计或代码已有简单路径，先说明"可能不该新增"，不要直接优化错误前提。

### 决策记录草稿
每解决一个有实现影响的问题，生成一个稳定 ID 的记录草稿。不要把闲聊都记录进去。

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

### 铁律 — 等待用户
- 每轮最多提出一个问题，然后调用：
  \`sillyspec run brainstorm --wait --reason "等待用户回答需求澄清 Grill" --options "回答见--answer,信息够了，结束需求澄清" --output "你的单个问题或查证结论"\`
- 用户通过 \`--continue --answer "回答"\` 回答后，本步骤会再次执行；继续处理下一个最关键歧义。
- 达到 maxWaitRounds=8 后，必须总结已确认内容和剩余风险，不要无限追问。

### 输出
需求澄清结论摘要 + D-xxx@vN 决策记录草稿 + 剩余风险（如有）`,
      outputHint: '需求澄清和决策记录草稿',
      optional: true
    },
    {
      name: '提出 2-3 种方案',
      requiresWait: true,
      waitReason: '等待用户选择方案',
      waitOptions: ['方案A', '方案B', '方案C'],
      prompt: `基于需求理解和 Grill 结果，提出 2-3 种实现方案。

### 操作
1. 每种方案列出：核心思路、优势、劣势
2. 如果 Grill 产生 D-xxx@vN 决策记录，方案必须说明覆盖/违反哪些当前版本决策
3. 给出推荐方案和理由

### 铁律 — 必须等待用户选择方案
- **不要替用户选择方案。** 列出方案对比表和推荐后，必须暂停等待用户选择。
- 列出方案后，调用：
  \`sillyspec run brainstorm --wait --reason "等待用户选择方案" --options "方案A,方案B,方案C" --output "方案对比摘要"\`
- **绝对禁止**：在输出中自己说"推荐方案 A"然后当用户选了

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
      requiresWait: true,
      waitReason: '等待用户确认设计方案',
      waitOptions: ['确认', '需要修改', '推翻重来'],
      prompt: `展示完整设计方案供用户确认。

### 操作
1. 简单项目：几句话整体描述
2. 复杂项目：按模块/Phase 分段展示，每段 200-300 字
3. 展示完整设计方案（不要逐段停顿，一次性展示）
4. 确认变更名（格式：\`YYYY-MM-DD-<简短描述>\`，例如 \`2026-05-13-user-auth\`）
5. 暂停等待用户确认或修改意见

### 铁律 — 必须等待用户确认设计
- **不要替用户确认设计。** 展示完整设计方案后，必须暂停等待用户确认。
- 列出设计后，调用：
  \`sillyspec run brainstorm --wait --reason "等待用户确认设计方案" --options "确认,需要修改,推翻重来" --output "设计方案摘要"\`
- **绝对禁止**：在输出中自己说"设计已充分确认"然后推进

### 输出
完整设计方案 + 变更名

### 注意
- 不要一次输出大段文字，按模块/Phase 分段
- 变更名必须以当天日期开头（YYYY-MM-DD-），后跟英文短横线分隔的简短描述`,
      outputHint: '用户确认的设计方案',
      optional: false
    },
    {
      name: 'HTML 原型生成',
      prompt: `为设计方案生成可交互的 HTML 原型，帮助用户可视化确认。

### 操作
1. 判断本次设计是否适合生成 HTML 原型：
   - 适合：有 UI 组件/布局/交互流程/状态转换/架构图
   - 不适合：纯后端逻辑/配置修改/无可视化意义
2. 如果适合，生成一个独立的 HTML 文件（内联 CSS + JS），保存到：
   \`.sillyspec/changes/<change-name>/prototype-<名称>.html\`（变更名格式：YYYY-MM-DD-<简短描述>）
3. 原型要求：
   - 单文件，浏览器直接打开
   - 展示关键布局结构和交互流程
   - 不需要完整功能，重点是让用户确认设计方向
   - 使用 ASCII/流程图/线框图风格，不需要精美 UI
4. 展示给用户确认设计方向

### 输出
HTML 原型文件路径（或"跳过"如果不适合）`,
      outputHint: '原型文件路径或跳过',
      optional: true
    },
    {
      name: '写设计文档并自审',
      prompt: `撰写 design 文档并进行 AI 自审。

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
1. 确认变更目录存在：\`mkdir -p .sillyspec/changes/<change-name>\`（Windows 用 \`mkdir .sillyspec\\changes\\<变更名>\` 或 PowerShell \`New-Item -ItemType Directory -Force -Path .sillyspec/changes/<change-name>\`）
   - 变更名格式必须为 \`YYYY-MM-DD-<简短描述>\`（如 \`2026-05-13-user-auth\`）
2. 将确认的设计写入 \`.sillyspec/changes/<change-name>/design.md\`
3. 如果 Grill 或方案讨论产生了实现相关决策，写入 \`.sillyspec/changes/<change-name>/decisions.md\`：
   - decisions.md 是本次变更的决策台账，不是长期术语表
   - 只记录有实现/验收影响的决策，闲聊和低风险偏好不记录
   - 每条记录必须有稳定版本 ID：D-001@v1、D-002@v1 ...
   - 若后续 Design Grill 修正该决策，新记录使用 D-001@v2，并写明 supersedes: D-001@v1
   - 每条记录必须包含：type、status、source、question、answer、normalized_requirement、impacts、evidence、priority
   - 长期术语只在 archive/scan 时再提升到 \`.sillyspec/docs/<project>/glossary.md\`
4. 自审检查：
   - 需求覆盖：是否完整覆盖对话式探索中确认的需求
   - Grill 覆盖：如果存在 decisions.md，design.md 是否引用所有当前版本 D-xxx@vN
   - 约束一致性：是否与 CONVENTIONS.md、ARCHITECTURE.md 一致
   - 真实性：表名/字段名/类名/方法名来自真实代码或标注"新增"
   - YAGNI：是否包含不必要功能
   - 验收标准：是否具体可测试
   - 非目标清晰：是否明确界定了不做的事
   - 兼容策略（brownfield）：是否说明了回退路径
   - 风险识别：是否识别了关键技术风险和对策
5. 自审发现问题 → 修改后重新检查
6. 全部通过 → 进入下一步

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

### 默认行为
1. 默认必须执行一次交叉审查；不要让用户凭主观判断决定"要不要 Grill"。
2. 只有以下情况可以轻量跳过，并必须记录原因：
   - 用户明确要求 no-grill / 显式跳过
   - 文档是一页以内、单模块、无状态流转、无 schema/API/兼容策略变更
   - plan_level 明确为 none，且只改 1-2 个文件
3. 即使跳过，也要输出"Design Grill skipped"和原因，不能静默跳过。

### 输入材料
1. 必须读取完整 \`.sillyspec/changes/<change-name>/design.md\`
2. 读取 proposal.md、requirements.md、tasks.md、decisions.md（如存在）
3. 读取 scan/module docs：
   - \`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`
   - \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`
   - \`.sillyspec/docs/<project>/modules/_module-map.yaml\`
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
- 发现 P0/P1 结构性矛盾且需要用户判断时，调用：
  \`sillyspec run brainstorm --wait --reason "等待用户处理 Design Grill 发现的结构性问题" --options "按推荐修正,补充回答,显式跳过" --output "Design Grill 问题摘要"\`
- 用户显式跳过时，必须在 decisions.md 记录 accepted risk；P0/P1 skip 仍必须写入 Unresolved Blockers。
- 完成前必须确认：没有 P0/P1 unresolved blocker；否则不能进入 plan。`,
      outputHint: 'Design Grill 交叉审查结果',
      optional: false
    },
    {
      name: '用户确认并生成规范文件',
      requiresWait: true,
      waitReason: '等待用户最终确认设计方案',
      waitOptions: ['确认', '需要修改', '推翻重来'],
      prompt: `用户确认设计方案，生成规范文件。

### 操作
1. 展示 design.md 摘要给用户
2. 暂停等待用户选择：✅ 确认 / ✏️ 修改 / ❌ 推翻重来
3. 确认后，在 \`.sillyspec/changes/<change-name>/\` 下生成所有规范文件：
   - **design.md**：架构决策、文件变更清单、数据模型、API 设计、兼容策略、风险登记、自审
   - **decisions.md**（可选）：Grill/重大决策台账，使用 D-001@v1 稳定版本 ID
   - **proposal.md**：动机、关键问题（为什么现有方案不够）、变更范围、不在范围内（显式清单）、成功标准（可验证条件）
   - **requirements.md**：角色表 + FR 编号需求 + Given/When/Then 行为规格 + 非功能需求 + D-xxx@vN 覆盖关系
   - **tasks.md**：任务列表（只列名称、对应文件路径、覆盖的 FR-xxx/D-xxx@vN，细节在 plan 阶段展开）
   - \`git add .sillyspec/\` — 暂存规范文件（不要 commit）

所有规范文件头部必须包含 YAML frontmatter：
\`\`\`\`yaml
---
author: <git-user>
created_at: <now-datetime>
---
\`\`\`\`

### proposal.md 格式要求
\`\`\`markdown
# Proposal

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
# Requirements

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
# Decisions

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
2. 为每个后续包创建目录：\`mkdir -p .sillyspec/changes/<后续包名>\`
3. 每个目录生成骨架文件：
   - \`proposal.md\`：从 MASTER.md 中提取该包的动机和边界
   - \`design.md\`：从 MASTER.md 中提取该包的职责描述（标记为「待设计 - 本包 design 在该包进入 brainstorm 时完善」）
   - \`requirements.md\`：从 MASTER.md 中提取该包的需求范围（标记为「待完善」）
   - \`tasks.md\`：创建空任务列表，标记为「待 plan 阶段展开」
4. \`git add .sillyspec/\` — 暂存所有新增文件（不要 commit）
5. 后续变更包的骨架文件同样必须包含 \`author: <git-user>\` 和 \`created_at: <now-datetime>\`

### 铁律 — 必须等待用户最终确认
- **展示 design.md 摘要后，暂停等待用户确认。** 不要替用户确认。
- 调用：\`sillyspec run brainstorm --wait --reason "等待用户确认设计方案" --options "确认,需要修改,推翻重来" --output "design.md 摘要"\`
- **绝对禁止**：在输出中自己说"用户已确认"然后生成文件
- **只有用户通过 --continue --answer "确认" 后才生成规范文件**

### 输出
所有规范文件路径（含后续变更包目录列表）

### 注意
- 禁止在确认前推进到后续阶段
- 禁止自动 commit
- 推翻重来回到 Step 6（对话式探索）
- 表名/字段名/类名必须来自真实代码或标注"新增"
- 如果存在 decisions.md，requirements.md 必须引用全部当前版本 D-xxx@vN；没有覆盖的 D-xxx@vN 必须标注为剩余风险
- 如果 Design Grill 产生 P0/P1 unresolved blocker，必须回到 design 修正，不能进入 plan
- tasks.md 只列任务名，细节在 plan 阶段展开`,

    }
  ]
}
