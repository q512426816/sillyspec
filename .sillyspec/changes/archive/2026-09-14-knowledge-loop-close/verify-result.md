# 验证报告（骨架由 `sillyspec verify-probes --change <change-name> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES（主仓全量 474/474 + lint 610 文件 0 fail + CLI 实测门禁全绿 + 18 条存量条目真实迁移闭环；notes 为两处已记档的合理偏差与三个非阻断遗留观察）

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
无（5/5 task 均 pass，无 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
- claim: 主仓全量测试套件通过（权威口径，worktree 内 14 个环境性失败已归因为 worktree-cwd 守卫） | command: npm test | exit: 0 | log: .sillyspec/.runtime/verify-logs-knowledge-loop/npm-test.log
- claim: 语法/内容规则/module-map 覆盖检查通过 | command: npm run lint | exit: 0 | log: .sillyspec/.runtime/verify-logs-knowledge-loop/lint.log
- claim: knowledge stats 真实运行出命中矩阵（24 次 classify 命中 + neverHit 死重清单） | command: node bin/sillyspec.js knowledge stats --json | exit: 0 | log: .sillyspec/.runtime/verify-logs-knowledge-loop/stats.log
- claim: 知识库校验 0 错误（18 条迁移后 INDEX 引用完整） | command: node bin/sillyspec.js knowledge validate --json | exit: 0 | log: .sillyspec/.runtime/verify-logs-knowledge-loop/validate.log
- claim: AC-4 存量条目全量迁移——ql 标题行 9 条（--ql 寻址）+ 无标注 9 条（--title 模糊兜底，含验证期新记的 wt-commit 幽灵命令条）全部迁移成功，uncategorized 清零 | command: node bin/sillyspec.js knowledge classify --ql ql-20260709-002-a7c3 --file known-issues.md 等 18 连发 | exit: 0 | log: .sillyspec/.runtime/knowledge-hits.jsonl（18 条 type:classify 审计行）

## 任务完成度 [层：人工判断]
- task-01: 完成（9e6023d）——hits append/read + 动态 import 路由 + available 7 项，review pass
- task-02: 完成（4a7310c）——三通道寻址四步迁移 79/79，review pass
- task-03: 完成（a7e48c0）——提议器+棘轮+抽审 33/33 + preflight 31/31，review pass
- task-04: 完成（9035106）——四注入点 41/41 + include 锁 19/19，review pass
- task-05: 完成（0e63e6f）——stats 矩阵 36/36 + 模块卡同步，review pass
- 主仓合入 daafc2c（18 文件）+ d8fd9ce（四件套+知识沉淀）

## 设计一致性 [层：人工判断]
一致，两处已记档偏差（均非偏离）：
1. execute.js Wave 注入为本地孪生而非共享 prompt.js 助手——ESM 环依赖 TDZ 物理约束（19 个直 import 测试实证），格式等价断言锁漂移（task-04 review + execute 级独立审查均记档）
2. PURE_NEW_CAUSE_RE 拦截面略宽于 requirements 字面（「无，任意后缀」均拦）——保守方向，不制造硬凑提议（execute 级审查记档）
协调者欠账两处均已声明并随 task 提交：_module-map 三新文件补录（design 清单行）、platform-interface-map 4 处行号重锚（task-03 review changedFiles 声明）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stages/execute.js:335` 与 `:483` 两处命中为 **prompt 模板文本**（教 agent「勿手写骨架/替换 TODO 占位」的指引语与 symbol-impact 生成说明），非代码未实现标记——语义判定非债务，存量文本本变更未触碰

#### 探针 2：设计关键词覆盖
- 「归类提议」→ complete-handlers.js extractQuickCauseField/matchKnowledge 渲染链 ✓
- 「classify」→ knowledge-classify.js classifyUncategorizedEntry + stages/knowledge.js 路由 ✓
- 「knowledge-baseline」→ complete-handlers.js renderKnowledgeBaselineRatchet（三态）✓
- 「机械注入/top-3」→ prompt.js buildKnowledgeInjection（KNOWLEDGE_INJECT_MAX_FILES=3）✓
- 「hits.jsonl」→ knowledge-hits.js appendKnowledgeHit/readKnowledgeHits，.runtime/knowledge-hits.jsonl 实存 18+ 条 ✓
- 「stats/命中矩阵/死重」→ knowledge-stats.js buildHitMatrix/neverHit ✓
- 「anchor=标题」→ classify INDEX 路由行实证（known-issues.md#Windows 下 process.exit…）✓

#### 探针 3：验收标准测试覆盖
- 机械面：5 task 均 ✅（预填保留）
- 语义面：4 个新测试文件断言真实文件内容/A/B 字节对比/真实 exit code（非仅"不抛错"空断言）；集成盲区已由 execute 级独立审查者在 worktree 亲测四套件覆盖（79+33+41+36），无未覆盖盲区 ⚠️→✅

#### 探针 4：决策追踪覆盖
- D-001@v1：归类提议（FR-01）→ complete-handlers ✓；classify（FR-02）→ knowledge-classify ✓；棘轮（FR-03）→ renderKnowledgeBaselineRatchet ✓——闭环
- D-002@v1：机械注入（FR-04）→ prompt.js/execute.js/quick.js 三注入点 ✓；stats（FR-05）→ knowledge-stats ✓——闭环
- 见下方矩阵 Evidence 列

#### 探针 5：API Contract Parity
- 机械预填保留（2 端点为既有 scan-root 产物面，非本变更新增端点；warning 不阻断）

#### 探针 6：代码删除对账
- ✅ 无整文件删除（D/R/C）——本变更纯新增+修改

## 测试结果 [层：确定性检查——CLI 实测对账]
- npm test（主仓权威口径）：**474 通过 / 0 失败**（变更前基线 470 → +4 新测试文件：knowledge-classify 79 断言、knowledge-baseline 33、knowledge-inject 41、knowledge-stats 36）
- npm run lint：610 文件（src 130 + test 480）0 fail；module-map 覆盖全（三新文件已录）；未引用导出 0
- worktree 口径 14 个环境性失败：三子代理独立归因 + 主仓根同批测试 288/288、38/38 复跑实证为 worktree-cwd 守卫拦 CLI 子进程（坑 worktree-cwd-silent-split），非代码回归——主仓 474/474 为准
- known_failures 豁免：无

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03 | task-01、task-02、task-03 | FR-01 complete-handlers 提议渲染（33/33 含命中/无形态双态）+ FR-02 classify 18 条真实迁移实证（本报告集成回执）+ FR-03 棘轮三态 33/33 | 已闭环 |
| D-002@v1 | FR-04、FR-05 | task-01、task-04、task-05 | FR-04 注入 41/41（top-3/零字节 A/B/report.json 共存）+ FR-05 stats 真实运行（集成回执 stats.log：24 命中+死重清单） | 已闭环 |

## 技术债务 [层：人工判断]
- 探针 1 两处命中为 prompt 模板指引文本，非债务（见上）
- 遗留观察 1：knowledge validate 对 uncategorized.md 报 unregistered_file warning（预存 wart——uncategorized 是暂存文件本就不该注册 INDEX，候选改进：validate 豁免该文件）
- 遗留观察 2：runtime.changelog.md L28 历史格式瑕疵（ql-20260911-030-bad4 缺 `- ` 前缀，task-05 记档，非本卡范围）
- 遗留观察 3：wt-commit 幽灵命令（runWtCommit 未接线 dispatch）——已按知识生命周期入 uncategorized 并随本次 18 条迁移归位 known-issues.md；根治（补 dispatch case）建议走独立 quick

## 变更风险等级 [层：人工判断]
integration-critical（design 判级继承：命中 lifecycle 关键词且被同句否定语境抑制——本变更不新增 daemon/session/lease/heartbeat，豁免短语「不涉及生命周期契约」为 design 自审明示）。显式声明 = 未覆盖（接受判级）。证据面：CLI 子进程级集成测试四套件 + 真实 classify 迁移 18 条 + stats/validate 真实运行回执，满足 integration-critical 证据门控。

## Runtime Evidence [层：人工判断]
- 长驻进程启动命令：不涉及（纯 CLI 短进程，无 daemon/server）
- 触碰的服务端点：不涉及（platform sync 走既有链路，本变更无新端点）
- 触发核心路径的请求：不涉及 HTTP；核心路径触发证据=classify 18 连发全链路（CLI 入口→路由→动态 import→迁移→hits 审计落盘）
- 进程日志关键片段：.sillyspec/.runtime/verify-logs-knowledge-loop/{npm-test,lint,stats,validate}.log 四份（verify 窗口内，尾部无失败签名）
- 生命周期终态断言：uncategorized 18→0 条终态；knowledge-hits.jsonl classify 记录 18 条；INDEX 路由行新增 18 条经 parseKnowledgeIndex 反解验证；无服务进程需回收（pids 文件不涉及）
- 失败模式排除：①提议器 fail-open（try/catch 包裹，异常零输出不影响 --done 主流程）②注入 hits 落盘 fail-soft（写失败不阻断 prompt 组装）③棘轮写失败降级 steady 不谎报收紧——三失败模式均有测试断言覆盖

## 代码审查 [层：人工判断]
- execute 级独立审查（agent-tool 通道）：5 FR 全 pass、非目标越界检查零违规、diff 面 18 文件 +2287/-16 与 design 清单吻合
- task 级 5 份 review 全 pass（敏感回归 concurrent-preflight-hooks 31/31、include 计数 19/19 均未破）
- 总体评价：五子机制按设计交付，契约（KnowledgeHitsAPI）跨 wave 消费无缝，两处偏差均有物理约束依据与防漂移锁
