---
author: flow-machine-draft
created_at: 2026-11-19T14:57:14.905Z
---
# 需求规格（Requirements）— 2026-11-19-pitfall-trio-closeout

## 功能需求

### FR-01: 归档幂等自愈——runArchiveChain 撞已存在归档目录时必须读其 flow-state 判完备性：子步全 done 即自愈收口（注销+清理+残留提示），不完备必须维持硬错并附处置指引；cmdFlowDone 无 flow-state 分支必须补「归档已完成直接提交归档件」恢复指引

- 约束强度：必须（坑 2026-11-13-flow-done-timeout-archive-half-state 建议①③——外层超时被杀在 archive 子步中途后，重跑不再撞死硬错、误删源目录的恢复锚点不再丢失）

#### 场景：超时中断重入

Given flow done 在 archive 子步中途被杀（归档目录已写全 flow-state 子步全 done、源目录残留未跟踪件）／When 重跑 flow done 或直接调 runArchiveChain／Then 判定上次归档已完成：注销变更+清理+成功返回，残留件提示可手工清理而非硬错。

#### 场景：不完备归档（同名冲突/半写）

Given 归档目录存在但 flow-state 子步未全 done（或缺 flow-state）／When runArchiveChain／Then 维持「目标目录已存在」硬错，错误信息附核对与处置指引。

### FR-02: 漂移归因口径对齐——detectPatchDrift 与 deliveryFaceAnchoredAfter 的 own 判定必须与 buildCommitAttribution 同口径：具名变更或带 task-NN token 的裸提交均算本变更提交（token 返工提交触发重冻结）；纯裸提交（无名无 token）必须仍不触发

- 约束强度：必须（坑 2026-11-13-flow-done-patch-refreeze-skip-on-rework 方向①根因——返工提交常态形态=带 token 无变更名，旧口径不认 own 致漂移恒不触发、冻结件停在返工前时点）

#### 场景：token 返工提交

Given patch 已冻结（head 锚定旧 HEAD）且其后出现带 task-NN 无变更名的返工提交触及交付面／When 重跑 flow done 走漂移检测／Then 判 own 触发自动重冻结，冻结件含返工内容。

#### 场景：纯裸提交

Given 冻结后出现的提交既无变更名也无 task-NN token／When 漂移检测／Then 不算 own，不触发重冻结（共享主仓他侧提交不误吞）。

### FR-03: patch 幂等跳过时点披露——patch 子步 skip 且冻结 head ≠ 当前 HEAD 时必须输出显式警告行（两 sha 差异+人工留档指引）；未触发重冻结的形态（他侧提交/治理面）审计时点必须一目了然

- 约束强度：SHOULD（坑 2026-11-13-flow-done-patch-refreeze-skip-on-rework 方向③——skip 语义是「幂等跳过」不是「内容最新」，输出层让审计者一眼看出冻结件时点落后）

#### 场景：skip 时点落后

Given patch 子步幂等跳过且 change-patch.json.head 落后当前 HEAD／When 渲染输出／Then 输出 ⚠️ 行披露两 sha 与「审计需覆盖最新面时以 git diff baseline..HEAD 人工留档」指引。

### FR-04: docs-check 模板占位形改写——生成源模板的教学引用示例必须改为不可解析形态（`src/foo.js:<行号>`／`foo.js:<行号>`／`src/foo.js::<符号名>` 占位符不是数字/标识符，不触发 REF_RE/SYMBOL_REF_RE）；collectDocRefs 扫描器必须零豁免（foo.js 真名引用语义完整保留——带行号/符号锚的 foo.js 照常提取）

- 约束强度：必须（坑 2026-11-18-docs-check-template-self-pollution——每新建一个变更自动引入 ~20 处假失效顶高 gate current；首轮「扫描器全局豁免 foo.js」方案被实测门否决：foo.js 是开放世界通用夹具名，豁免给真名开后门，docs-check-symbol-anchor/docs-fix-capability 等既有 fixture 实证全红）

#### 场景：模板教学注释（改形后）

Given 生成模板教学注释写「形如 src/foo.js:<行号>——行号写实际数字」／When collectDocRefs 扫描生成的变更文档／Then 占位文本不入引用面（零自污染）；同文档内真实引用（如 src/progress.js:215）正常收集。

#### 场景：foo.js 真名引用（语义保留）

Given 文档含真实夹具引用「foo.js:12」或符号锚「src/foo.js::runStage」／When collectDocRefs 扫描／Then 照常提取（不豁免真名）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/archive-idempotent-selfheal.test.mjs「Case4 双臂：归档目录已存在且子步全 done 自愈收口／不完备维持硬错」
FR-02: test/flowdone-disposition-drift.test.mjs「⑦ token 裸提交（无名有 task-NN）触发漂移；纯裸提交仍不触发；交付面锚定同口径」
FR-03: 不适用：输出提示行无独立行为断言——触发路径（治理面等价漂移不触发重冻结走 skip 分支）由 FR-02 套件 ③「治理面等价漂移」间接覆盖
FR-04: test/docs-check.test.mjs「collectDocRefs 模板占位形零提取（<行号>/<符号> 不可解析）」+「foo.js 引用语义完整保留（不豁免真名）」；既有 fixture 回归 test/docs-check-symbol-anchor.test.mjs + test/docs-fix-capability.test.mjs 全绿
