---
author: qinyi
created_at: 2026-11-14 22:03:09
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI（sillyspec 运行时） | 增量探测、计划计算、对账、基线推进、降级判定——确定性计算全归 CLI |
| 主 agent（scan 编排者） | 读取增量计划，按计划分派子代理，跳过未受影响面 |
| 子代理 | 只为受影响模块/篇章重生成文档（既有 scan 子代理范式的增量收窄） |
| 用户 | 既有交互点不变（扫描项目列表确认/模块卡覆盖风险确认） |

## 功能需求

### FR-01: 增量模式自动判定
Given 仓内有就绪 CodeGraph 索引（probeCodegraph available）且 scan 基线存在
When 用户运行 `sillyspec run scan`（不带显式 profile/force flag）
Then CLI 在既有 noAI 探测步输出路径判定（⚡增量：N 模块受影响 / M 篇章跳过 / 对账 X 未归属——一次给全依据），增量计划落盘 `.sillyspec/.runtime/scan-incremental-plan.json` 供编排各步与收口共读

### FR-02: 受影响归属与选择性重生成
Given 基线..HEAD 变化文件经 `matchFilesToModules` 归属到模块集合 A
When 增量路径执行
Then 只重生成 A 中模块的模块卡与映射增量条目；篇章按影响映射（结构信号→STRUCTURE/ARCHITECTURE，路由信号→INTEGRATIONS，证据不明确保守归入）；未受影响模块文档与未命中篇章零变化

### FR-03: 降级链零回归
Given 未装 CodeGraph / 无索引 / 探测失败 / 超时 / 输出不可解析
When 运行 scan
Then 自动回退现行全量路径（一行警告留痕原因），产物/退出码/流程与改动前版本一致，绝不阻断

### FR-04: _module-map 对账报告
Given 索引全量文件清单（files flat，排除 .sillyspec/node_modules/构建产物等非源码前缀）与模块 paths 覆盖集
When 增量计划计算
Then 未归属文件清单与覆盖率落盘 `docs/<project>/scan/_module-map-audit.md`（`_` 前缀非基线载体，不参与 staleness/refresh 门控）

### FR-05: 基线推进兼容
Given 增量 scan 正常完成（postcheck 通过）
When executeScanFinalize 增量分支执行
Then 重生成文档由 stampScanDocHeaders 盖章、未受影响文档经 bumpScanDocBaselines 推进——全部基线载体文档 source_commit 统一至 HEAD，generator 标注 sillyspec-scan-incremental；此后 scan-staleness 判定 fresh、scan-diff 零漂移

### FR-06: 软门回退
Given 漂移超限（scope 内变更 >100 文件或落后 >200 commit，对齐 REFRESH_SOFT_GATE 语义）
When 计划计算
Then 返回全量建议并留痕（`--force-incremental` 显式可越）

### FR-07: flag 登记与指引
When 用户传 `--incremental`（显式请求增量，探测不可行时警告留痕+回退全量不 exit 非 0）或 `--force-incremental`
Then 两 flag 进入白名单与帮助文本，报错指引有效（防「指引指向未登记 flag」死路）

### FR-08: 既有测试零回归
When 变更测试面运行
Then scan-diff / scan-staleness / scan-refresh / scan-postcheck 既有测试零改动零失败；scan-refresh 命令面与行为不变

## 非功能需求
- 兼容性：Windows（.cmd shim 解析）/Linux/macOS 跨平台；Node 无新运行时依赖（child_process 既有面）；多 agent 并行下 `.runtime/scan-incremental-plan.json` 原子写（writeAtomicSync 既有惯例）
- 性能：增量判定秒级（status 一次 + git diff 一次 + 内存映射；探测/计划合计预算 <5s，超时降级全量）
- 可观测性：路径判定原因一次给全；计划快照与对账报告留档可追溯

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-02, FR-08 | 与 refresh 互补边界：检出单源复用、refresh 命令面不动 |
| D-002@v1 | FR-03, FR-06 | 降级链零回归（探测失败回退全量留痕） |
| D-003@v1 | FR-01, FR-07 | 方案 A 缺省自动判定 + flag 兜底 |
| D-004@v1 | （rejected 防复潮） | 方案 B 落选——缺省全量形态不实现，无覆盖 FR |
| D-005@v1 | （rejected 防复潮） | 方案 C 落选——refresh 工单扩大版不实现，无覆盖 FR |
| D-006@v1 | FR-01, FR-02 | guard 握手 mode='scan-incremental'（白名单放行/外拦截，未受影响面保护） |
| D-007@v1 | FR-01 | 探测落点=命令启动入口层三档统一；quick 深度回退全量 |
| D-008@v1 | FR-04 | .sillyspec-codegraph 三层隔离（排除常量/warnings 提示/本仓 gitignore） |
| D-009@v1 | FR-02 | 增量模式豁免模块卡覆盖等待（授权链=计划+路径输出+guard 边界） |

## 测试绑定（每条 FR 至少一行：`FR-NN: test/路径「用例名」`；不适用要写理由；flow done 空行拒收）

FR-01: test/scan-incremental.test.mjs「增量计划：归属+篇章映射+guardDocs 产出」+ test/scan-incremental-wiring.test.mjs「guard 白名单内（重生成篇章文档）→ 放行」
FR-02: test/scan-incremental.test.mjs「增量计划：归属+篇章映射+guardDocs 产出」「无结构信号（模块内 M 文件、无 unmapped、无路由）→ 篇章全跳过」+ test/scan-paths.test.mjs「scan.js 注入段含 token 断言组」
FR-03: test/scan-codegraph.test.mjs「probeCodegraph：命令不存在（ENOENT）→ available:false 中文原因」等五类降级用例 + test/scan-incremental.test.mjs 六类 full 回退用例（绿地/无基线/git 失败/非祖先/quick/软门）
FR-04: test/scan-incremental.test.mjs「isExcludedPath：索引目录/node_modules/构建产物排除」「对账：listIndexFiles mock → uncovered 不含被排除项，报告落盘」
FR-05: test/scan-incremental-wiring.test.mjs「bumpScanDocBaselines：docs=SCAN_REQUIRED_DOCS + generator=sillyspec-scan-incremental → 存在的载体统一推进」
FR-06: test/scan-incremental.test.mjs「软门超限（落后 >200 commit）→ mode full；forceIncremental 越过 → incremental+warning」「软门超限（scope 内变更 >100 文件）→ mode full」
FR-07: test/scan-incremental-wiring.test.mjs「command.js 双处登记：knownFlags 白名单 + printStageUsage 帮助文本（防未登记 flag 死路）」
FR-08: test/scan-diff.test.mjs / test/scan-staleness.test.mjs / test/scan-refresh.test.mjs / test/scan-postcheck.test.mjs（四既有套零改动零失败——verify-evidence 验收 4：七套 85/85+ 全绿，审查独立复验 87/87）
