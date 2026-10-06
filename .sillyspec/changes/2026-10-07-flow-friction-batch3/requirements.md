---
author: flow-machine-draft
created_at: 2026-10-06T16:13:04.411Z
---
# 需求规格（Requirements）— 2026-10-07-flow-friction-batch3

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: gate execute/verify 默认档新增 stage-review informational 检查：缺 review.json 时 warning 含 register-stage-review 指引、在场时静默 ok；--full 档 full-stage-review 的 error 语义与 id 均不变（默认档用独立 check id 不碰撞）

runGate 默认档（无 --full）对 execute/verify 必须附 `stage-review-hint` informational 检查（ok 恒 true 不改变 envelope 结论与 exit code）：缺该阶段 review.json 时 warning 必须含 register-stage-review 命令指引，在场时必须零 warning 静默；--full 档的 `full-stage-review` 检查 id 与 error 语义禁止变化。

#### 场景：缺 review 的默认档提示

Given execute 变更未注册 stage review / When gate execute（默认档）/ Then checks 含 stage-review-hint（informational、ok=true）且 warning 含 register-stage-review 指引，envelope 结论与不设该检查时一致。

#### 场景：--full 不回归

Given 同上 / When gate execute --full / Then full-stage-review 在场、ok=false（缺 review 即 error），id 与既有消费方契约一致。

### FR-02: design_file_ref_invalid 报错：根下存在 basename 相同的既有文件时附「相近既有路径：…」（至多 3 条），无相近时不附建议段（不加噪）；NEW: 前缀提示保留

validateDesignFileList 的存在性报错在扫描根下存在 basename 全等命中时必须附「相近既有路径：」（≤3 条，跳过 node_modules/.git 等重目录）；零命中时禁止附加建议段；NEW: 前缀豁免与既有提示文案必须保留。

#### 场景：缺前缀幻觉

Given 根下有 backend/app/modules/x.py 而 design 清单写 app/modules/x.py / When 校验 / Then 报错含「相近既有路径：backend/app/modules/x.py」与 NEW: 提示。

#### 场景：零命中零加噪

Given 清单路径的 basename 在根下无同名文件 / When 校验 / Then 报错不含「相近既有路径」段。

### FR-03: 同 Wave 共享文件 error 文案含 plan-adopt-waves 一键重排指引；伪并行串行链报错（既有）不回归

同 Wave 多 task 共享 allowed_path 的 plan-postcheck error 必须含 `sillyspec plan-adopt-waves` 一键重排指引（手工拆 Wave 是踩坑路径——非合法 Wave 号→伪并行串行链）；既有的伪并行串行链报错指引禁止回归。

#### 场景：冲突指路

Given Wave 1 内 task-01/task-02 均改 src/shared.js / When validateBlueprintConsistency / Then error 含「被 Wave」与「plan-adopt-waves」。

### FR-04: sillyspec module-impact --change <名> --fill-skipped [--reason "..."]：pending/待办行状态改 skipped、--reason 追加进操作列、其余内容逐字不动；无 module-impact.md 或无更新结果表时 exit 2 报错；幂等（重跑零改动）

`sillyspec module-impact --change <名> --fill-skipped [--reason]` 必须只把「更新结果」表内 pending/待办/未同步/not-done/todo 行的状态列改为 skipped（--reason 以「——skipped：<reason>」追加进操作列），表外内容与 done 行逐字不动；文件缺失或无该表必须 exit 2；重跑必须零改动（幂等）。回填必须与 verify 门 extractPendingDocSyncRows 同一解析口径（回填后门不再拦）。

#### 场景：批量回填

Given 更新结果表 2 行 pending/待办 + 1 行 done / When --fill-skipped --reason "模块卡同步并入下批" / Then 两行状态变 skipped 且操作列含原因、done 行与矩阵章节逐字不动、退出码 0；再跑一次零改动。

#### 场景：缺文件拒跑

Given 变更目录无 module-impact.md / When 同命令 / Then exit 2 且报错点名文件。

### FR-05: execute 收口对 UI 触达且缺 visual-evidence.md 的变更打前置 advisory（warn 级，含落盘路径与 verify 执法提示）；非 UI 变更零输出零行为变化

execute --done 的 gates 对 UI 触达（探针 12 同源判定）且 visual-evidence.md 缺失的变更必须打 warn 级 advisory（含证据落盘路径与 verify 将执法的提示），禁止阻断 execute；非 UI 变更或证据在场时必须零输出零行为变化；verify 收口的 error 档执法语义禁止变化。

#### 场景：前置提醒

Given design 清单含前端 .tsx 且变更目录无 visual-evidence.md / When execute --done 收口 / Then console.warn 含 visual-evidence.md 路径与 verify 提示，execute 正常完成。

#### 场景：零打扰

Given 非 UI 变更 / When execute --done 收口 / Then 无该 advisory 输出。

### FR-06: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

新增三个测试文件（gate-stage-review-hint/design-ref-suggest/flow-friction-batch3）必须收录进 package.json 的 test:core 清单；收口时 test:core 必须全绿（300 用例 0 失败）且 npm run lint 必须 0 报错。

#### 场景：主路径

Given 本变更全部实现合入 / When npm run test:core 与 npm run lint / Then 均零失
败退出（CLI 冒烟另证：module-impact --fill-skipped 真实落盘、gate 默认档出 hint）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/gate-stage-review-hint.test.mjs「H1 默认档：缺 review → stage-review-hint informational + register 指引；在场 → 静默 ok」「H1b 默认档 verify 同款提示」「H2 --full 档 full-stage-review 的 id 与 error 语义不变」
FR-02: test/design-ref-suggest.test.mjs「S1 幻觉路径：报错附相近既有路径（basename did-you-mean）」「S2 无相近/NEW: 前缀：不加建议段不误报」
FR-03: test/flow-friction-batch3.test.mjs「W1 同 Wave 共享文件 error 含 plan-adopt-waves 一键重排指引」
FR-04: test/flow-friction-batch3.test.mjs「F1 fillModuleImpactSkipped：pending/待办→skipped、reason 进操作列、done 行不动、幂等」「F2 CLI：--fill-skipped 落盘生效；缺 module-impact.md exit 2」
FR-05: test/design-ref-suggest.test.mjs「U1 UI 触达 + 证据缺失 → 前置 advisory 含落盘路径与 verify 执法提示」「U2 证据在场 / 非 UI → null 零打扰」
FR-06: test/gate-stage-review-hint.test.mjs「H2 --full 档 full-stage-review 的 id 与 error 语义不变」（连同全量 test:core 300 用例 0 失败 + lint 0 报错，见变更提交链）
