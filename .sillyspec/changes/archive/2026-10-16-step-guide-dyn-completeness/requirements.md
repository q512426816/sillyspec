---
author: flow-machine-draft
created_at: 2026-10-15T16:21:49.378Z
---
# 需求规格（Requirements）— 2026-10-16-step-guide-dyn-completeness

## 功能需求

### FR-01: 全部裸 split/join 注入点收编进 dynSegments（新增 substituteRaw 助手），复入附录不再漏块

- 必须：`src/run/prompt.js` 新增 `substituteRaw(token, value)` 助手（`dynSegments.push(String(value))` + `promptText.split(token).join(value)`），置于既有 `substitute`/`substituteSplitJoin` 旁。
- 必须：以下 9 站点（共 14 个 token 处）全部改走该助手——评审成功分支 6 处（`{REVIEW_TIER}`（含档位菜单拼接值）/`{REVIEW_TIER_REASON}`/`{STAGE_REVIEW_RUN_ID}`/`{REVIEW_JSON_CONTRACT}`/`{PRIOR_REVIEW_FACTS}`/`{REVIEW_MATERIALS}`）、评审降级分支 6 处（同 token 的降级值）、`{WORKTREE_META}`、`{TASK_COMPLETION_REPORT}`（两分支）、`{WORKTREE_BASELINE_INFO}`、`{EVIDENCE_AUTO_RECOMMENDATION}`、`{ARCHIVE_IMPACT_AUDIT}`、`{SCOPE_AUDIT_TABLE}`、`{HANDOVER_SUMMARY}`。
- 必须：`substituteRaw` 注释钉纪律——新增注入点必须走本组助手（裸 split/join 会让值漏进复入附录，2026-10-15 消费仓实证）。
- 禁止：不改 `substitute`/`substituteSplitJoin` 语义；不收集 quick 专用追加式注入（`ki.section`/`semanticGuardBlock`，quick 通道已退役仅存量会话，理由记 design）；不改复入附录的打印逻辑（2109-2111）。

#### 场景：复入附录含评审六值

- Given：brainstorm 步骤 prompt 含评审六占位符，同一 cwd 连续渲染两次
- When：第二次（复入）输出
- Then：输出含「动态注入段」标题，且 tier 行/材料包/契约内容在场（修复前此断言必红）

#### 场景：首见渲染出真值

- Given：同上首见渲染
- When：输出
- Then：无残留裸占位符（`{REVIEW_TIER}` 等不出现在输出中）

### FR-02: VOLATILE_PLACEHOLDER_RES 补 3 个漏登 token

- 必须：掩码表补 `{REVIEW_TIER}`、`{REVIEW_TIER_REASON}`、`{REVIEW_JSON_CONTRACT}`——guide 静态文件不再残留裸占位符（同表既有口径：值因运行而异的 token 全部掩码）。

#### 场景：掩码表覆盖

- Given：`src/run/prompt.js` 的 VOLATILE_PLACEHOLDER_RES
- When：检索三 token
- Then：三个正则均在表内

### FR-03: stage-review 路径警告措辞覆盖双向错法

- 必须：`src/stage-review.js` 的完整路径提示语改为「直接复制完整路径、勿手拼」语义，同时点名两类实测错法——漏阶段前缀（2026-10-10 实证）与多加一层 `review-` 前缀（2026-10-15 复发实证）。

#### 场景：措辞覆盖

- Given：`src/stage-review.js` 渲染的路径提示行
- When：检索
- Then：同时含「漏」「多」或等效双向覆盖表述 + 「直接复制」指引

### FR-04: 测试钉死 + 既有面零回归 + lint

- 必须：新增 `test/step-guide-dyn-completeness.test.mjs`：FR-01 两场景断言——D1（首见真值）为回归锚（旧代码亦过，收编不改首见语义）；D2（复入附录含六值）为修复面判别器（旧代码必红，已对照验证 1 过 3 红）。
- 必须：step-guide 族既有测试（default-on / fingerprint / prune / guidance-output-neutrality）全绿；`npm run lint` 通过。

#### 场景：新测试与既有面

- Given：仓库
- When：node --test 新旧测试 + npm run lint
- Then：全绿

## 测试绑定（每条 FR 至少一行）

FR-01: test/step-guide-dyn-completeness.test.mjs「复入附录含评审六值」「首见渲染出真值」
FR-02: test/step-guide-dyn-completeness.test.mjs「掩码表覆盖三 token」
FR-03: test/step-guide-dyn-completeness.test.mjs「路径警告双向覆盖」（措辞面为文本断言；对消费仓的实际引导效果靠人工评审）
FR-04: test/step-guide-dyn-completeness.test.mjs 全部用例 + step-guide 族既有测试 + npm run lint（收口亲测）
