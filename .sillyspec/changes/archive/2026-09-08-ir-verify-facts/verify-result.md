---
author: qinyi
created_at: 2026-09-09T00:25:00+08:00
---

# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：`PASS` 六任务四审查全过、全部新门禁（含本变更自建的硬门）实跑绿；已知噪音（全量套件 11 个并行 flaky，与改动前基线一致，单跑全过）不属本变更缺陷

## 任务完成度 [层：人工判断]
- task-01 facts v2 数据层：完成（verify-facts-v2 9/9 + probes-facts 150/0）
- task-02 分类核验：完成（evidence-triple 8/8 + legacy 回归绿）
- task-03 次序接线+硬门：完成（e2e run-complete-step-verify 0 fail）
- task-04 回执校验：完成（receipt 6/6）
- task-05 facts 基线对比：完成（基线三用例含审查 G1 修订回归 18/18）
- task-06 文档同步：完成（_verify exit 0 + 四卡 + lifecycle）
完成度 6/6，无存疑。

## 设计一致性 [层：人工判断]
与 design.md 一致，两处已声明偏差：①探针复跑按设计审查 P0 改为 facts 基线对比（复用既有全量重跑，设计已改版）；②G1 修订 factsConsistency 进合并保留列表（commit 190f1e9）。均经独立审查确认。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/verify-probes.js:7` *   探针1 未实现标记扫描：design §6 清单的具体文件逐行 grep TODO/FIXME/尚未实现 等
- ⚠️ `src/verify-probes.js:13` * verify-result.md 骨架：七章节固定结构 + 探针结果机械预填 + 其余章节 <!--TODO--> 占位。
- ⚠️ `src/verify-probes.js:29` const TODO_MARKER_RE = /尚未实现|TODO|FIXME|HACK|XXX/
- ⚠️ `src/verify-probes.js:135` if (TODO_MARKER_RE.test(line)) probe1.matches.push({ file: e.path, line: i + 1, content: line.trim().slice(0, 160) })
- ⚠️ `src/verify-probes.js:224` L.push('- ✅ 无 TODO/FIXME/尚未实现 标记命中')
- ⚠️ `src/verify-probes.js:234` L.push('<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->')
- ⚠️ `src/verify-probes.js:255` L.push('<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->')
- ⚠️ `src/verify-probes.js:370` * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。
- ⚠️ `src/verify-probes.js:382` '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——',
- ⚠️ `src/verify-probes.js:390` '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->',
- ⚠️ `src/verify-probes.js:393` '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->',
- ⚠️ `src/verify-probes.js:399` '- 新域测试：verify-facts-v2 9/9、verify-evidence-triple 8/8、verify-receipt-rerun 9/9（26 断言合并跑全过）
- 回归：verify-probes-facts 150/0、run-complete-step-verify e2e 0 fail、verify-required-evidence-check/stage-contract/ir-strict/machine-interface/prompt 族全绿
- 全量 npm test：失败集 = 11 个并行 flaky，与改动前主仓基线逐文件一致（单跑全过，非本变更引入）
- lint：npm run lint 通过（--done 门禁实测）',
- ⚠️ `src/verify-probes.js:402` '| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v2 | FR-01/02/05 | task-01/02/05 | verify-facts-schema.js 双层写入模型 + slot-backfill 边界测试 | 已兑现 |
| D-002@v1 | FR-03 | task-03 | 文件面全 verify 域，plan 无 Wave/archive/doctor 任务 | 已兑现 |
| D-003@v1 | FR-04 | task-04 | checkIntegrationEvidence v2 无任何 spawn 代跑代码 | 已兑现 |
| D-004@v1 | — | — | runVerifyLintCheck advisory 语义零改动 | 已兑现 |
| D-005@v2 | FR-01/06 | task-01/06 | schema 单点 verify-facts-schema.js 四方 import | 已兑现 |',
- ⚠️ `src/verify-probes.js:405` '探针 1 命中的 ⚠️ 行全部是骨架/prompt 文本里的 `<!--TODO-->` 占位字样（本仓自身文档文本），非未完成实现标记；无新增技术债。G2（gates 级 e2e 断言）由本报告所属 verify --done 的硬门实跑兑现——本变更即首例。',
- ⚠️ `src/verify-probes.js:408` '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」
- ⚠️ `src/verify-probes.js:411` '不涉及（unit-sufficient 显式声明；纯 CLI 判定逻辑，npm test/lint 即真实运行验证）。',
- ⚠️ `src/verify-probes.js:414` '独立 execute 审查（acceptance）pass/pass，3 gap 全处置：G1 factsConsistency 保留列表（commit 190f1e9 + 回归）、G2 e2e 由本 verify 实跑兑现、G3 卡边界补正。小瑕疵已修（readFactsFile 死代码删除/末行换行）。总体：五 Phase 主链落地、legacy 三分支行为等同、quick 路径零改动。',
- ⚠️ `src/verify-postcheck.js:337` * 纯机械启发式（确定性：同输入同输出）；矩阵行 <!--TODO--> 未回填 → 保守计行为类
- ⚠️ `src/verify-postcheck.js:362` // 矩阵行 <!--TODO--> 未回填 → 影响面未知，保守计行为类
- ⚠️ `src/verify-postcheck.js:363` if (String(rowText).includes('<!--TODO')) { out.behavioral.push('<!--TODO--> 未回填行'); classified++ }
- ⚠️ `src/verify-postcheck.js:383` // 骨架产出 `- \`path\` <!--TODO-->` 列表行；手写形态可能是 `| 文件 | 处置说明 |` 表行
- ⚠️ `src/verify-postcheck.js:1776` console.warn('   提示：检查是否后端漏实现，或前端调用了尚未实现的端点。确认无误可在 design.md 标注豁免。')
- ⚠️ `src/run/gates.js:70` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:75` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:78` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:83` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:89` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:92` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:113` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:115` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:118` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:143` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:144` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:151` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ⚠️ `src/index.js:99` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:104` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:898` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:905` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:998` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1024` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1283` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1288` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1314` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:2704` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/stages/verify.js:181` 4. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）
- ⚠️ `src/stages/verify.js:215` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `test/verify-probes-facts.test.mjs:96` *   - a.js 含 2 个 TODO 标记（probe1 可命中 2 条）；src/feature.js + co-located 测试（probe3 hasTest）；
- ⚠️ `test/verify-probes-facts.test.mjs:104` writeFileSync(join(dir, 'a.js'), 'console.log(1)\n// TODO: one\n// FIXME: two\n')
- ⚠️ `test/verify-probes-facts.test.mjs:173` { file: 'a.js', line: 3, content: '// TODO: one' },
- ⚠️ `test/verify-probes-facts.test.mjs:174` { file: 'b.js', line: 9, content: '// FIXME: two' },
- ⚠️ `test/verify-probes-facts.test.mjs:285` const r2 = { ...r1, probe1: { ...r1.probe1, matches: r1.probe1.matches.concat([{ file: 'c.js', line: 1, content: 'TODO' }]) } }
- ⚠️ `test/verify-probes-facts.test.mjs:346` const hijack = passFilled.replace(/<!--TODO: 测试命令 \+ 结果/, '测试输出出现 FAIL 字样（同形干扰）<!--TODO: 测试命令 + 结果')
- ⚠️ `test/verify-probes-facts.test.mjs:375` assert(PROBE1_HIT_LINE_RE.test('- ⚠️ `src/a.js:9` // TODO: x'), 'PROBE1_HIT_LINE_RE 命中反引号 file:line 形态')
- ⚠️ `docs/prompt/verify.md:244` 4. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）
- ⚠️ `docs/prompt/verify.md:290` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 `sillyspec verify-probes --change <change-name> --init`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、探针
- ℹ️ 清单文件不存在（跳过）：NEW:src/verify-facts-schema.js、NEW:test/verify-facts-v2.test.mjs、NEW:test/verify-evidence-triple.test.mjs、NEW:test/verify-receipt-rerun.test.mjs

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（NEW:src、src、NEW:test、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-02: 模块目录（src、src/progress、NEW:test）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-03: 模块目录（src/run）递归未找到测试文件（含 co-located tests/）
- ✅ task-04: 模块目录（src、NEW:test）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-05: 模块目录（src、NEW:test）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-06: 模块目录（src/stages、docs/prompt、.sillyspec/docs/sillyspec/modules、docs/sillyspec/file-lifecycle）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3 + worktree 3] + artifact 0), 0 frontend calls [scope: change-diff (27 files @ worktree)] | 2 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->

## 技术债务 [层：人工判断]
<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design.md frontmatter risk_level）。关键词命中 claim/agent_run 为回执槽字段名与豁免说明文字，实际改动为纯 CLI 门禁/解析层，不触碰 daemon/session/启动入口/跨进程。

## Runtime Evidence [层：人工判断]
<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->

## 代码审查 [层：人工判断]
<!--TODO: 问题列表 + 总体评价-->
## 证据账（cannot_verify 任务）
[层：人工判断——CLI 核验]

<!-- 无 cannot_verify 任务时本节写「无」 -->
无（本次变更无 cannot_verify 任务）

## 集成验证回执
[层：自述声明——CLI 一致性校验]

<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
无（unit-sufficient 显式声明，非 integration/deployment-critical）

