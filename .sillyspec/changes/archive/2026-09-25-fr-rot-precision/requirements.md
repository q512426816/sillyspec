---
author: flow-machine-draft
created_at: 2026-09-25T11:32:34.898Z
---
# 需求规格（Requirements）— 2026-09-25-fr-rot-precision

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: frCoverageFiles 三源并集
Given rot 打标需要 FR 覆盖文件集，单源（design 交付表）对 thin 归档覆盖率 0
When fr-index.js 新增导出 frCoverageFiles（归档 design.md 交付表剥反引号 ∪ change-patch.json files，统一剔 .sillyspec/ 前缀，POSIX 归一，fail-soft）
Then thin 归档 27/30 可从 change-patch.json 补位；反引号交付条目（实测 29.4%）剥壳后可匹配

### FR-02: readActiveFrDigest 新增 bindings 字段
Given rot coverage 第三源是条目测试绑定的 test 文件
When readActiveFrDigest 解析「测试绑定：」子块（锚定子块防正文误匹配，多文件 | 分隔）
Then 返回对象新增 bindings: string[]，纯增量——既有消费方（prompt.js 注入渲染等）零影响

### FR-03: 交付表解析抽公共
Given design 表格行正则只存在于 resolveTouchedDomains 内部（两处复用会复制漂移）
When 抽为导出 deliverableFilesFromDesignText（含反引号剥壳）
Then resolveTouchedDomains 改调用（反引号条目现在能命中模块域——原失明面改良）；frCoverageFiles 同源使用

### FR-04: rotSuspectFlow 三分判据
Given 域级全标产生 ⚠️ 通胀（本仓实测一次 88 条，keep-latest 每收口全量刷新）
When coverage（来源变更文件面 ∪ bindings）与本次归属文件面单向匹配
Then 交集非空→strong 打标；coverage 空→unknown 不打标（遥测单列，宁漏勿滥——漏标只损失注入排序优先级）；非空无交集→skip；遥测 count 语义=strong（防污染 knowledge-stats 的 rotSuspectByDomain 消费读数）；评审实测基线 131 条→strong 83/unknown 8/skip 40

### FR-05: 匹配口径单向
Given changed 恒为文件级路径、coverage 含目录形态
When 判定用「相等 || changed.startsWith(cov 补 / 结尾)」
Then 口径单侧定义，目录条目按前缀含

### FR-06: dup 软门最高重叠对 + 场景名
Given flow 侧取首个过阈者与 brainstorm 软门（取最高）微差，且命中提示缺场景上下文
When frDupGateFlow 改取最高重叠对并附 active 条目场景名（过滤（无场景名）占位）
Then 多命中时指认最相近条目；agent 改写承接可直接对照场景（OpenSpec MODIFIED 整块拷贝语义的轻量等价）

### FR-07: 阈值常量公共化
Given 0.6 在 flow.js 与 stage-contract.js 各写一份（最小漂移面）
When fr-index.js 导出 FR_TITLE_OVERLAP_THRESHOLD，两处改 import
Then 文本钉（限两文件）断言无裸 >= 0.6 且常量 import 在场（verify-probes.js 的第三处 0.6 是另一语义不纳入）

### FR-08: resume 域路由口径
Given 裸 git diff 双提交区间漏干活期未提交文件且不带 .sillyspec 剔除
When resume 注入改用 changedFilesSinceBaseline（含 untracked/dirty、剔 .sillyspec，与收口口径同源）
Then 干活中途 resume 也有域路由依据；文本钉防回潮

### FR-09: cleanupStaleReviewMarks 并发安全
Given 存量 200 条标记（recent-quick 112 + sentinel 88）多为通胀产物，且域文件被多会话共享
When 清理函数原子写（writeAtomicSync）+ 写前重读比对快照 + 幂等可重跑
Then 盘上被并行改写的文件跳过不覆盖（重跑消化）；superseded 条目不碰

### FR-10: 清理判据泛化
Given quick 永不归档（ref 无文件面），逐 ref 特判是特例
When 判据统一为 keep iff coverage(FR 来源变更)∪bindings 与 coverage(ref 变更) 有文件面交集（任一侧空→删）
Then 自然覆盖 quick 侧 112 条 recent-quick 与带 changeName 的 quick ref；与运行时 unknown 不打标口径一致

### FR-11: 清理时序
Given 清理早于代码合入会被旧判据重标
When 清理执行于代码合入后（本变更内先提交 src 再跑清理）
Then 治理产物与判据同版生效

### FR-12: 测试覆盖
Given 新逻辑六面（三源/bindings/抽公共/三分/常量/清理）
When test/fr-rot-precision.test.mjs 六用例 + 改写 thin-fr-inject-parity 测试②（fixture 补归档件+绑定，区分 strong/skip 旧标记不动/unknown 不打标）
Then 11/11 绿；flow 族+fr-index+decision 底座+contract 面共 116 用例全绿


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例②（三源并集 + 剔 .sillyspec）与用例①（deliverableFilesFromDesignText 剥反引号）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs 测试②夹具（hist-a 条目带测试绑定子块 tests: test/cli.test.mjs，strong 判定吃到 bindings 源）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例①（抽出的解析函数行为）+ 既有 flow 族/contract 面 116 用例回归（resolveTouchedDomains 承重面零回归）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs 测试②（strong=1/skip=1/unknown=1；遥测 strong 与 count 同值；skip 旧标记不动；unknown 不打标）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例②（目录/文件混合 coverage）与 thin-fr-inject-parity 测试②（文件级 changed 匹配）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例④（1.0 重叠优先于部分重叠；场景名注入；（无场景名）过滤）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例⑤（两文件无裸 >= 0.6 且常量 import 在场）

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例⑥（changedFilesSinceBaseline 复用钉 + resume 段无 ..HEAD）

<!--AGENT:测试绑定FR-09 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例③（幂等重跑 removed=0；盘上内容变化→skipped 不覆盖）

<!--AGENT:测试绑定FR-10 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs 用例③（recent-quick 删/交集 keep/无交集删/FR 侧空删四态）

<!--AGENT:测试绑定FR-11 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：时序约束由收口流程执行顺序保证（先提交 src 后跑清理，见变更收口记录），无独立自动化面

<!--AGENT:测试绑定FR-12 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-rot-precision.test.mjs（6 用例）+ test/thin-fr-inject-parity.test.mjs（5 用例，测试②改写）全绿；flow 族+fr-index+decision 底座+contract 面复跑 116 用例 0 fail
