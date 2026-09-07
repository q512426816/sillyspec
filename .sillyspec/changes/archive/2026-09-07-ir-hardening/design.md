---
author: qinyi
created_at: 2026-09-07 22:55:10
scale: large
---

# 设计文档（Design）— 2026-09-07-ir-hardening

## 背景

IR P3a–P3d 已全部落地（target_files 对账 / verify 探针一致性 / 决策模块域核验 / archive delta），但四条链各留一个「存量兼容豁免」或断点，使 IR 核验对不配合的 agent 实际是**可选项**：

1. **P3b 可绕过**：agent 不跑 `verify-probes --init` → verify-result.md 无探针子节 → `checkProbeConsistency` 判 skipped 零红（判别子 D-003 的存量兼容分支）。
2. **P3a 可绕过**：task 卡全部不声明 target_files → `reconcileTargetFiles` 判 skip（存量零红门禁）——scope creep 检出对「整变更零声明」失效。
3. **design 清单无行级核验**：task 卡 target_files 有「幻觉路径 ERROR」先例（plan-postcheck validateTargetFiles），但 design.md 文件变更清单同款幻觉不报（design-file-coverage 方向相反，只对账 allowed_paths 覆盖）。
4. **delta 链两处断**：`sillyspec delta --change` 手动补跑硬编码 project=null → 模块归属恒降级；种子稿 P3d 回灌①（增量 scan 联动）只有建议文字无机器接线。
5. **supportedFixes 无机器证明**：诊断信封已有 supportedFixes 字段，但修复建议是否真能消除诊断无试跑回执（archify 机制 4 未落地）。

## 设计目标

- 新变更（created_at ≥ IR_STRICT_SINCE）的 P3b 探针段缺失与 P3a 零声明从「skip 放行」升级为 **ERROR 阻断**；存量变更豁免语义**零变化**。
- design.md 文件清单获得与 target_files 同级的行级核验（幻觉路径 ERROR / `NEW:` 豁免）。
- delta 手动补跑与归档自动路径模块归属同口径；delta 落 sidecar，scan 启动时输出增量核对 advisory。
- `docs check --fix` 输出「修复前失效数 → 重锚数 → 修复后失效数」机器回执；引用类诊断 supportedFixes 全部为可逐字执行的 CLI 命令。

## 非目标

- 不做通用 acceptsFix 框架（诊断信封五字段全量 + 任意诊断试跑器）——两件最小件用稳后独立立项（D-007）。
- 不做 scan facts / scan 文档的模块级增量刷新——涉及 scan 生成侧拆分与 staleRefs 基线联动，独立 change（D-006）。
- 不动跨仓 task 的 target_files 对账口径（全跨仓 skip 维持）与 review write 跨仓守卫。
- 不收紧部分声明场景（部分卡未声明维持 WARNING，灰度语义）。

## 拆分判断

四件改动共享一个闸门常量与一个访问器（Wave 1），其余三件互相独立可并行（Wave 2），docs 回执独立（Wave 2）。总计 12 文件修改 + 4 测试新增，无批量模式特征（非同构产物），走常规 change。

## 总体方案

### Wave 1：闸门层（一切收紧的前提）

`src/constants.js` 增 `IR_STRICT_SINCE = '2026-09-07'`（ISO 日期字符串，与 changes.created_at 的 `toISOString()` 写入口径一致，字符串字典序比较即确定）。`src/progress/change-registry.js` 增只读访问器 `getChangeCreatedAt(cwd, changeName)`（读 changes 表 created_at，变更不存在返回 null），ProgressManager 透传。判定 helper `isStrictChange({ pm, cwd, changeName })`：created_at ≥ IR_STRICT_SINCE → true；读不到（无行/异常）→ false（fail-open 落存量豁免，不误伤）。

### Wave 2A：P3b/P3a 两档收紧（gate 语义）

- `checkProbeConsistency` 增 `opts.strictMode`：探针子节全缺且无 verify-facts.json 时——strictMode=true → `finish('mismatch', 'error', [{ probe: 'prefill', code: 'probe_prefill_missing_strict', note: 指引跑 verify-probes --init }])`；false → 既有 skip 原文不变（skipReason 加注「闸门前变更」）。「facts.json 在场而子节全缺」既有 ERROR 分支不受 strictMode 影响。
- `reconcileTargetFiles` 增 `opts.strictMode`：**主仓卡全部零声明**（noDeclarationCount > 0 且 == cardCount - 跨仓卡数——Grill P2-④采纳：混合「跨仓卡+主仓卡全零声明」形态也触发，跨仓卡不参与计数也不充当豁免）——strictMode=true → 返回 `{ status: 'skipped', strictViolation: { code: 'target_files_all_missing_strict', message: 指引逐卡 Edit 填 target_files（taskcard 骨架已预置字段） } }`；false → 既有 WARNING skip 不变。部分声明 / 全跨仓两分支任何模式都不变。
- `runStageCompletionGates`（gates.js verify 块）两处消费点由调用方传入 strictMode（`isStrictChange` 计算）；strictViolation 存在 → 按 ERROR 处理（rollback + exit 1）。**信封/打印层同步改造**（Grill P2-②采纳）：`buildProbeConsistencyEnvelope`（gates.js:1385）的 code 硬路由（status×severity 四定值）增 strict 识别——`probe_prefill_missing_strict` / `target_files_all_missing_strict` 独立 code；`printReconcileTargetFilesCheck`（:1361）对 skipped 恒 warn 的分支识别 strictViolation 转 ERROR 文案。reconcile-result.json 落盘为 additive 字段（archive-delta 消费方只读 change/matched/undeclared，不受影响）。strict P3b 的 mismatch 条目带全量契约字段 `{ probe, code, expected, actual, severity, note }`（print 层 evidence 计数依赖）。

### Wave 2B：design 清单行级核验（brainstorm gate）

`src/design-facts.js` 增纯函数 `validateDesignFileList({ changeDir, cwd })`：`parseFileChangeListDetailed(join(changeDir,'design.md'), { keepSillyspecDocs: true })` 逐条目核验（`.sillyspec/` 交付物路径**在核验范围内**，Grill P2-⑤言明）；条目分级——`NEW:` 前缀（解析器不剥前缀，直接 startsWith 判）或路径存在（cwd 相对 `existsSync`）→ 通过；**含 glob 字符（`*`/`?`）→ warning 跳过**（pathMatches 体系本就支持 glob 合法形态，existsSync 恒 false 会假 ERROR——fail-soft）；`<...>` 占位段归一化剥除后再判；不存在且无前缀/glob → errors.push `{ path, message }`（信封 code `design_file_ref_invalid`）；design.md 无清单段 → warning（small 变更可无清单）；解析异常 → warning 不阻断。挂点 `run/complete.js` brainstorm 末步（决策模块域核验 D-002@p3c 同点位）：errors 非空 → 阻断完成（exit 1，指引修 design 清单或补 `NEW:` 前缀）。

### Wave 2C：delta 同口径 + 回灌 sidecar

- index.js `delta` case：project 从 `progress.project` 读（ProgressManager 同源），null 兜底降级注记不变——手动补跑与归档自动路径自此同口径（D-005）。
- `src/archive-delta.js`：`buildDeltaReport` 增可选结构化返回 `{ withSummary: true } → { markdown, change, affectedFiles, affectedModules }`（affectedFiles=matched+undeclared/deliverables 兜底、affectedModules=module-map 归属，均复用函数内既有推导，单一真相源——Grill P2-③采纳，防调用点重推口径漂移）；新增 `writeLastDeltaSidecar(runtimeRoot, summary)` 消费该结构化返回，落 `.runtime/last-delta.json`（schema `{ schemaVersion: 1, change, affectedModules, affectedFiles, updatedAt }`）。delta 生成两路径（index.js delta case + complete-handlers 归档确认步）都写（幂等覆盖，写失败 fail-soft 不阻断 delta 生成）。
- `src/run/scan-profile.js` `executeScanResumeCheck`（scan 步骤 4「断点续扫检测」noAI 动作，Grill P2-⑦措辞修正）：存在 sidecar 且 updatedAt 在 14 天内 → 打印 advisory「上次归档变更 <change> 涉及模块 <modules>——本轮 scan 优先核对其文档与 staleRefs」；缺失/过期/解析失败静默跳过（advisory 不阻断不改变步骤结构，D-006）。

### Wave 2D：acceptsFix 最小件

- `docs check --fix` 路径输出**修复回执**：fix 前失效计数（既有检查阶段产出）→ applyFixes 重锚数（既有）→ **fix 后失效计数**（applyFixes 后重跑一次失效收集）——「修复后剩余 N 处（消除了 M 处）」即机器试跑证明。回执仅在 --fix 路径输出，--dry-run/纯检查路径零变化。
- 引用失效类诊断 supportedFixes 逐条核对为**可逐字执行命令**（范围收缩：仅 scan-postcheck 侧——docs-gate.js 的 ratchet 聚合消息本就不逐诊断、无 supportedFixes 结构，不新建机制，Grill P1 审查采纳方案①）：scan-postcheck scan_doc_ref_invalid 的两条 supportedFixes 均改写——候选锚点指引 `sillyspec docs check --paths <file> --fix`（现存 `--suggest` 旗标已核实为置位后无消费者的 no-op，指引一并纠正）、「删除无法核验的引用」条目改可执行核验前置（先跑 check 确认零候选再删）。禁止「查看/考虑/评估」类不可执行文案。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/constants.js | IR_STRICT_SINCE 常量（单一事实源） |
| 修改 | src/progress/change-registry.js | getChangeCreatedAt 只读访问器（读 changes.created_at） |
| 修改 | src/progress.js | ProgressManager.getChangeCreatedAt 透传 |
| 修改 | src/verify-postcheck.js | checkProbeConsistency/reconcileTargetFiles 增 strictMode 档 + isStrictChange helper |
| 修改 | src/run/gates.js | verify 块两消费点传 strictMode + strictViolation → ERROR 阻断 |
| 修改 | src/design-facts.js | validateDesignFileList 纯函数（幻觉路径 ERROR / NEW: 豁免） |
| 修改 | src/run/complete.js | brainstorm 末步接线 design 清单核验（决策模块域同点位） |
| 修改 | src/index.js | delta case project 修复 + delta 生成处 sidecar 写入 + docs check --fix 回执接线 |
| 修改 | src/docs-check.js | --fix 后重跑失效计数（回执数据源） |
| 修改 | src/archive-delta.js | writeLastDeltaSidecar 导出 + affectedModules 派生 |
| 修改 | src/run/scan-profile.js | executeScanResumeCheck 读 sidecar advisory |
| 修改 | src/run/complete-handlers.js | 归档确认步 delta 生成处补 sidecar 写入 |
| 修改 | src/scan-postcheck.js | 引用类诊断 supportedFixes 可执行化 |
| 修改 | test/_cli-step-harness.mjs | 执行期偏差：initChange 存量 created_at 回填（既有用例锁存量豁免路径） |
| 修改 | test/_complete-step-harness.mjs | 同上（双 harness 同款） |
| 修改 | test/design-facts.test.mjs | 执行期偏差：writeCompleteArtifacts 按清单行落盘 stub（清单核验 gate 上线） |
| 修改 | test/docs-check-cli.test.mjs | 执行期偏差：--suggest 退役 + 💡 默认开的契约断言更新 |
| 修改 | test/docs-check-fix.test.mjs | 执行期偏差：S7 对照断言更新（💡 行过滤后逐字节一致 + --suggest exit 2） |
| 修改 | test/doctor-verify-feedback.test.mjs | 执行期偏差：本地 init 存量回填 |
| 修改 | test/noai-completion-gate.test.mjs | 执行期偏差：经 harness 回填（无需直改，确认无本地 init） |
| 修改 | test/run-complete-step-brainstorm.test.mjs | 执行期偏差：design 清单 stub 文件落盘（清单核验 gate） |
| 修改 | test/run-complete-step-verify.test.mjs | 执行期偏差：seed 存量 created_at 回填 |
| 修改 | docs/sillyspec/platform-interface-map.md | 执行期偏差：index.js 改动后行号重锚（docs check --fix 自愈） |
| 新增 | test/ir-strict-mode.test.mjs | 闸门 + P3b/P3a 两档（存量豁免回归锁定）+ 混合「跨仓卡+主仓卡全零声明」触发 + strictViolation 的 gates envelope/print 阻断路由（Grill P2-⑥） |
| 新增 | test/design-file-list-gate.test.mjs | 幻灵路径 ERROR / NEW: 豁免 / 清单缺失 WARNING / glob 与 `<...>` 占位形态跳过（Grill P2-⑤） |
| 新增 | test/delta-scan-feedback.test.mjs | project 同口径 + sidecar schema + advisory 三态 + sidecar 写失败 fail-soft 分支（Grill P2-⑥） |
| 新增 | test/docs-fix-receipt.test.mjs | 回执计数正确性 + 非 --fix 路径零变化 + `--fix --json` 组合回执形态（Grill P2-⑥） |

## 接口定义

```js
// constants.js
export const IR_STRICT_SINCE = '2026-09-07'

// progress/change-registry.js（ProgressManager 同名透传）
getChangeCreatedAt(cwd, changeName) // → string|null（ISO，变更不存在/异常 → null）

// verify-postcheck.js
isStrictChange({ pm, cwd, changeName }) // → boolean（created_at ≥ IR_STRICT_SINCE；读不到 → false）
checkProbeConsistency({ cwd, specBase, changeName, runtimeRoot, strictMode = false })
reconcileTargetFiles({ ..., strictMode = false }) // strict 全缺 → { status:'skipped', strictViolation:{code:'target_files_all_missing_strict', message} }

// design-facts.js
validateDesignFileList({ changeDir, cwd }) // → { ok, errors:[{path,message}], warnings:[string] }

// archive-delta.js
writeLastDeltaSidecar(runtimeRoot, { change, affectedModules, affectedFiles })
// 落 .runtime/last-delta.json（schemaVersion 1，幂等覆盖；写失败 fail-soft 不阻断 delta 生成）
```

## 生命周期契约表

本变更不涉及生命周期契约（不含 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 语义——sidecar 是无主快照文件，scan 侧只读 advisory，无状态机交互）。

## 数据模型

无 db schema 变更。新增运行时文件 `.runtime/last-delta.json`：`{ schemaVersion: 1, change: string, affectedModules: string[], affectedFiles: string[], updatedAt: string(ISO) }`——无主快照，幂等覆盖，过期语义由消费方（14 天窗口）判定。

## 兼容策略（brownfield 必填）

- **存量变更零变化**：created_at < IR_STRICT_SINCE 的变更走全部既有分支（skip/WARNING 原文保留，skipReason 仅追加来源注记）；isStrictChange 读不到 created_at → false（fail-open 落豁免）。
- **未生成过 delta 的仓**：sidecar 不存在 → scanResumeCheck 静默跳过，行为与无此机制一致。
- **docs check 非 --fix 路径**：输出零变化（回执只在 --fix 分支）。
- **API/表结构**：零变更（getChangeCreatedAt 只读；sidecar 是新文件非契约）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 时间戳闸门误伤——created_at 格式漂移或时钟回拨导致新变更被判存量 | P1 | 写入口径唯一（toISOString，change-registry 已证实）；比较用字符串字典序（ISO 等长可比）；读不到 fail-open 落豁免；测试锁定三种边界（=闸门日/早一天/晚一天） |
| R-02 | P3b/P3a strict ERROR 拦住正在推进的严格模式变更（agent 不熟悉新契约） | P1 | ERROR 文案必须带可执行指引（verify-probes --init / 逐卡 Edit target_files），重跑不丢进度（gate rollback 既有语义） |
| R-03 | design 清单核验误报——路径含变量/通配（`<...>` 占位、`*`/`?` glob） | P2 | `<...>` 占位段归一化剥除；glob 字符条目 warning 跳过（fail-soft，pathMatches 体系本支持 glob 合法形态）；两种形态白名单进测试（Grill P2-⑤扩展） |
| R-04 | sidecar 与真实归档漂移（手动 delta 后又归档了他变更） | P2 | 幂等覆盖 + updatedAt 过期窗口（14 天）+ advisory 语义（提示优先核对而非据此跳过扫描） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 Wave 1；FR-01 | 已覆盖 |
| D-002@v1 | 总体方案 Wave 2A 前半；FR-01 | 已覆盖 |
| D-003@v1 | 总体方案 Wave 2A 后半；FR-01 | 已覆盖 |
| D-004@v1 | 总体方案 Wave 2B；FR-02 | 已覆盖 |
| D-005@v1 | 总体方案 Wave 2C 前半；FR-03 | 已覆盖 |
| D-006@v1 | 总体方案 Wave 2C 后半；FR-03 | 已覆盖 |
| D-007@v1 | 总体方案 Wave 2D；FR-04 | 已覆盖 |

无未解决决策与剩余风险（R-01~R-04 均有应对且进测试）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=large）
- [x] 引用所有当前版本 D-001@v1 ~ D-007@v1
- [x] 生命周期关键词豁免——本变更不涉及生命周期契约（豁免短语见「生命周期契约表」节）
- [x] UI 原型分级核对——无前端文件，跳过（无需 prototype）
- [x] 不确定的问题标注——无存疑项（created_at 写入口径已实证 toISOString）
