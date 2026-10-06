---
author: flow-machine-draft
created_at: 2026-10-06T07:15:04.788Z
---
# 需求规格（Requirements）— 2026-10-06-archive-stage-claim

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: complete-handlers.js 补暂存循环逐批校验 safeGit 返回的 error：任一批失败时不再打印成功提示，改为 ⚠️ 告警（含失败路径与 error 首行）并给出手工兜底指引（git add -- <源侧路径> 后重跑收口）——与相邻 untrackedArchiveHit 兜底分支的告警形态一致

- 必须：补暂存源侧移动的批处理（runArchiveChain 内 minePaths 循环）逐批检查 `safeGit` 返回的 `error` 字段（safeGit 不抛错、返回 `{value, error}`——忽略返回值即吞错）；任一批失败时禁止打印既有成功提示「已补暂存本变更归档的源侧移动（N 项…）」，必须打印 ⚠️ 告警：列出失败路径与 error 首行，并给出手工兜底指引（`git add -- <失败路径>` 后重跑收口命令，归档子步幂等续）。
- 实现形态：暂存循环抽为导出助手 `stageArchiveSourceSideMoves({ cwd, paths })`（逐批 add + 结果校验，返回 `{ ok, count, failures: [{ path, error }] }`），文案渲染抽为导出函数（成功文案 / 告警文案可分别断言）；runArchiveChain 接线两者。

#### 场景：add 失败（实测形态：2026-10-06-module-map-list-leak 收口声称补暂存 1 项但暂存面无该删除）

- Given git add 因故失败（如 .git/index.lock 被并行进程持有）
- When runArchiveChain 补暂存源侧移动
- Then 输出 ⚠️ 告警（含路径与 error 首行 + 手工兜底指引），不输出成功提示；不抛错不阻断归档链（fail-soft 语义与现状一致）

### FR-02: 全部成功时维持既有成功提示不变（含 N 项计数）

- 必须：所有批次 add 成功时，维持既有成功提示原样（含 N 项计数与「归档成单次原子提交」语义），行为零变化。
- 禁止：成功路径新增任何额外输出或行为改变。

#### 场景：主路径

- Given 源侧移动待补暂存且 add 全部成功
- When runArchiveChain 补暂存
- Then 输出与现状逐字一致的成功提示；对应删除/新增真实进入暂存区

### FR-03: 测试覆盖：add 失败路径告警且不打成功提示 / add 成功路径提示不变的单元回归

- 必须：新增测试覆盖 FR-01/FR-02：失败路径（.git/index.lock 逼 add 失败——确定性手段，非 sleep/时序依赖）断言 `{ok:false, failures}` 且告警文案含路径与指引、成功文案不在场；成功路径断言 `{ok:true, count}` 与既有成功文案逐字一致、暂存区真实含删除；全绿后收口。

#### 场景：主路径

- Given 测试运行环境
- When 执行新增测试
- Then 全部断言通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/archive-stage-claim.test.mjs「add 失败告警不打成功提示」
FR-02: test/archive-stage-claim.test.mjs「add 成功提示与暂存实态」
FR-03: test/archive-stage-claim.test.mjs「全量用例」
