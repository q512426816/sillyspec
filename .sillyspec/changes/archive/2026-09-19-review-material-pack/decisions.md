---
author: qinyi
created_at: 2026-09-19 13:30:00
change: 2026-09-19-review-material-pack
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 方案选择——A（评审材料包契约）胜出；1/2 合并为同一契约矛盾
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 评审降耗的打包方式。用户裁定：只立一件变更，范围「评审材料包」，把「diff 优先评审」与「复审增量」收进去；填卡去仪式化（原 3）不并入；事实面计量（⑥）另走 quick。
- answer: 选 A。**核心判断（用户）：原 1/2 不是两个功能，是同一处契约矛盾**——复审增量机制 2026-09-16 已进引擎（stage-review.js:513 renderPriorRoundFindingsMd 注入 {PRIOR_REVIEW_FACTS}，明文「以增量为主，不重演全量审查」；S3 菜单第二轮只盯首轮未决项），QA2 仍烧 135 万是因为同 prompt 里有更高优先级的反指令：Grill 输入材料段写死「必须读取完整 design.md」（brainstorm.js:417）与「素材宁可多读，不要只读摘要」（:424）；94 分钟事故后加的时间盒只限发散、没缩短必读清单——**子代理服从必读清单，不服从回灌块**。B（仅删清单无注入）被否：材料面失控、子代理自行检索重新发明热点；C（含填卡/轮次/计量）被否：范围炸且自吃狗粮。
- normalized_requirement: 变更改的是各阶段评审 prompt 的输入材料契约——必读清单改为 CLI/主代理组装的材料包注入（execute.js:979-1023 热区先例泛化），{PRIOR_REVIEW_FACTS} 从建议升为再审唯一材料。
- impacts: [FR-01, FR-02]
- 模块域: stages, core-engine
- evidence: 用户 ruling 2026-09-19 13:15；brainstorm.js:417/:424；stage-review.js:503-516；plan.js:500；execute.js:979-1023（热区先例）；本会话 QA2 实测 1,352,626 token 全量重读
- 故障面: 材料包太薄→评审质量降为确认偏差放大器（对策见 D-003 基准面语义）。
- 退役判据: 若材料包实测导致评审漏检率上升（P0/P1 逃逸到后续阶段），重审包的下限构成。

## D-002@v1: 四阶段包形态——不是一律叫 diff
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 材料包的内容契约。Grill 首轮发生在写代码之前，没有实现 diff。
- answer: 按阶段给包：**Grill 首轮**＝design 要点＋文件清单＋五个交叉点＋五个点点名的源码片段（不是 ARCHITECTURE.md 加全部模块文档）；**plan 审**＝plan 相对 design 硬约束的差量；**execute QA**＝diff＋design 热区＋清单；**再审**＝上一轮 findings＋对应修复 diff——{PRIOR_REVIEW_FACTS} 从「建议」变为这一轮的**唯一材料**。
- normalized_requirement: 四阶段包内容如上；包由 CLI 抽取（热区/diff/差量）＋主代理点名（交叉点/五点）组装，模板只留注入位。
- impacts: [FR-01]
- 模块域: stages
- evidence: 用户 ruling 原文四条包形态；execute.js:1013「Wave 前置只读这两节，勿整读全文」同款形态
- 故障面: 阶段误配包（如 QA 拿到 design 全文而非热区）——包注入位与阶段绑定，模板层防串。
- 退役判据: 无。

## D-003@v1: 验收标准——可证伪的清单覆盖，不是 token 节省比例
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 「省 50-60%」能否当验收。
- answer: 不能——那个数是希望，写进 design 会变成无法证伪的成功标准。验收两条：①**清单上的每一条都能只靠材料包回答**；②**复审 prompt 里不再出现「读完整 design / 宁可多读」**（机械可查——补一条回归钉：grep 阶段 prompt 模板断言无此类指令字样）。
- normalized_requirement: 验收=①+②；token 消耗仅作观测注记不作门禁。
- impacts: [FR-02]
- 模块域: stages, core-engine
- evidence: 用户 ruling「验收不是省 50-60%…验收是清单上的每一条都能只靠材料包回答」
- 故障面: 验收②的机械钉可能误伤合法表述（如「可按需定向查证」与「宁可多读」边界）——钉只匹配「必须读取完整/素材宁可多读」两个原语，正则收窄。
- 退役判据: 无。

## D-004@v1: 包是必答基准面，不是禁读清单——独立评审的确认偏差阀
- type: architecture
- priority: P1
- status: accepted
- source: agent
- question: 独立评审的价值部分来自发现设计者盲区；纯包评审会把评审者视野锁死在设计者点名范围内（确认偏差放大）。
- answer: prompt 语义定为：**材料包是评审基准面（checklist 逐条只对包作答）；包外文件可按需定向查证，但必须列明查证过的文件，禁止全量扫读**。既删全读指令，又保留独立发现逃生阀。评审者首项 checklist 自检「材料包是否足以作答；不足即 cannot_verify＋列缺件」——包质量本身被门禁。
- normalized_requirement: 四阶段 prompt 模板统一此语义；材料包不足→cannot_verify 路径明确。
- impacts: [FR-01, FR-02]
- 模块域: stages
- evidence: 本会话 Grill2 抓到的 P1（材料/接口缺口）均属包内可答项；QA1 的 specBase 发现属定向查证形态（读特定函数 20 行）——基准面+定向查证的双层形态即本决策的实证来源
- 故障面: 「定向查证」被滥用为变相全读——时间盒纪律仍在（连续 10+ 文件零结论即收敛），两层叠加。
- 退役判据: 无。

## D-005@v1: 非目标显式清单＋合规项
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: 范围纪律。
- answer: 非目标：不改评审轮次（S2/S3 菜单不动）、不改填卡步骤（plan.js:500 的 batch 子代理另立变更或明示非目标）、不动事实面计量（⑥ 另走 quick）、不吞 verify 级联死锁两轮（已有 postmortem ql-013）。**合规项（本变更触 src/stages/*.js prompt，CLAUDE.md 规则 19）**：改完必须重跑 `node docs/prompt/_extract.mjs` 并同步 docs/prompt/*.md——列入文件清单，防 doc-ref-check 层面返工。**自指纪律**：本变更在评审域，brainstorm 完成门按当时 design 定档且只升不降——risk_level 必须在该 --done 前写入 frontmatter（否则关键词定顶格、把要省的钱先花掉）。
- normalized_requirement: 非目标四条＋prompt 文档同步合规＋risk_level 先行纪律。
- impacts: []
- 模块域: docs-consistency, stages
- evidence: 用户 ruling「非目标写明不改评审轮次、不改填卡步骤、不动事实面计量」；CLAUDE.md 规则 19；docs/prompt/_extract.mjs 提取链
- 故障面: 无。
- 退役判据: 无。
