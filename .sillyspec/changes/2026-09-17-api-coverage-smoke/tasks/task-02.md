---
id: task-02
title: '机器段来源标记链——parseEvidenceSlots 逐条 source 提取 + 分类器双侧认标记直判 cross-layer + 回执槽 ensure 注入与缺态标注 + checkProbeConsistency 回执槽一致性对比'
title_zh: '机器段来源标记链——parseEvidenceSlots 逐条 source 提取 + 分类器双侧认标记直判 cross-layer + 回执槽 ensure 注入与缺态标注 + checkProbeConsistency 回执槽一致性对比'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:06:55
priority: P0
depends_on: ['task-01']
blocks: ['task-03', 'task-04']
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/verify-facts-schema.js
  - src/change-risk-profile.js
  - src/verify-probes.js
  - src/verify-postcheck.js
target_files:
  - src/verify-facts-schema.js
  - src/change-risk-profile.js
  - src/verify-probes.js
  - src/verify-postcheck.js
expects_from:
  task-01:
    - contract: smoke-exec-record
      needs: [smokeExit, smokeLog, smokeRanSource]
provides:
  - contract: smoke-receipt-marker
    fields: [parseEvidenceSlots.source, classifier-cross-layer, receipt-slot-machine-segment, consistency-check]
goal: |
  打通 smoke 机器段来源标记链四环——parseEvidenceSlots 逐条 source 提取（尾注回填）→
  classifyReceiptSourceTag／classifyReceiptCommandSource 双侧认标记直判 cross-layer（B-1 金路径闭合）→
  回执槽 ensure 式机器段注入与缺态标注 → checkProbeConsistency 增回执槽一致性对比防篡改（design §3，FR-03）。
implementation: |
  1. src/verify-facts-schema.js parseEvidenceSlots 扩逐条 source 字段提取——机器段行携带「｜source: cli-noai-smoke」尾注并可被解析回填：单行管道形态（:129-135）现于 log 段 m[4] 取首段时剥尾注弃置，改为同时提取尾注 source 回填条目；多行 YAML 形态（:139-158）从 fields.source 回填（stripPairedBackticks 同款）。四字段收取条件不动，source 为 additive 第五字段——无尾注条目 source 缺省，存量回执零回归。
  2. 分类器双侧认 CLI 机器段标记直判 cross-layer（Grill B-1 修正——改标记识别、非命令词增补：node scripts/smoke.mjs／bash smoke.sh／python smoke.py 脚本形态在既有正则下全判 build 会误拦金路径，且脚本形态词表不可枚举）。src/change-risk-profile.js classifyReceiptSourceTag（:315-329）与 src/verify-probes.js classifyReceiptCommandSource（:1699-1704）入口扩认 source 标记——条目 source='cli-noai-smoke' → 直判 cross-layer（优先于正则族短路）；沿既有 declaredSource 优先通道（change-risk-profile.js :438-440）或等价签名扩展，双侧消费点（change-risk-profile 集成回执检查／verify-probes judgeIntegrationRan :1737）同步传入条目 source；两处互指注释（change-risk-profile.js :304-314 与 verify-probes.js :1680-1689）同步改写。
  3. src/verify-probes.js 回执槽机器段 ensure 式注入（ensureAcceptanceMatrixSection :1905 先例），挂 backfill／骨架生成合并时点（quality-scan step 6 noAI 先于「输出验证报告」step 7 --init）：从 .runtime/verify-quality-scan-<change>.json smokeResult 读 task-01 契约字段渲染机器段（command／exit／log／mtime 实录 + source 标注 cli-noai-smoke）。幂等——段已在场（source 标注识别）跳过；存量 verify-result.md 无机器段 → 下次 quality-scan 亲跑后 ensure 补齐；agent 只可追加段、不可改写机器段。
  4. 缺态标注（design §3 / Grill #12）：未配置 → 槽段标 not-configured；配置未跑／超时 → 标 not-ran（exit／mtime 空）。
  5. src/verify-postcheck.js checkProbeConsistency 增回执槽机器段一致性对比（现 parseProbePrefillAnchors :2927-2935 只对比探针子节计数、不覆盖回执槽——Grill #6／R-06）：verify-result.md 机器段（command／exit／log／mtime）对 quality-scan 记录 json smokeResult 逐字段比对，agent 改写 → mismatch 打回；一致 → 放行。
acceptance: |
  - 机器段行（含「｜source: cli-noai-smoke」尾注）经 parseEvidenceSlots 解析 → 条目回填 source='cli-noai-smoke'（单行管道与多行 YAML 双形态）；无尾注条目 source 缺省、既有四字段解析零回归
  - source='cli-noai-smoke' 条目（命令为任意脚本形态，含 node scripts/smoke.mjs／bash smoke.sh／python smoke.py）→ classifyReceiptSourceTag 与 classifyReceiptCommandSource 双侧直判 cross-layer；无 source 条目分类结果与现状逐字节一致（正则族零词改动）
  - 回执槽机器段：quality-scan 亲跑后 ensure 注入且二跑零改动（幂等）；存量缺段文档下次亲跑后补齐；未配置 → not-configured；配置未跑／超时 → not-ran
  - checkProbeConsistency：机器段与记录 json smokeResult 任一字段不一致 → 打回；一致 → 通过（R-06 防篡改闭合）
  - npm test 全量通过（既有用例零回归）；npm run lint 通过
verify:
  - npm test
  - npm run lint
constraints: |
  - 分类器改标记识别、非命令词增补（B-1——脚本形态词表不可枚举且漂移，source 标记是唯一金路径；RECEIPT_SOURCE_CROSS_LAYER_RE／RECEIPT_CROSS_LAYER_RE 正则族两文件零词变动）
  - 双侧同步铁律：change-risk-profile.js 与 verify-probes.js 两分类器及互指注释必须同批改（G-3 先例——任一侧单动即口径分裂）
  - parseEvidenceSlots 四字段 fail-closed 收取条件不放宽、CRLF 归一口径不动（source 纯 additive）
  - 机器段唯一事实源 = .runtime 记录 json（R-06 双源兜底：md 被篡改不影响 facts 推导）；facts.smokeRan producer／第五条件归 task-03；probe7/probe8 语义不动（全局硬约束 4）
  - 本 task 不新增测试文件——测试面统一归 task-07；零新依赖、纯 JavaScript ESM、Node >= 22.13、跨平台 CRLF/LF 容忍（全局硬约束 1/2/6）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
