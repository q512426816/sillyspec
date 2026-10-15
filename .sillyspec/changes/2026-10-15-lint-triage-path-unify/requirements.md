---
author: flow-machine-draft
created_at: 2026-10-15T10:34:31.849Z
---
# 需求规格（Requirements）— 2026-10-15-lint-triage-path-unify

## 功能需求

### FR-01: lintOwnershipDowngrade 语义：pre-existing→true+降档 warning；owned/unattributable/鉴定链异常→false（保守硬拦）

- lintOwnershipDowngrade 必须在归属鉴定为 pre-existing（失败提及文件 × 本变更文件集零交集）时返回 true 并打印降档 warning（含存量债文件清单）；owned、unattributable 与鉴定链异常必须返回 false（保守硬拦，禁止借异常路径放行）。

#### 场景：主路径

Given lint 失败文件全部在本变更文件集外；When lintOwnershipDowngrade；Then 返回 true + warning 列出存量债文件。Given 失败文件与本变更有交集 / failureFiles 为空 / importer 抛错；Then 返回 false 且不打印降档 warning。

### FR-02: gates.js 与 verify-quality-scan.js 两路径同源接线（无复制粘贴分叉）

- gates.js 与 verify-quality-scan.js 的 lint 降档判定必须经同一 lintOwnershipDowngrade helper（禁止任一路径保留内联 triage 实现）；质量扫描路径 throw 条件必须为 lintBlocked && !lintAdvisoryDowngraded，且降档判定必须限定在 lint 单独失败（testFailed 优先 throw）。

#### 场景：主路径

Given 两源文件；When 源级断言；Then gates.js/verify-quality-scan.js 均含 helper 调用、gates 无 `let lintOwnership = null` 残留、scan throw 条件带降档豁免且降档判定在 `if (lintBlocked && !testFailed)` 内。

### FR-03: 新增 test/lint-ownership-path.test.mjs 覆盖 helper 四态 + 两路径源级接线断言，全绿

- test/lint-ownership-path.test.mjs 必须覆盖 helper 四态（pre-existing/owned/unattributable/鉴定链异常）与两路径源级接线断言，且必须全绿（node --test）。

#### 场景：主路径

Given 注入式 importer 四态与两源文件；When node --test test/lint-ownership-path.test.mjs；Then 5/5 通过。

### FR-04: flow done 实测门（npm test + npm run lint）通过

- flow done 收口实测门（npm test + npm run lint）必须通过——触及 src/test 的改动由 CLI 亲自实测收口。

#### 场景：主路径

Given 本变更触及 src/run 与 test/；When flow done；Then npm test 与 npm run lint 全绿放行。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/lint-ownership-path.test.mjs「pre-existing（零交集存量债）→ 返回 true 放行 + 打印降档 warning（含存量债文件名）」
FR-01: test/lint-ownership-path.test.mjs「owned（失败文件与本变更有交集）→ 返回 false 维持硬拦」
FR-01: test/lint-ownership-path.test.mjs「unattributable（无可识别失败文件）→ 返回 false 保守硬拦」
FR-01: test/lint-ownership-path.test.mjs「鉴定链异常（importer 抛错）→ 返回 false 保守硬拦」
FR-02: test/lint-ownership-path.test.mjs「源级接线：gates.js 与 verify-quality-scan.js 两路径均走 lintOwnershipDowngrade（防分叉复发）」
FR-03: test/lint-ownership-path.test.mjs（同文件 5 用例整体承载——实跑 5/5 绿）
FR-04: 不适用：CLI 收口实测门本身（npm test 含本文件即为承载）
