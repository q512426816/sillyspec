# 模块影响分析（首版，plan 审查计划步生成；影响类型列 execute/verify 按实际 diff 回填）

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| runtime | `src/run/prompt.js` | 逻辑变更（M1 指纹分流渲染，W1 已落地：computeStepGuideFingerprint+复入短输出+SILLYSPEC_STEP_GUIDE=1 显式开启） | W1 已审（task-01 pass） |
| runtime | `src/run/gate-snapshot.js` | 逻辑变更（M2 分叉态取 worktree，W1 已落地：仅 ③态翻转+警告对齐指引；连带更新 gate-snapshot-ancestor-trim 期望） | W1 已审（task-02 pass） |
| stages | `src/stages/execute.js` | 逻辑变更（M3 分组注入 W2 已落地：派发段推荐分组行+互斥+零注入；M4 main 渲染分支 W3 已落地：直写指引/工作目录直写变体/四段抑制，黄金快照 6 形态零回归实证） | W2/W3 已审（task-03/04 pass） |
| stages | `src/stages/plan.js` | 配置变更（W3 已落地：light/full 模板 execution_mode 注释键+执行模式声明判据话术） | W3 已审（task-04 pass） |
| stages | `src/stages/plan-postcheck.js` | 新增（W2 已落地：recommendWaveGroups 导出纯函数+collectCardBatchFacts 转导出（execute.js 复用无二源）+判定①文案附推荐分组 append-only） | W2 已审（task-03 pass） |

## 执行期发现（verify 前需处置）

- ~~`test/verify-gate-snapshot.test.mjs:146` 钉 ③态取主仓旧语义~~ → **W4 已收口**（D-005①按 D-002@v2 翻转期望，5/5 绿）
- ~~`docs/sillyspec/platform-interface-map.md:L109` 锚漂移~~ → **W4 已收口**（D-005②重锚 execute.js:1300）
- ~~design 清单漏列 modules/runtime.md~~ → **W4 已收口**（D-005③runtime 卡 M1/M2 行为行+changelog 落盘）
- ~~`docs/sillyspec/prompt-control-debt.md:L209` 锚 prompt.js:910 存量漂移~~ → **W4 已收口**（D-005④重锚 prompt.js:1399）

## 未匹配文件（终审计入——25 文件真实 diff 逐项归因）

本变更交付面（16，worktree 统一提交 58295633）：
- `test/step-guide-fingerprint.test.mjs`、`test/gate-snapshot-lineage.test.mjs`、`test/plan-grouping-recommend.test.mjs`、`test/execution-mode-render.test.mjs`（四新测试）→ 共位测试，非模块索引缺口
- `test/gate-snapshot-ancestor-trim.test.mjs`、`test/verify-gate-snapshot.test.mjs` → task-02/D-005① 连带期望翻转，共位测试
- `docs/prompt/plan.md`、`docs/prompt/execute.md`、`docs/prompt/_extracted.json`（三镜像）→ DYNAMIC 策展面+机械生成，非模块索引缺口
- `docs/sillyspec/platform-interface-map.md`、`docs/sillyspec/prompt-control-debt.md` → D-005②④ 重锚连带面

主仓面交付（.sillyspec 产物，铁律写主仓、经显式 pathspec 提交）：
- `modules/runtime.md`、`modules/runtime.changelog.md`、`modules/stages.md`、`modules/stages.changelog.md` → 模块文档自身（W4 更新，主仓提交 0e0bf6cf；见「更新结果」表）
- `knowledge/uncategorized.md` → 知识沉淀两条（镜像时代路径坑+快照分叉鸡生蛋坑），主仓提交 0e0bf6cf/c1d22063

并行会话归因排除（非本变更产出，主仓 118bb92f「R5 优化接线三件」）：
- `src/index.js`、`src/run/complete.js`、`test/r5-wiring-three.test.mjs`、`src/stages/execute.js`（+1 行评审铁律文案）→ 他者 quick 提交，apply 时 3-way 合并吸收（区域不重叠）

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/runtime.md` | 增补 M1 指纹/M2 快照血统行为行 | done（W4；主仓提交 0e0bf6cf——三重核对 diff 口径为 worktree 提交面故显「diff 无」，实际交付在主仓面） |
| `modules/runtime.changelog.md` | 追加 batch2 条目 | done（W4；同上主仓面） |
| `modules/stages.md` | 增补 M3 分组/M4 execution_mode 行为行 | done（W4；同上主仓面） |
| `modules/stages.changelog.md` | 追加 batch2 条目 | done（W4；同上主仓面） |
| `modules/core-engine.md` | 无需（recommendWaveGroups 落 plan-postcheck.js=stages 域，_module-map 映照核实；target_files 声明已按 verify 通道修正移除） | n/a |
| `_module-map.yaml` | 无需增改（未匹配文件全为共位测试/镜像/文档/并行归因排除，无新模块路径） | n/a |
