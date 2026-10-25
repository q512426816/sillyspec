---
author: flow-machine-draft
created_at: 2026-10-25T11:12:29.304Z
---
# 需求规格（Requirements）— 2026-10-24-flow-done-review-artifact-drift-loop

## 功能需求

### FR-01: 复审锚后仅治理文件 own 提交不再触发隔离重评（deliveryFaceAnchoredAfter 判定 + flowdone-disposition-drift 回归绿）

- 必须：复审锚（review.json.reviewedAgainst）之后本变更 own 提交只触及治理文件（`.sillyspec/**`）且未触承诺面（requirements.md/design.md）时，flow done 的 patch 漂移处置保留 review.json 不隔离重评（评审对象交付面自锚点起未变，结论对最新面等价）。
- 必须：锚后 own 提交触及任何非治理文件，或触及承诺面时，判定不成立，走既有隔离重评路径。
- 必须：锚为空/非 7-40 位 hex/非 HEAD 祖先（rebase 重写）/git 调用失败时判定 fail-safe 返回不成立（宁可多评，不放行存疑面）。

#### 场景：主路径

- Given 复审锚 A 之后本变更仅有一个 own 提交且只改了 `.sillyspec/changes/<名>/review.json`（归档前治理提交典型形态）
- When flow done 执行 patch 漂移处置
- Then review.json 保留不隔离，输出治理件保留理由，归档照常。

#### 场景：边界（fail-safe）

- Given 锚点 sha 被 rebase 重写（非 HEAD 祖先）或格式非法
- When deliveryFaceAnchoredAfter 判定
- Then 返回不成立（ok=false），走隔离重评，不因锚失效静默放行。

### FR-02: findings 阻断只计开放 P1，status 缺省/未知值按开放收敛（isOpenFinding + flow-review 测试绿）

- 必须：review.json findings[] 支持 `status` 字段（词表：open/resolved/resolved-as-accepted/accepted/false-positive，大小写不敏感）；收口阻断判定只计开放态（open/缺省/未知值）的 P1。
- 必须：status 缺省或未知值按开放收敛（fail-closed——不因新增词表值静默放行）；validateReviewJson 不拒收带 status 的 findings（向后兼容：无 status 的旧产物全部按开放计）。

#### 场景：主路径

- Given 增量复审产物 findings 含一条已标 `status: "resolved"` 的历史 P1 与一条无 status 的新 P2，verdict=PASS
- When flow done 收口阻断判定
- Then 无开放 P1，收口放行；若新 P1 无 status 则仍拦。

### FR-03: 评审写入纪律面 thin-empty-face-crosscheck 绿；受影响面 flow-review/flowdone-disposition-drift/thin-empty-face-crosscheck 33/33 绿 + lint 1085 文件绿

- 必须：评审任务书写入纪律明确——review.json 写 `<changeDir>/review.json`，changeDir 不存在（变更已归档/被移）时评审员停止并报告、勿重建目录；评审产物保持工作区未提交态，随归档提交一次性入库（先行提交会触发审计时点漂移判定）。
- 必须：受影响测试面 flow-review / flowdone-disposition-drift / thin-empty-face-crosscheck 全绿（33/33）且 lint 全仓通过（未引用导出 0 项 hard fail）。

#### 场景：主路径

- Given 评审员按任务书在变更已归档后被派发
- When 发现目标 changeDir 不存在
- Then 停止并报告，不重建目录不写产物；正常路径产物未提交态落盘，随归档提交入库。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flowdone-disposition-drift.test.mjs「⑥ deliveryFaceAnchoredAfter：锚后治理件提交 ok / 锚后交付提交拦 / 触承诺面拦 / 非祖先锚 fail-safe」
FR-02: test/flow-review.test.mjs「isOpenFinding 词表：已解决/接受态 false，缺省与未知值 fail-closed true」
FR-02: test/flow-review.test.mjs「validateReviewJson：findings[].status 额外字段不拒收（PASS + resolved P1 合法）」
FR-03: test/thin-empty-face-crosscheck.test.mjs「增量复审：resolved P1 + verdict PASS → 收口通过；open P1（显式 status）仍拦」
FR-03: test/thin-empty-face-crosscheck.test.mjs「NEW: 前缀新建声明（已提交在盘）→ 零跨仓嫌疑告警 + 自证命中 + 归档通过」
