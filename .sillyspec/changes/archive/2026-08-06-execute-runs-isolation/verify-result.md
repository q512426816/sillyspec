---
author: qinyi
created_at: 2026-08-06 15:50:00
---

# 验证报告（Verify Result）

## 结论
PASS

## 任务完成度
100%（5/5 task 全部完成 + 验收通过）

- ✅ task-01：resolveRuntimeRoot helper 抽取（src/run/shared.js，三级优先级 runtimeRoot > specDriftAnchor > 本地兜底）+ drift 守卫补设 `platformOpts.specDriftAnchor = wt.mainSpecBase`（command.js if(wt) 块）。手测 6/6 OK，纯函数无副作用。
- ✅ task-02：13 处调用站点统一改调 resolveRuntimeRoot（11 A 类公式站点 + gates.js:219 B 类解析点 + complete-handlers.js:558 瑕疵1）。grep 旧公式 0 残留；contract-matrix 函数内 3 处兜底公式（:146/:217/:334）保留作防御（未被改调）；machine-interface.js:184/402 defer（非事故链必经，design 文末留 plan 拍板）。8 文件 node --check + 动态 import 8/8 OK。
- ✅ task-03：test/execute-runs-isolation.test.mjs T-01..T-08，31 断言全过（drift 落主仓 fs 集成 / cleanup 存活 / stage-reviews 路径 / 多 change 隔离 / sentinel 边界 D-02 / 非 drift 零回归 / 平台零回归 / 非 drift quick + 手动 anchor 一致性）。
- ✅ task-04：docs/sillyspec/file-lifecycle.md（updated_at + drift 落点 + resolveRuntimeRoot 公式）+ 模块卡 runtime/worktree/cli-entry 补 specDriftAnchor + resolveRuntimeRoot。docs/prompt/ 与 .claude/skills/ 经核实不改（只改 runtimeRoot 解析非 prompt 文案/路径格式）。
- ✅ task-05：npm test 全绿（EXIT=0，含 T-01..T-08 + 既有套件零回归）+ npm run lint 通过（68 文件）。

## 设计一致性
对照 design.md（方案 A specDriftAnchor）逐项核对，实现与设计一致：

- §4.1 新增字段 `platformOpts.specDriftAnchor`：drift 守卫设 `= wt.mainSpecBase`；不设 specRoot/runtimeRoot（避免平台 sentinel 副作用，D-02）。✓
- §4.2 resolveRuntimeRoot 三级优先级公式：`runtimeRoot > specDriftAnchor > join(localSpecBase,'.runtime')`，与 src/run/shared.js 实现逐字一致。✓
- §5.A 11 处 A 类公式站点 file:line 全改调 resolveRuntimeRoot（grep 残留 0）。✓
- §5.B contract-matrix B 类：gates.js:219 parity 先 resolveRuntimeRoot 再传 runVerifyParityCheck；contract-matrix 函数内兜底保留作防御（不被 drift 场景命中）。✓
- §5.C 消费/透传站点不改：complete.js:246 scan-runs 平台专用、stage-review.js:345 消费已解析 runtimeRoot、scan-postcheck.js:337 scan 平台专用。✓
- §6 字段数据流：producer=command.js drift 守卫 → platformOpts 透传 → consumer 15 站点经 resolveRuntimeRoot。✓
- §7.1 drift 守卫只加 1 行字段（minimal intrusive，D-01）。✓
- §8 T-01..T-08 用例全部落地。✓
- §9 AC-1..AC-8 达成（T-01/02 验 drift 落主仓 + cleanup 存活；T-05 验 sentinel 不误触发；T-04 验多 change 隔离；T-06/07 验平台本地零回归；AC-7/8 npm test + lint）。✓
- 偏差说明：machine-interface.js:184/402（B 类毗邻残留旧公式 `runtimeRoot || join(specRoot,'.runtime')`）按 design 文末「待 plan 拍板」defer，非 execute-runs/stage-reviews 事故链必经路径，QA 已记为 gap（可接受，unit-sufficient 风险级下不阻断）。

## 探针结果
- 未实现标记扫描：变更文件无遗留 TODO/FIXME/未实现标记。✓
- 关键词覆盖：design 核心关键词（specDriftAnchor / resolveRuntimeRoot / runtimeRoot）在源码 + 文档全部落地。✓
- 测试覆盖：T-01..T-08 覆盖 drift 落主仓 / cleanup 存活 / stage-reviews / 多 change / sentinel / 平台 / 本地 / quick 全场景；既有套件零回归。✓
- 决策追踪覆盖：D-01..D-06 → FR-01..08 → task-01..05 → evidence（测试/文档）全部闭环。✓
- API 契约对账：纯 CLI 内部变更，无后端 API；contract-matrix parity（verifyApiParity）在 drift 场景经 gates.js:219 resolveRuntimeRoot 读主仓 contract-artifacts。✓
- 代码删除对账：本变更无删除文件（git diff --name-status 仅 M + 新增测试文件），清单一致。✓

## 决策追踪矩阵（design §12 D-01..D-06）
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-01 方案 A | FR-01/02 | task-01 | command.js drift 守卫 + shared.js resolveRuntimeRoot；T-01/02 | PASS |
| D-02 新字段 specDriftAnchor | FR-07 | task-01/03 | sentinel 检查形式 specRoot\|\|runtimeRoot 不含 anchor；T-05 | PASS |
| D-03 否决方案 B | NG-3 | — | cleanup 9 调用点 + rmSync 全不改 | PASS |
| D-04 复用 detectWorktreeSpecDrift 范式 | FR-01 | task-01 | drift 守卫只补 1 行字段 | PASS |
| D-05 unit-sufficient + resolveRuntimeRoot + 8 用例 | AC-7 | task-01/02/03 | T-01..T-08 + npm test | PASS |
| D-06 文档同步 | NFR-04 | task-04 | file-lifecycle + 模块卡 | PASS |

## 测试结果
- `npm test`：全绿 EXIT=0。119+ 测试文件全部通过（含新增 execute-runs-isolation.test.mjs T-01..T-08 31 断言 + 既有套件零回归）。无「失败文件」行、无 non-zero exit。
- `npm run lint`（check-syntax.mjs）：68 个 JavaScript 文件检查通过，0 错误。
- 语法/加载：8 个改动文件 node --check OK + 动态 import 8/8 OK（无环依赖/解析错误）。

## 技术债务
- 无新增 TODO/FIXME/HACK/XXX。
- 遗留（QA 已记 gap，非阻断）：
  1. machine-interface.js:184/402 旧公式残留（defer，非事故链；建议后续单独 change 统一）。
  2. producer 侧（drift 守卫设 specDriftAnchor）无直接断言测试：consumer 侧 resolveRuntimeRoot 三级优先级由 T-01..T-08 全覆盖，但「drift 守卫运行后 specDriftAnchor 确实被设」无单测硬证（接线靠 grep/读码核实）。既有 worktree-execute-spec-drift.test.mjs e2e（2026-08-05 创建）仅覆盖 specBase 锚定（--status 只读路径，grep specDriftAnchor 0 命中），**未覆盖**本变更新增的 specDriftAnchor/runtimeRoot 重定向链。unit-sufficient 风险级下可接受；建议后续补 producer 侧 e2e 硬证断言（drift 场景跑真实 execute step，断言 marker 落主仓 .runtime 而非副本）。

## 变更风险等级
**risk_level 由 design frontmatter 显式声明 = unit-sufficient**（覆盖关键词判级）。
理由：本变更是确定性路径解析逻辑（runtimeRoot 公式统一 + 1 个新字段），无并发/IO 竞态/外部依赖/生命周期事件，单元测试充分覆盖（T-01..T-08）；不涉及 daemon/跨进程/session/lease 状态机/部署路径，无需 integration-critical 的 Runtime Evidence。

## Runtime Evidence
不适用（unit-sufficient，非 integration-critical/deployment-critical）。

## 代码审查
- 风格：符合项目 ESM + 中文注释惯例；import 按既有列表追加 resolveRuntimeRoot，无重复/未用。
- 正确性：resolveRuntimeRoot 纯函数无副作用（手测 no-mutate）；drift 守卫只加字段不改控制流（D-01 minimal）；15 站点统一调用避免公式漂移（R-01 缓解）。
- 边界：platformOpts null/undefined 安全（?.）；quick 场景不扩 drift 守卫（T-08）；平台 runtimeRoot 优先（T-07）。
- 安全/冗余：无新增风险文件改动；specDriftAnchor 与 sentinel 字段语义隔离（D-02）。
- 总体评价：实现忠实落地 design 方案 A，改动面精确、可维护性提升（单点维护 .runtime 根解析）。
