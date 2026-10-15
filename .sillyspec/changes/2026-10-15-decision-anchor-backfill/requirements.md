---
author: flow-machine-draft
created_at: 2026-10-15T10:29:03.371Z
---
# 需求规格（Requirements）— 2026-10-15-decision-anchor-backfill

## 功能需求

### FR-01: anchorBackfillCandidate 单元：恰一路径（含 :行号形态）→token、多路径→null、仅裸名→null、.sillyspec/knowledge 自引用排除、空→null

- anchorBackfillCandidate 必须从条目正文提取路径形态 token：恰一个唯一时必须返回该 token（`src/flow.js` 与 `src/flow.js:324` 行号形态原生支持，反斜杠归一）；多候选、仅裸文件名、纯知识自引用（.sillyspec/knowledge/changes 归档/decisions/fr 互引/docs/sillyspec 坑文档/.runtime 运行时/allowed_paths 工件/repo:// 前缀剥除后仍属上述）、空输入时必须返回 null。

#### 场景：主路径

- When ① 组 9 形态断言运行，Then 全过。

### FR-02: 收割端端到端：风险段恰一路径 → 产出 - 锚点：行；无路径 → 无该行（不编造）

- harvestSlot4Decision 起草 decisions.md 时必须经 anchorBackfillCandidate 判定风险段作答文本：恰一路径必须写入 `- 锚点：<token>` 行（源文件即真相源，蒸馏自然携带、人可改）；0/多候选必须不写锚点行。

#### 场景：主路径

- Given design 风险段含单一路径/无路径两 fixture，When harvest，Then 锚点行在场/缺席精确（测试②）。

### FR-03: 蒸馏端端到端：条目无锚点正文含单一路径 → 蒸馏段锚点=该路径；多路径 → 未记录；既有锚点不覆盖

- distillIntoKnowledge 渲染锚点行时必须对 entry.anchor 为空的条目经 anchorBackfillCandidate 回填（正文恰一路径）；多候选必须保持「未记录」（错锚比无锚更误导 impact 查询）；entry.anchor 已有值时禁止覆盖。

#### 场景：主路径

- When 三态 fixture 蒸馏，Then 回填/未记录/人工锚保持精确（测试③）。

### FR-04: 存量手术回填实测：graph anchors 边显著增长，坏锚裁决还原留痕

- 存量「锚点：未记录」段经行级手术回填（sillyspec 46 行 + 平台仓 18 好锚），graph anchors 边必须显著增长（126→155 实测）；干跑样本实测坏锚类（工件列举串/模板占位/版本对比/伪前缀/无主残迹）必须裁决还原为未记录（还原清单留痕）。

#### 场景：主路径

- When 手术脚本 dry-run/apply 与 graph summary 重算，Then 回填行数与 anchors 边增长留档（verify-result）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/decision-anchor-backfill.test.mjs「① anchorBackfillCandidate 全形态」
FR-02: test/decision-anchor-backfill.test.mjs「② 收割端：恰一路径 → - 锚点：行；无路径 → 无该行」
FR-03: test/decision-anchor-backfill.test.mjs「③ 蒸馏端：无锚点正文单一路径 → 回填；多路径 → 未记录；既有锚点不覆盖」
FR-04: 不适用：存量手术为消费侧数据执行（脚本 .runtime/anchor-surgical.mjs）——验收靠 graph anchors 边 126→155 与还原清单实测留档
