---
author: flow-machine-draft
created_at: 2026-10-09T06:51:08.912Z
---
# 需求规格（Requirements）— 2026-10-09-close-trace-single-set

## 功能需求

### FR-01: thin（flow done）与 heavy（execute --done）两条通道收口后落盘恰好 change.patch + change-patch.json 两件，JSON 含完整 scopeAudit 面

- 必须：writeCloseTraceArtifacts 收口只写 change.patch 与 change-patch.json 两个产物文件；新收口的变更目录中不得再出现 scope-audit.json / scope-audit.patch。
- 必须：change-patch.json 顶级键（change/baseline/head/files/totals/savedAt/patchSha256/patchStatus 及 note/modules/uncoveredDirs/moduleMaps/acceptedDirtyGap 等增量键）原位保留，新增 scopeAudit 子对象承载原 scope-audit.json 全部字段（mode/ok/degradedReason/baseAnchor/totals/rows/excluded/closedBy，cross-repo 时含 repos）；patchSha256/patchStatus/savedAt 不在子对象内重复。
- 必须：patchText 空/null 时标 failed、不落 change.patch（既有语义不变）。

#### 场景：主路径
- Given 任一通道（thin flow done / heavy execute --done）收口成功，When 收口完成，Then 变更目录中收口留痕文件恰好为 change.patch + change-patch.json 两件，且 change-patch.json.scopeAudit.rows 为数组、closedBy 标注通道。
- Given patch 采集失败（patchText null），When 收口完成，Then 仅 change-patch.json 一件且 patchStatus=failed，scopeAudit 面仍完整在场。

### FR-02: 旧形态归档（四件套/thin 双件/heavy 双件）读链全部不回退：scope-audit 表回放、--file 冻结切片、FR 覆盖、知识图谱交付边、漂移检测照常工作

- 必须：对账快照读序为 change-patch.json.scopeAudit → 旧 scope-audit.json → .runtime/scope-audit-<change>.json → thin 回放 → 实时区间；三类存量形态（四件套 / thin 双件 / heavy 双件）各自命中正确层级，不产生伪数据。
- 必须：冻结 patch 切片（--file）读序 change.patch 优先、scope-audit.patch 作旧 heavy 归档兜底；sha256 防篡改校验照常（伴生 json 读 change-patch.json，旧形态读 scope-audit.json）。
- 必须：fr-index FR 覆盖、knowledge-graph 交付边、flow.js 漂移检测（freezeHead）读 change-patch.json 顶级键，行为与合并前完全一致（零改动验证）。
- 必须：execute 证据信号（原 scope-audit.json 存在性判定）改为 change-patch.json.scopeAudit 存在性判定，旧 scope-audit.json 并存兼容。

#### 场景：主路径
- Given 存量四件套归档，When scope-audit 表回放 / --file 切片，Then 数据来自最高优先级新形态源，结果与合并前一致。
- Given 存量 heavy 双件归档（仅 scope-audit.json/.patch），When 同上，Then 命中旧名兜底层，回放照常。
- Given 存量 thin 双件归档（仅 change-patch.json/.patch），When 同上，Then 命中 thin 回放层，照常。

### FR-03: 平台 assets 端点与前端文件预览对新形态可读，旧归档不白屏

- SHOULD：multi-agent-platform 前端 structured-views 对 change-patch.json 提供结构化渲染（清单面 + scopeAudit 面复用 ScopeAuditView）；后端 assets.py 主读路径（change-patch.json/change.patch 优先）不变，旧名回退链保留兜其他仓旧归档。
- 禁止：平台侧删除旧名回退（其他仓镜像归档仍为旧形态）。

#### 场景：主路径
- Given 新形态归档（仅两件），When 平台前端预览 change-patch.json，Then 渲染结构化清单 + 对账表格而非纯 JSON dump。
- Given 旧形态归档，When 平台预览，Then 不白屏（scope-audit.json 分支与回退链仍在）。

### FR-04: 相关测试全绿（close-trace-unified、scope-audit 全家、flow-protocol 等）

- 必须：close-trace-unified 改钉单套契约并通过；scope-audit 全家（含新增旧形态兼容用例）、thin-patch-replay、flow-protocol、flowdone-disposition-drift、thin-done-dirty-gate、flow-parity 受影响断言更新后全绿；收口时 CLI 实测全量回归通过。

#### 场景：主路径
- Given 全部受影响测试更新完成，When 运行测试面（本变更 ∪ FR 关联回归 ∪ import 依赖），Then 全部通过 exit=0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/close-trace-unified.test.mjs「writer ok-state 写恰好两件 + scopeAudit 子对象」「thin/heavy CLI e2e 落盘两件」
FR-02: test/scope-audit-thin-patch-replay.test.mjs「FR-03 优先级：scopeAudit 子对象 > 旧 scope-audit.json > thin 回放；双缺走开放区间兜底」+「FR-02 新形态防篡改：change-patch.json 顶级 patchSha256 作伴生锚，篡改 change.patch → 拒绝出 diff」（评审 P3 清偿：绑定测试名改精确引用 + 补新形态伴生锚负向用例）+ test/scope-audit.test.mjs「A-F01 篡改检测：patch 被改 → getFileDiff 报 sha256 不匹配拒绝出 diff」（旧形态伴生锚既有用例）
FR-03: 不适用（CLI 仓测试面）：平台仓改动为前端渲染分支与注释/文档，验证走平台仓自有流程与人工预览；CLI 侧无对应测试面
FR-04: test/close-trace-unified.test.mjs 全文件 + 收口 CLI 亲测全量回归（P2 账本/实测记录）
