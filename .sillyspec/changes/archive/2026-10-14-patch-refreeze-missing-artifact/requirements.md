---
author: flow-machine-draft
created_at: 2026-10-14T03:20:22.130Z
---
# 需求规格（Requirements）— 2026-10-14-patch-refreeze-missing-artifact

## 功能需求

### FR-01: 冻结件存在性复查优先于子步状态

- `src/flow.js` patch 子步重入（`substeps.patch === 'done'`）**必须**先做冻结件存在性复查：`change-patch.json` 或 `change.patch` 任一缺席时**必须**打「冻结件缺失」warning 并按处置漂移同款语义自动重冻结（`driftRefreeze`），**禁止**静默幂等跳过；两件均在场时行为**必须**与现状逐字节一致（漂移检测、隔离、标记重置全保留）。

#### 场景：主路径

- Given patch 子步标记 done 且两冻结件被删除，When 重入 flow done，Then 输出含「冻结件缺失」且 change.patch/change-patch.json 重新生成（不再出现归档无冻结件）。

### FR-02: 缺件重冻结的 review 处置规则

- 缺件触发的重冻结**必须**沿用漂移面同一隔离规则：重冻结 HEAD 基准取当前 HEAD；`review.json` 的 `reviewedAgainst` 命中该 HEAD（anchored）**必须**保留不隔离；未锚定**必须**隔离为 `.superseded-<ts>` 并重置 review 标记重评（缺基面无法判 governance-only，fail-safe 宁可多评）；隔离 rename 失败**必须**回退现状幂等跳过（与漂移面 quarantineOk 语义一致）。

#### 场景：主路径

- Given 缺件且 review.json anchored 当前 HEAD，When 重入，Then review.json 保留、评审结论被消费；Given 缺件且 review.json 未锚定，When 重入，Then 产出 `review.json.superseded-*` 且重评任务书再现（exit ≠ 0）。

### FR-03: e2e 回归用例

- `test/flowdone-disposition-drift.test.mjs` **必须**新增两个 e2e 用例：④ 缺件 + anchored PASS 评审 → 重冻结 + 评审保留 + 直接归档成功（归档目录含重生成的两冻结件且含交付面）；⑤ 缺件 + 未锚定评审 → 隔离 + 重评任务书再现；既有用例（①②③）**必须**全部保持通过。

#### 场景：主路径

- Given 修改完成，When 运行 `node --test test/flowdone-disposition-drift.test.mjs`，Then 全部用例（新增 + 既有）通过。

### FR-04: 全量门禁

- `npm test` 与 `npm run lint` **必须**全绿（flow done 实测门亲自跑）。

#### 场景：主路径

- Given 收口，When flow done 实测，Then 两命令 EXIT=0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flowdone-disposition-drift.test.mjs「④ e2e：冻结件缺失重入——存在性复查触发自动重冻结 + anchored 评审保留 + 直接归档」
FR-02: test/flowdone-disposition-drift.test.mjs「④ …」（anchored 保留）+「⑤ e2e：冻结件缺失 + 评审未锚定——隔离重评」（隔离/回退）
FR-03: test/flowdone-disposition-drift.test.mjs「④/⑤」（并全量回归本文件既有用例）
FR-04: 不适用：全量门禁由 flow done 实测（npm test + npm run lint），非单测用例面
