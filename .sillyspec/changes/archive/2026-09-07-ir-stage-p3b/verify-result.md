# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论必须写明 PASS / FAIL**——
> 留「待填」会被 gate 判不过（fail-closed）。

## 结论：PASS WITH NOTES（FR-01~03 全兑现、149+32+38+module 子集全绿、lint 464 文件通过；NOTES=骨架占位文案含 PASS 字样的预存行为与 1 处测试布尔优先级风格备注，均非阻断） [层：人工判断]

## 任务完成度 [层：人工判断]
5/5 完成（review.json 全 pass）：task-01 facts 底稿+层标注（32/32+CLI 端到端两跑）✓；task-02 checkProbeConsistency（冒烟 21/21，锚点五位点同源）✓；task-03 gates 接线（38/38+23/23，独立落盘）✓；task-04 prompt 两纪律 ✓；task-05 测试套件 149 断言（回归四文件零改动）✓。

## 设计一致性 [层：人工判断]
一致（execute 独立审查 12/12 pass）：facts 最近快照语义/层标注后缀不新增行/子节定界锚点/分级判别子/HEAD 前进 fail-closed/gates 信封四值（design 已勘误补 ok 态）/prompt 纪律全部按 D-001~003 落地；runVerifyProbes 与 renderVerifyProbesReport 函数体零 hunk（纯增量消费者）。

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
- ⚠️ `src/verify-probes.js:380` '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论必须写明 PASS / FAIL**——',
- ⚠️ `src/verify-probes.js:386` '5/5 完成（review.json 全 pass）：task-01 facts 底稿+层标注（32/32+CLI 端到端两跑）✓；task-02 checkProbeConsistency（冒烟 21/21，锚点五位点同源）✓；task-03 gates 接线（38/38+23/23，独立落盘）✓；task-04 prompt 两纪律 ✓；task-05 测试套件 149 断言（回归四文件零改动）✓。',
- ⚠️ `src/verify-probes.js:389` '一致（execute 独立审查 12/12 pass）：facts 最近快照语义/层标注后缀不新增行/子节定界锚点/分级判别子/HEAD 前进 fail-closed/gates 信封四值（design 已勘误补 ok 态）/prompt 纪律全部按 D-001~003 落地；runVerifyProbes 与 renderVerifyProbesReport 函数体零 hunk（纯增量消费者）。',
- ⚠️ `src/verify-probes.js:395` 'module 策略子集（P3a 配置沿用，FR-12 聚焦）：test/verify-probes-facts.test.mjs 149/0（CLI --done 对账）；回归 verify-probes 32/0、wait-gates 38/0、verify-postcheck module/worktree 全绿；lint 464 文件 0 未引用导出。known_failures 4 项预存豁免沿用（local.yaml，与 P3b 无关不涉及子集）。',
- ⚠️ `src/verify-probes.js:398` '| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01/03 | 01/04 | facts CLI 全权+层标注+prompt 禁改 | 兑现 |
| D-002@v1 | FR-02 | 02/03 | 分级+正文基准（E3 删 facts 绕不过实证） | 兑现 |
| D-003@v1 | FR-02 | 02/03 | 子节定界/判别子/HEAD 子案/签名补参 | 兑现 |',
- ⚠️ `src/verify-probes.js:401` '探针 1 命中全部为 verify-probes.js 自身的占位符/骨架生成器机制字面量（本变更对该文件的改动不含 TODO）；无新增技术债。',
- ⚠️ `src/verify-probes.js:404` '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」
- ⚠️ `src/verify-probes.js:407` '不涉及长驻进程/端点/部署（纯 CLI postcheck 逻辑）。运行时证据=CLI --done 真实对账（test 子集 + lint）+ 机制自举实录：本次 verify --init 由 P3b 新代码生成本报告骨架（含层标注）并落 verify-facts.json（「📝 已刷新 verify-facts.json」CLI 输出）；--done gate 链将首次对本变更自身执行 reconcileTargetFiles（P3b 卡带 target_files 声明）与 checkProbeConsistency（P3b 首个真实消费方）。服务进程登记：不涉及。',
- ⚠️ `src/verify-probes.js:410` 'execute 独立审查 pass 12/12（重跑 149+32+38 全绿）。note 级 5 项：envelope 四值（已勘误入 design）、层标注文案微差（语义等价）、1 处测试布尔优先级风格（a&&b||c 实际通过，后续顺手改）、自定义 assert 风格（同仓先例）、verify.js:217「九章节」预存失实（非本变更引入，建议下批清理）。',
- ⚠️ `src/verify-postcheck.js:280` * 纯机械启发式（确定性：同输入同输出）；矩阵行 <!--TODO--> 未回填 → 保守计行为类
- ⚠️ `src/verify-postcheck.js:305` // 矩阵行 <!--TODO--> 未回填 → 影响面未知，保守计行为类
- ⚠️ `src/verify-postcheck.js:306` if (String(rowText).includes('<!--TODO')) { out.behavioral.push('<!--TODO--> 未回填行'); classified++ }
- ⚠️ `src/verify-postcheck.js:326` // 骨架产出 `- \`path\` <!--TODO-->` 列表行；手写形态可能是 `| 文件 | 处置说明 |` 表行
- ⚠️ `src/verify-postcheck.js:1631` console.warn('   提示：检查是否后端漏实现，或前端调用了尚未实现的端点。确认无误可在 design.md 标注豁免。')
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
- ⚠️ `src/stages/verify.js:183` 4. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）
- ⚠️ `src/stages/verify.js:217` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成九章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `test/verify-probes-facts.test.mjs:95` *   - a.js 含 2 个 TODO 标记（probe1 可命中 2 条）；src/feature.js + co-located 测试（probe3 hasTest）；
- ⚠️ `test/verify-probes-facts.test.mjs:103` writeFileSync(join(dir, 'a.js'), 'console.log(1)\n// TODO: one\n// FIXME: two\n')
- ⚠️ `test/verify-probes-facts.test.mjs:171` { file: 'a.js', line: 3, content: '// TODO: one' },
- ⚠️ `test/verify-probes-facts.test.mjs:172` { file: 'b.js', line: 9, content: '// FIXME: two' },
- ⚠️ `test/verify-probes-facts.test.mjs:283` const r2 = { ...r1, probe1: { ...r1.probe1, matches: r1.probe1.matches.concat([{ file: 'c.js', line: 1, content: 'TODO' }]) } }
- ⚠️ `test/verify-probes-facts.test.mjs:346` const hijack = passFilled.replace(/<!--TODO: 测试命令 \+ 结果/, '测试输出出现 FAIL 字样（同形干扰）<!--TODO: 测试命令 + 结果')
- ⚠️ `test/verify-probes-facts.test.mjs:371` assert(PROBE1_HIT_LINE_RE.test('- ⚠️ `src/a.js:9` // TODO: x'), 'PROBE1_HIT_LINE_RE 命中反引号 file:line 形态')

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-03: 模块目录（src/run）递归未找到测试文件（含 co-located tests/）
- ⚠️ task-04: 模块目录（src/stages）递归未找到测试文件（含 co-located tests/）
- ✅ task-05: 模块目录（test）找到 10 个测试文件（test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs、test/align-execute-review-gate.test.mjs、test/apply-merge-wip-autocommit.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3] + artifact 0), 0 frontend calls [scope: change-diff (20 files @ scan-root)] | 2 backend endpoints unused by frontend
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
module 策略子集（P3a 配置沿用，FR-12 聚焦）：test/verify-probes-facts.test.mjs 149/0（CLI --done 对账）；回归 verify-probes 32/0、wait-gates 38/0、verify-postcheck module/worktree 全绿；lint 464 文件 0 未引用导出。known_failures 4 项预存豁免沿用（local.yaml，与 P3b 无关不涉及子集）。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01/03 | 01/04 | facts CLI 全权+层标注+prompt 禁改 | 兑现 |
| D-002@v1 | FR-02 | 02/03 | 分级+正文基准（E3 删 facts 绕不过实证） | 兑现 |
| D-003@v1 | FR-02 | 02/03 | 子节定界/判别子/HEAD 子案/签名补参 | 兑现 |

## 技术债务 [层：人工判断]
探针 1 命中全部为 verify-probes.js 自身的占位符/骨架生成器机制字面量（本变更对该文件的改动不含 TODO）；无新增技术债。

## 变更风险等级 [层：人工判断]
contract-required（verify 门禁行为+facts 契约产物；无 daemon/session/lifecycle/部署路径）。design frontmatter 未显式声明 risk_level。无否定语境抑制命中。

## Runtime Evidence [层：人工判断]
不涉及长驻进程/端点/部署（纯 CLI postcheck 逻辑）。运行时证据=CLI --done 真实对账（test 子集 + lint）+ 机制自举实录：本次 verify --init 由 P3b 新代码生成本报告骨架（含层标注）并落 verify-facts.json（「📝 已刷新 verify-facts.json」CLI 输出）；--done gate 链将首次对本变更自身执行 reconcileTargetFiles（P3b 卡带 target_files 声明）与 checkProbeConsistency（P3b 首个真实消费方）。服务进程登记：不涉及。

## 代码审查 [层：人工判断]
execute 独立审查 pass 12/12（重跑 149+32+38 全绿）。note 级 5 项：envelope 四值（已勘误入 design）、层标注文案微差（语义等价）、1 处测试布尔优先级风格（a&&b||c 实际通过，后续顺手改）、自定义 assert 风格（同仓先例）、verify.js:217「九章节」预存失实（非本变更引入，建议下批清理）。
