---
author: flow-machine-draft
created_at: 2026-09-25T09:43:19.036Z
---
# 需求规格（Requirements）— 2026-09-25-thin-fr-inject-parity

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: flow start 三路径知识注入段
Given 轻量道 fresh 不经 brainstorm，{FR_INDEX_DIGEST}/{DECISION_HITS} 注入面缺失
When flow start 简报（fresh/resume/adopt 三路径）尾部追加 flowKnowledgeDigest 段（触达域 active FR——待复核 ⚠️ 优先 top8；否决决策命中含否决理由；INDEX 知识命中 top3）
Then 域路由与 distill 同口径（resolveTouchedDomains filesOverride 旁路：fresh=--input 路径样 token / resume=基线 diff / adopt=design.md 交付清单）；fresh --input 含模块路径语料时简报含该域现行 FR 条目 id

### FR-02: 注入段不污染材料清单稳定前缀
Given 材料路径清单是稳定前缀（缓存最优）
When 注入段为动态内容（域随语料变）
Then 注入段独立成块追加在材料清单之后；端到端断言「材料路径清单」出现位置先于「🧠 知识注入」

### FR-03: flow done 收口 fr-rot-suspect 检测
Given quick 退役后 fr-rot-suspect 钩子（quick-done 侧独有）悬空
When flow done ledger 子步实测门通过后按归属文件面（attributedChangedFiles）→ 模块域 → active FR 检测
Then 记 fr-rot-suspect 遥测（source=flow-done）+ markFrNeedsReview 待复核标记（下次知识注入带 ⚠️，承接翻链清除）；非触达域文件零告警；advisory 不阻断

### FR-04: flow done distill 前 FR 重复嫌疑软门
Given 轻量 FR distill 直写索引，无与既有 active 条目的对账时机
When distill 子步 indexRequirements 之前跑 frDupGateFlow（新 FR 无承接 × 同域 active 标题 bigram ≥0.6）
Then 命中给 advisory warning（双出路：承接行或改标题）+ fr-duplicate-warning 遥测；承接行在场豁免；不阻断 distill

### FR-05: 测试覆盖与既有套件零回归
Given 新增三面逻辑（注入/rot/软门）
When 跑 test/thin-fr-inject-parity.test.mjs（5 用例：域路由命中+待复核优先+否决命中/空态折叠一行/rot 打标+遥测+非触达零告警/重复告警+承接豁免/fresh 端到端含注入段与稳定前缀顺序）
Then 5/5 绿；flow 族既有六套件（checkpoints/draft/parity/protocol/review/route）41 用例全绿


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs 用例①（域路由命中 active FR+待复核优先+否决命中）与用例④（fresh 端到端 --input 路径语料域路由）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs 用例④（端到端断言材料路径清单先于知识注入段出现）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs 用例②（rotSuspectFlow：触达域打标+fr-rot-suspect 遥测 source=flow-done+非触达域零告警）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs 用例③（frDupGateFlow：重叠告警 FR-01↔FR-cli-001+fr-duplicate-warning 遥测+承接行豁免）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs 全 5 用例 + flow 族六套件复跑 41 用例全绿（首跑一次 flow-draft ① 并行偶发不复现——单独 3 跑与同序复跑均绿）
