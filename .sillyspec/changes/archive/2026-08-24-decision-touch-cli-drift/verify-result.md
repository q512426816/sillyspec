# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论必须写明 PASS / FAIL**——
> 留「待填」会被 gate 判不过（fail-closed）。

---
author: qinyi
created_at: 2026-08-24T09:05:00+08:00
---

## 结论：PASS（2/2 任务双审 pass、302 文件 0 失败、探针全误报裁决、双轨/双渲染点均有真实端到端实证）

## 任务完成度
- task-01 ✅（22/22 用例：精确/子路径/行号符号剥离/仅 implemented/空库/零触碰/双渲染点实测/computeDocsDebt 逐字锁定）
- task-02 ✅（doctor 六步不变；11 fixture 双轨场景实测；镜像 doctor 段 0 miss）

## 设计一致性
与 design（Grill 修订版）一致：D-003 双渲染点（Wave 步为主）落地为 buildWavePrompt 的 decisionTouchSection；D-004 双轨落地为 doctor 内嵌脚本 git+version；无偏差。

## 探针结果（CLI 机械预填）
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `docs/prompt/_extracted.json:163` "prompt": "运行代码质量扫描（测试实测统一由 CLI 对账执行，本步不重复手动跑全量）。\n\n### 操作\n1. 读取 `.sillyspec/local.yaml` 获取构建、测试和 lint 命令若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取\n
- ⚠️ `docs/prompt/_extracted.json:170` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描关键词。本步骤 --done 时，CLI 会用 detectChangeR
- ⚠️ `docs/prompt/_extracted.json:259` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：`{DOCS_ROOT}/flows/`\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:532` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:573` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:635` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md\n 
- ℹ️ 清单文件不存在（跳过）：test/decision-touch.test.mjs

#### 探针 2：设计关键词覆盖
关键词全覆盖：computeDecisionTouches/anchorFilePath 导出（docs-check.js:710 export 实证）/双渲染点（run/prompt.js {DOCS_DEBT} 块 + execute.js buildWavePrompt）/仅 implemented 过滤/≤5 截断/安装根独立解析（doctor.js 内嵌脚本不复用 SRC_ROOT——注释实证）/git+version 双轨/remote 归一化/npm link 静默——全部 grep+用例实证。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、src/run、src/stages、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ⚠️ task-02: 模块目录（src/stages、docs/prompt）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 4：决策追踪覆盖
D-001（方案A）→两任务结构本身；D-002（并入段）→doctor 六步断言实证；D-003（Wave 主渲染）→buildWavePrompt 实测；D-004（双轨）→11 fixture 实测。4/4 闭环。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 1 backend endpoints (live 1 + artifact 0), 0 frontend calls [scope: change-diff (12 files)] | 1 backend endpoints unused by frontend
- ⚠️ 1 个后端端点前端未调用（warning 不阻断）：GET prefix/path

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果
- npm test（worktree 9483472）：302 文件 0 失败（含新增 decision-touch 22 用例）
- node --test test/decision-touch.test.mjs 22/22；doctor 相关 8 文件 25/25；docs-debt/prompt 相关 18/18
- docs check --fix 后引用失效清零（platform-interface-map/prompt-control-debt 行号重锚）
- known_failures：无

## 决策追踪矩阵（如存在 decisions.md；无则删本节）
<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->

## 技术债务
探针 1 的 6 处命中均为 _extracted.json 镜像 JSON 中 prompt 文本字样（"TODO/FIXME"为指引词），非未实现标记——误报。真实新增技术债 0。

## 变更风险等级
unit-sufficient（scale=small，无服务/守护/部署面；prompt 渲染与探测脚本均有真实 fixture 实测）。「生命周期」关键词命中来自设计文本豁免声明，非运行时状态机。

## Runtime Evidence
1. 双渲染点端到端（integration test 级）：buildWavePrompt 真实调用有触碰输出事实行、无触碰/无库零输出（test/decision-touch.test.mjs 双渲染点用例）；outputStep console 捕获实测 {DOCS_DEBT} 注入含触碰行
2. doctor 双轨 11 fixture：version 不一致→警告触发；ssh/https+.git 后缀+host 大小写归一后同源 HEAD 不同→git 轨警告；非 sillyspec 仓/无全局安装/version 一致/非同源/同 HEAD→静默；孤儿 bin/.git 损坏→降级单行；真机主仓 npm link 自身→静默不误报
3. 真实库冒烟：触碰 src/quicklog.js → 正确输出 D-905@v1（锚点 src/quicklog.js）
4. commit：worktree 9483472（2026-08-24），npm test 302/0
不涉及：服务启动/守护进程/容器。

## 代码审查
无阻断问题。实现质量：changedFiles 公共口径抽取为 collectExecuteChangedFiles 防双写漂移（好）；探测脚本 stdio 抑制 git 噪音；computeDocsDebt 逐字锁定测试防回归。
