export const definition = {
  name: 'verify',
  title: '验证确认',
  description: '对照规范检查 + 测试套件',

  // ⛔ 全局护栏：verify 阶段禁止一切破坏性操作
  // 子代理只能「读」和「写报告」，不能「改代码」或「改 git 状态」。
  _globalGuardrails: `
## ⛔ verify 阶段绝对禁止的操作

以下操作在 verify 阶段**绝对禁止**，无论出于任何原因（包括「恢复文件」「修复问题」「清理目录」）：

### 禁止的 Git 操作
- git checkout（覆盖文件）
- git restore（覆盖文件）
- git reset（回滚提交）
- git revert（撤销提交）
- git clean（删除未跟踪文件）
- git stash drop（删除 stash）
- git branch -D（强制删除分支）

### 禁止的文件操作
- 删除任何源码文件（rm、trash）
- 覆盖任何源码文件（cp 覆盖、echo > 覆盖）
- 修改任何源码文件（除了 .sillyspec/ 下的报告文件）

### 只允许的操作
- git status / git diff / git show / git log / git stash list（只读）
- cat / head / grep / find / wc（只读检查）
- 写入 {SPEC_ROOT}/changes/ 下的报告文件（verify-result.md）——一律用 CLI 替换出的**主仓绝对路径**落盘，绝不写进 worktree 的 .sillyspec 副本（CLI 校验读主仓，副本随 worktree 清理蒸发）
- 运行测试命令（不修改源码）
- 运行 lint 命令（不自动修复）

### 长测试/构建执行铁律
- 长测试/构建/lint 命令必须**前台同步执行**，禁止 run_in_background:true / & / nohup / disown——后台任务易被会话生命周期回收导致中断无果

### 检查选择与重复执行纪律（FR-12）
- 不得为凑检查而重复执行已通过的检查——同一检查通过一次即为有效证据，重复执行只耗时不增信
- 本地验证聚焦本次变更范围（模块子集 / 针对性检查）；全量测试与全仓扫描留给 CI 或用户明确要求时执行

如果发现文件缺失或异常，**只报告问题，不尝试修复**。
`,

  steps: [
    {
      name: '进度确认',
      migratedFrom: ['状态检查'],
      prompt: `> 💡 先说清楚：\`sillyspec run verify\`（不带 --done）**只下发执行指令，不会替你跑测试/构建**——真正的测试由 CLI 在最后 --done 时统一执行（local.yaml 的 commands.test，同步对账可能耗时较长）；「运行测试和质量扫描」那步**不需要你重复手动跑全量**（避免与 CLI 对账重复耗时），只做 lint/静态检查 + 可选快速冒烟。别以为敲了 run verify 就自动验证了。

检查当前进度，确认可以执行 verify。

> ⚠️ 本步用 \`sillyspec progress show\` 查**流程进度**（推进工作流用），不要用 \`sillyspec status\`（那是**项目级快照**，只读、不推进流程，是另一条命令）。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 "verify"

### 输出
当前进度摘要`,
      outputHint: '进度摘要',
      optional: false
    },
    {
      name: '加载规范并锚定',
      prompt: `加载规范文件并确认。

### 操作
1. 读取 proposal.md、design.md、tasks.md、requirements.md、plan.md
2. 如果存在 decisions.md，必须读取并提取所有当前版本 D-xxx@vN 决策 ID
   - 如果存在 P0/P1 unresolved/blocking 决策，验证结论不能为 PASS
   - 如果发现 superseded 决策被下游引用，标记为 ⚠️ stale decision reference
3. 加载项目信息：\`cat {SPEC_ROOT}/projects/*.yaml 2>/dev/null\`
4. 加载本地配置：\`cat {SPEC_ROOT}/local.yaml 2>/dev/null\`（构建命令、测试命令、lint 命令等）若 local.yaml 不存在，先 \`sillyspec local detect\` 生成骨架再读取
5. 加载代码规范：\`cat {SPEC_ROOT}/docs/<project>/scan/CONVENTIONS.md 2>/dev/null\`
   - 测试现状：\`cat {SPEC_ROOT}/docs/<project>/scan/TESTING.md 2>/dev/null\`（了解既有测试约定与覆盖范围，验收时对照）
   - 技术债清单：\`cat {SPEC_ROOT}/docs/<project>/scan/CONCERNS.md 2>/dev/null\`（🔴/🟡 区域；本次变更若触碰须在 verify-result.md 标注）
6. 标注每个文件的存在/不存在状态

### Execute Evidence 传递检查
7. 检查 verify-required-evidence.json 是否存在（由 execute 阶段 Task Review Gate 写入）
   - 路径：变更目录下的 verify-required-evidence.json
   - 文件 schema：\`{ items: [{ task, verdict, evidence: string[] }] }\`——顶层是 \`items\`，每项的 \`evidence\` 是字符串数组（不是 \`requiredEvidence\` 键）
   - 如果存在 → 逐项读取 \`items\`，对每个 cannot_verify 任务逐条核对其 \`evidence\` 数组是否已满足
   - 每条 evidence 必须在 verify-result.md 中给出明确结论（satisfied / missing / partial）
   - 如果有任何 evidence 为 missing → verify 结论不能为 PASS
   - 如果文件不存在 → 表示 execute 阶段无 cannot_verify 任务，正常继续
   - CLI 会 advisory 复核每个 cannot_verify 任务是否在 verify-result.md 体现（未体现仅 warn 不阻断归档；evidence 是否真满足由你诚实判定，CLI 不替你语义判定）

### 模块文档加载
8. 读取 \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
9. 根据 design.md 的文件变更清单匹配 _module-map.yaml 中的模块
10. 读取匹配到的 \`{SPEC_ROOT}/docs/<project>/modules/<module>.md\`
11. **检查模块索引可信度**：如果相关模块的 needs_review 为 true，提示"该模块索引可能不可信，需要回看模块卡片或源码"

### worktree 基线锚点（CLI 注入）
{WORKTREE_BASELINE_INFO}

### 输出
文件加载确认清单（含 decisions.md 当前版本/未决项状态、模块文档 + 索引可信度、worktree 基线锚点）`,
      outputHint: '文件确认清单',
      optional: false
    },
    {
      name: '逐项检查任务',
      prompt: `对照 tasks.md（任务注册表唯一真相）检查每个任务完成状态。勾选由 execute 双路写入（agent 按 review gate 手动勾 + CLI autoCheckPlanFromReviews 机器勾选器按 review.json 自动勾），本阶段只读对照、不改勾。

### 操作
对每个 checkbox：
1. 检查相关文件是否存在
2. 检查代码是否实现了描述的功能
3. 标记：✅ 已完成 / ❌ 未完成 / ⚠️ 部分完成

### 批量模式验证指引
如果 tasks.md 中有批量特征（引擎/模板/配置/批量生成），采用分层验证：
- **L1 自动化（100%）**：运行验证脚本（如有），检查所有实例的文件存在、格式正确、Schema 校验通过
- **L2 AI 抽查（5-10 个）**：选择最复杂的 3 个 + 最简单的 2 个 + 有特殊逻辑的，检查业务逻辑正确性
- **L3 模式性 bug 检测**：L2 发现 bug → 判断是否为系统性问题 → 系统性 bug 则回退修复引擎并重新生成所有实例

### 输出
任务完成度列表 + 完成率

`,
      outputHint: '任务完成度报告',
      optional: false
    },
    {
      name: '对照设计检查',
      prompt: `先运行自动探针，再对照 design.md 检查实现一致性。**design.md 是唯一 truth source，不符合 design.md 的实现 = Bug。**

{{include: verify-probes}}

### 探针结果处理
- 将六个探针的结果汇总为「探针报告」
- 如果探针发现问题（未实现标记、关键词缺失、测试缺失、决策未闭环、API 契约缺口、代码删除对账），在最终验证报告中明确标注
- 探针发现的问题不等同于验证失败，但必须在报告中列出

### 设计一致性检查
基于探针结果，继续检查：
1. 架构决策是否遵循
2. 文件变更清单是否一致
3. 数据模型是否符合
4. API 设计是否符合
5. **Reverse Sync 检查**：如果发现实现合理但 design.md 未覆盖，先更新 design.md 补充遗漏
6. **模块文档一致性检查**：如果在"加载规范并锚定"步骤中加载了模块文档，检查实现是否符合模块文档描述的当前设计（特别关注接口签名、数据流、依赖关系）。不一致时**当场同步模块文档**（这是 verify 的收尾义务，不是可选项）；module-impact.md「更新结果」表的文档同步项也须在本阶段回填 done/skipped——CLI 在 verify --done 时硬校验该表无 pending/待办死信行，未清即阻断完成
7. **决策链路检查**：如果存在 decisions.md，输出 D-xxx@vN → FR-xxx → task-xx → evidence 的追踪矩阵；缺失项必须列为风险（CLI 只校验每个 D-xxx@vN ID 字面出现在 verify-result.md，warning 不阻断；矩阵的 D→FR→task→evidence 映射完整性供人类追溯，CLI 不校验——是否真覆盖由你诚实判定）

### 🩹 实现偏差 postmortem 提示（advisory，不强制——不影响 verify 结论判定）
探针或 postcheck 检出**实现偏差**（不符合 design / 接口漂移 / 测试缺失 / 决策未闭环等）时，除按流程修复外，建议为该偏差补一条轻量 postmortem 记录进 QUICKLOG（走 quick 流程或既有条目的正文核对），根因块内按列表行写四子字段：\`- 现象：\`（偏差表现）、\`- 根因：\`（深层原因）、\`- 护栏：\`（防再犯措施）、\`- 证据：\`（可追溯路径——\`sillyspec agent-log --json\` 输出的本地会话日志 jsonl 路径、本变更 review.json、verify-result.md）。护栏结论经人工确认后归入 \`.sillyspec/knowledge/known-issues.md\`——走既有 knowledge 追加链路（同 quick 收尾先例：先入 knowledge/uncategorized.md，经知识整理确认后归类），不新建链路不新建命令。

### 输出
探针报告 + 设计一致性检查结果 + 模块文档一致性检查结果 + 决策追踪矩阵（如有）`,
      outputHint: '设计一致性报告',
      optional: false
    },
    {
      name: '任务蓝图验收',
      prompt: `检查每个 task-N.md 的验收标准是否全部满足。

### 操作
1. 检查变更目录下 tasks/ 是否存在
2. 如果存在：
   - 逐个读取 tasks/task-NN.md，对照 frontmatter 的 \`acceptance:\` 列表逐条核验（TaskCard 协议的验收标准在 frontmatter YAML，正文无 checkbox）
   - 每条 acceptance 对照实际实现/测试结果判定满足与否，未满足的项列为不通过
3. 如果不存在：跳过此步骤

### 输出
验收结果：通过/不通过 + 未通过的项`,
      outputHint: '验收结果',
      optional: false
    },
    {
      name: '运行测试和质量扫描',
      prompt: `运行代码质量扫描（测试实测统一由 CLI 对账执行，本步不重复手动跑全量）。

### 操作
1. 读取 \`{SPEC_ROOT}/local.yaml\` 获取构建、测试和 lint 命令若 local.yaml 不存在，先 \`sillyspec local detect\` 生成骨架再读取
2. **不要手动重复跑 commands.test**——CLI 会在最终 --done 时统一执行一次（按变更命中模块子集），本步再跑 = 与 CLI 对账重复耗时（实测 198s×2）。如为提前发现实现问题，可对变更模块做**针对性快速冒烟**（可选，非必需）：
   - Maven：\`mvn test -pl <变更模块> -am\`（仅编译变更模块及其依赖）
   - Gradle：\`./gradlew :<模块>:test\`
   - npm/pnpm：\`pnpm test --filter=<包名>\` 或 \`npm test -- --testPathPattern=<相关文件>\`
   - Python：\`pytest <变更模块路径>/\`
3. 如果 local.yaml 有 lint 命令，运行 lint 检查并修复报出的问题（--done 时 CLI 会亲自实测 commands.lint 对账，实测失败会明示）
4. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）

### 注意
- **CLI 对账机制**：verify 阶段最终 --done 时，CLI 会亲自执行 local.yaml 的 commands.test（同步，耗时可能较长）；实测失败会直接阻断 verify 完成，谎报测试结果没有意义。commands.lint 同样会被 CLI 实测对账（advisory）
- 冒烟测试非必需：全量/模块实测结果以 CLI 对账为准，本步跑的结果仅供你提前发现问题并写入验证报告

### 检查选择指引（按变更影响面收窄，本地聚焦；FR-12）
按本次变更的实际影响面选择检查组合，避免无差别全量：
- **行为类改动**（源码逻辑/数据结构/接口/调用关系/配置）→ 聚焦测试：只跑变更命中模块的子集（local.yaml 配 \`test_strategy: module\` + modules 映射），CLI --done 对账同口径收窄
- **文档/prompt 类改动**（*.md、docs/** 等）→ 文档检查（\`sillyspec docs check\` 口径），不跑代码测试
- **门禁/契约类改动**（gate/contract 相关文件、对外接口契约）→ 契约对账（\`sillyspec gate\` 口径）优先于跑测试
- **全量**仅在用户明确要求、或仓库级不可分变更（横切基础设施/全仓重命名等无法按模块拆分）时执行——本地聚焦，全量留给 CI 或明确要求

### 测试策略推荐（CLI 注入；test_strategy: evidence-auto 时非空，其余策略为空）
{EVIDENCE_AUTO_RECOMMENDATION}

### 输出
质量扫描结果 + 技术债务标记`,
      outputHint: '质量扫描结果 + 技术债务',
      optional: false
    },
    {
      name: '输出验证报告',
      prompt: `生成完整验证报告，并写入 verify-result.md。

### 操作
1. 汇总以上所有检查结果
2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描关键词。本步骤 --done 时，CLI 会用 detectChangeRisk 扫描 design.md / plan.md 自动判定等级（doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical）并强制门控：integration-critical / deployment-critical 变更若结论为 PASS / PASS WITH NOTES 但缺少真实集成证据，CLI 直接阻断 verify 完成——谎报结论无效。
   - **判级是机械字面匹配 + 同句否定抑制**：关键词命中位置前方同句有否定提示（不/未/无/避免…，如「本次不新增 daemon 协议」）时该次命中被抑制、不参与判级；「daemon 不稳定」「不同模块的 daemon」这类否定词不在关键词前方的仍正常命中。
   - **误判时的诚实出路（豁免级）**：在 design.md 顶部 frontmatter 加一行 \`risk_level: <真实等级>\`（doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical），CLI 会以声明为准覆盖关键词判级。声明后若是 unit-sufficient 等豁免级，PASS WITH NOTES 不再被强制拦；但结论为 PASS 仍需对应证据。
   - **留痕要求（防逃逸）**：用了显式声明，必须在本报告「变更风险等级」section 写明「risk_level 由 design frontmatter 显式声明 = <等级>（覆盖关键词判级）」+ 一句话理由，让豁免可审计；若有命中被否定语境抑制，同样写明被抑制关键词与理由（抑制可审计，不许用来静默降级）。
   你只需：在 verify-result.md 的「变更风险等级」section 如实记录变更性质；若变更涉及 daemon/backend 跨进程、session/lease/lifecycle 状态机、或部署启动路径，在「Runtime Evidence」section 提供真实集成证据（启动命令、daemon↔backend 调用与日志关键片段、终态断言）。
   - **集成证据是自报告、CLI 不独立运行时核验**：「Runtime Evidence」由你如实填写，CLI 只校验其**字面存在**（是否含关键词），**不会替你启动 daemon、打真实请求或跑迁移**——它是否名副其实取决于你是否实跑过。务必实跑后据实填写，不得凭堆关键词通过门控。（测试套件对账另算：commands.test 由 CLI 真实执行，那块谎报无效。）

3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成九章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、探针 3 的测试覆盖、探针 5 的 API 契约对账表、探针 6 的删除对账三态判定），文件落 \`{SPEC_ROOT}/changes/<change-name>/verify-result.md\`（CLI 替换出的**主仓绝对路径**；若当前 cwd 在 worktree 内也绝不落 worktree 副本——CLI 校验读主仓，副本随 worktree 清理蒸发）。你只需把各 \`<!--TODO-->\` 占位替换为语义结论；半语义探针（2 关键词覆盖 / 4 决策追踪）与断言抽查、集成盲区标注由你补在对应 TODO 处
4. 给出结论：PASS / PASS WITH NOTES / FAIL（受风险门控约束）——**结论必须写明 PASS/FAIL 字样，留「待填」会被 gate 判不过**
5. **核对 module-impact.md**（若 \`{SPEC_ROOT}/changes/<change>/module-impact.md\` 存在）：对照本次实际代码变更（git diff）与 module-impact.md 的模块影响矩阵，发现不一致（漏标受影响模块 / 影响类型错误 / 实际未触碰的模块被误标）则在 verify-result.md 标注。module-impact 由 plan 首版生成、execute 各 Wave 更新，verify 是最后一次核对机会（archive 仅终审不再生成）。这是 advisory 核对（不阻断 verify 完成），但 module-impact 与实际严重背离应记为风险。

### verify-result.md 章节结构（骨架已含，占位替换即可）

结论（PASS / PASS WITH NOTES / FAIL）→ 任务完成度 → 设计一致性 → 探针结果（已预填）→ 测试结果 → 决策追踪矩阵（\`| 决策 ID | FR | Task | Evidence | 状态 |\`，存在 decisions.md 才留）→ 技术债务 → 变更风险等级 → Runtime Evidence → 代码审查。

**Runtime Evidence 行结构**（integration/deployment-critical 必填；按实际触碰的运行时组件写，未涉及的行写「不涉及」勿堆关键词）：长驻进程启动命令 / 触碰的服务端点 / 触发核心路径的请求（附关键响应）/ 进程日志关键片段（证明走了新路径）/ 生命周期终态断言（初始态→运行态→终态）/ 失败模式排除（逐条说明为何未触发）。

### 🧹 服务进程登记与自动回收（真实启动验证必读，坑 verify-service-process-leak）
「真实启动一次」起的长驻服务（uvicorn/node server 等）**必须登记 PID，CLI 在 verify 收尾自动回收**——不登记的进程会挂死机器（实测 uvicorn 漏挂一天多）：
1. 后台启动服务并取 PID（PowerShell：\`Start-Process -PassThru\` 取 \`.Id\`；bash：\`cmd & echo $!\`）
2. 每行一个 PID 追加到 \`{SPEC_ROOT}/.runtime/verify-services-<change-name>.pids\`（\`Add-Content\` / \`echo >>\`；**按变更名分片**——多会话并发 verify 时各自的 --done 只回收自己的服务，互不误杀）
3. verify \`--done\` 时 CLI 读该文件逐个 kill 并清空——你在 verify-result.md 的「生命周期终态断言」里写「PID 已登记，CLI 收尾回收」即可
登记是硬要求：没有 PID 登记的「真实启动」证据在 deployment-critical 门控下视为不完整（进程无法证明被回收）。

### 输出
verify-result.md 路径 + 验证报告摘要 + 下一步命令

### 注意
- PASS → 运行 \`sillyspec run archive\` 归档
- FAIL → 修复后运行 \`sillyspec run verify\` 重新验证——注意重验时 CLI 会重新执行 commands.test 全量对账（长套件数分钟、同步无输出属正常；可 local.yaml test_strategy: module 收窄）
- verify-result.md 是变更包的正式验收记录，归档后保留
- **CLI 对账机制**：本步骤 --done 时 CLI 会亲自执行 local.yaml 的 commands.test；结论写 PASS 但实测失败 → verify 完成被阻断`,
      outputHint: '验证报告',
      optional: false
    }
  ]
}
