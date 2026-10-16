---
author: flow-machine-draft
created_at: 2026-10-16T07:44:31.079Z
---
# 需求规格（Requirements）— 2026-10-16-probe7-prefill-noise-fix

依据：multi-agent-platform 仓 docs/sillyspec/verify-probe7-matrix-prefill-four-defects.md（commit caa6b1fa2）四条期望修复 + 修复建议汇总。全部标准转写自该记录，非推断。

## 功能需求

### FR-01: 部署/文档类条目直接 non-testable，FR 候选池不再灌水

- 必须：验收条目命中 `PROBE7_NONTESTABLE_RE`（文档/部署/doc/deploy/manual/config 类词）时，判定列直接预填 `non-testable`，不再参与关键词命中→covered/partial 链。
- 必须：卡内全部 acceptance 条目均命中该正则时，不得注入 FR 关联回归候选池（`collectFrLinkedTests` 结果），单格归属列不得出现长清单。

#### 场景：compose 配额验收卡（backend-mem-polling task-09 复现形态）

- Given 卡 allowed_paths 指向 compose/Dockerfile（无测试形态条目），acceptance 含部署类词
- When 运行 runVerifyProbes 生成探针 7 矩阵
- Then 该卡每行判定 = non-testable；无 FR 既有用例注入（existingTests 为空）；归属列无 130+ 文件清单

### FR-02: covered 仅测试函数名/用例名级命中，正文命中封顶 partial

- 必须：判定 `covered` 的前置信号仅为「归属测试文件中存在测试名级命中」——Python `def test_*` / `class Test*` 行，或 JS 系 `test(` / `it(` / `describe(`（含 `.each` 等链式变体）行内命中关键词。
- 必须：关键词仅命中测试文件正文（注释/docstring/字符串主体等非测试名行）时，判定最多 `partial`，证据注明「正文级命中——待人工核验」。
- 必须：covered 证据锚点取自测试函数名所在行（file:line，行号=def/it 行），并引用测试名；禁止再取关键词首现行号作锚点。

#### 场景：docstring 里的 config 字样（假 covered 复现形态）

- Given 验收条目含 "config"，归属测试文件的 docstring 有 "config" 字样但无测试名级命中
- When 矩阵预填
- Then 判定 = partial（非 covered）；证据不含关键词行号锚点

#### 场景：测试名级命中

- Given 验收条目的关键词出现在 `def test_xxx_send_rpc...` 或 `it('xxx')` 名称行
- When 矩阵预填
- Then 判定 = covered；证据 = `` `file:def行号`（测试名） ``

### FR-03: 同波次新增/修改测试文件零字面命中时 covered+待人工复核

- 必须：归属测试文件出现在本波次 review changedFiles（测试形态路径）中且条目录得零字面命中时，判定预填 `covered`，证据带「同波次新增/修改——待人工复核」注记（该文件集独立于结构归属三源，仅为提升信号）。
- 可以：下游消费卡的同波次测试文件对 provider 卡同等生效（与跨卡归属口径一致）。

#### 场景：真 covered 误标 partial 复现形态

- Given 新测试文件（review changedFiles 在场）正确归属但测试名是验收条目同义改写（字面零交）
- When 矩阵预填
- Then 判定 = covered + 待人工复核注记（不再 partial；agent 复核可降级）

### FR-04: 候选 >5 交人工，单元格禁止长清单

- 必须：卡的候选归属文件数 >5 且无测试名级收窄命中时，每行判定 = `uncovered`，证据注明「候选 N 个——归属不可判定，交人工核验」。
- 必须：归属列与命中提示列的展示均设 5 帽 + 「共 N 个」折叠，长清单只进 facts/trace，不进单元格。

#### 场景：宽目录候选

- Given 单卡候选 82 个测试文件
- When 矩阵预填
- Then 行判定 = uncovered（交人工）；归属列 ≤5 展示 + 「…共 82 个」；提示列 ≤5 文件 + 折叠

### FR-05: 判定优先级链固定（新契约单一来源）

- 必须：预填判定按固定优先级：①测试名级命中→covered；②条目命中 NONTESTABLE 词→non-testable；③无归属→uncovered；④候选>5→uncovered（交人工）；⑤正文级命中→partial；⑥同波次测试（零命中）→covered+待人工复核；⑦其余有归属零命中→partial。
- 必须：五枚举（covered/covered-service/partial/uncovered/non-testable）全为纯值，全部新证据形态满足 stage-contract 门禁（covered/partial 含反引号种锚点、non-testable 非空）。

#### 场景：门禁 round-trip

- Given 预填渲染的骨架
- When extractAcceptanceMatrixSlots 解析
- Then unfilled=0 且 missingEvidence=0

### FR-06: 既有行为零回归

- 必须：无归属 uncovered、no-frontmatter 跳卡、invalid-yaml 防御行、段在场 no-op、幂等补段、trace 落盘、runId 双路解析、多根读取、跨卡归属并入等既有契约零变化（除 FR-01~05 显式改写项）。
- 必须：既有测试面更新仅限「被本记录显式判定为缺陷的断言」（如注释级命中历史断言 covered 的用例改为断言新契约 partial）。

#### 场景：既有探针 7 测试面

- Given 本变更实现完成后
- When 跑 npm run test:core 相关用例
- Then probe7 全测试面绿（含改写后的 acceptance-matrix-probe / testpath-anchor / pitfall-noise）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/probe7-prefill-noise.test.mjs「FR-01 部署类条目 non-testable 且全条目命中卡不注入 FR 池」；test/probe7-fr-prefill.test.mjs「P4 全部署类条目卡不注入 FR 候选池」
FR-02: test/probe7-prefill-noise.test.mjs「FR-02 正文命中封顶 partial 且锚点禁关键词行」；test/probe7-prefill-noise.test.mjs「FR-02 测试名级命中 covered 且锚点指向测试函数行」
FR-03: test/probe7-prefill-noise.test.mjs「FR-03 同波次新增测试零命中预填 covered+待人工复核」
FR-04: test/probe7-prefill-noise.test.mjs「FR-04 候选>5 交人工且 hints 跳过」；test/pitfall-probe7-noise.test.mjs「FR-10：82 文件截断为 5 + 「共 82 个」折叠，路径转义不破表」
FR-05: test/acceptance-matrix-probe.test.mjs「门禁 round-trip：预填渲染直过 extractAcceptanceMatrixSlots」；test/probe7-prefill-noise.test.mjs「FR-05 优先级链固定（七级）」
FR-06: test/acceptance-matrix-probe.test.mjs（结构归属/幂等补段/双形态解析既有小节）；test/probe7-fr-prefill.test.mjs「P1/P2/P3」；test/probe7-testpath-anchor.test.mjs；test/cross-repo-probe7-anchor.test.mjs
