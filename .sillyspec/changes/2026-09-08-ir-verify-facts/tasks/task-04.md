---
id: task-04
title: '集成回执一致性校验'
title_zh: '集成回执一致性校验'
author: 'qinyi'
created_at: 2026-09-08 23:16:18
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-003@v1]
allowed_paths:
  - src/change-risk-profile.js
  - src/stage-contract.js
  - NEW:test/verify-receipt-rerun.test.mjs
target_files:
  - src/change-risk-profile.js
  - src/stage-contract.js
  - NEW:test/verify-receipt-rerun.test.mjs
expects_from:
  needs: task-01: parseEvidenceSlots（回执槽解析）与 runtimeEvidence 槽段形态
goal: >
  集成证据从 literals 蹭词升级为回执槽一致性校验（绿判据四条件可测），literals 降 legacy 回退，不代跑（FR-04）。
implementation:
  - change-risk-profile.js checkIntegrationEvidence v2：签名加 opts { runtimeEvidence, verifyStartAt, cwd, specBase, extraEvidenceText }；每条回执核 logPath 存在 × mtime ∈ verify 窗口 × 日志尾 200 行失败签名扫描（噪声剔除：行首匹配 + 剔除「0 errors」类良性行，引 verify-postcheck.js:679-725 先例）× exitCode===0；全绿=在场证据；failSignatures>0 或 exit≠0 → 不可用（warning 列原因）；extraEvidenceText（verify-services 回执注入）保留合并为补充候选文本
  - stage-contract.js:613 调用点：validateVerifyOutputs 读 verify-result.md 经 parseEvidenceSlots 取 runtimeEvidence，传 v2 opts；md 无回执槽 → legacy literals 回退 + warning（存量兼容）
  - 新建 test/verify-receipt-rerun.test.mjs（回执部分）：绿判据四条件正反例/签名噪声剔除（「0 errors」不计数）/mtime 出窗/exit≠0/槽缺失 legacy 回退/extraEvidenceText 合并
acceptance:
  - integration-critical 且无绿回执且无 risk_level 豁免 → ERROR（判据从字面变结构）
  - 「0 errors」类良性行不计失败签名（噪声剔除有单测）
  - 存量无槽 md → literals 回退 + warning，行为等同现状
  - 无任何代跑代码（不 spawn 集成进程）
verify:
  - node --test test/verify-receipt-rerun.test.mjs
  - node --test test/stage-contract.test.mjs
constraints:
  - 不改 runVerifyRequiredEvidenceCheck（task-02）
  - 不动 frontmatter risk_level 豁免通道
  - 回执槽段标题「## 集成验证回执」与 task-01 渲染逐字一致
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
