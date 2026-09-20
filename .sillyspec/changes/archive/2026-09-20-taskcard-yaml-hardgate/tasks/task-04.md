---
id: task-04
title: 'tests: three real bad-YAML cards as fixtures + hardgate suite + contract migration'
title_zh: '测试——三张真实坏卡夹具 + 硬门禁用例 + 既有契约迁移，相关测试全绿'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 22:27:08
priority: P0
depends_on: ['task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-001@v2]
allowed_paths:
  - test/fixtures/taskcard-bad-yaml/task-01.md
  - test/fixtures/taskcard-bad-yaml/task-02.md
  - test/fixtures/taskcard-bad-yaml/task-03.md
  - test/taskcard-frontmatter-hardgate.test.mjs
  - test/acceptance-matrix-probe.test.mjs
  - test/cross-task-contracts.test.mjs
  - test/plan-adopt-waves.test.mjs
target_files:
  - NEW:test/fixtures/taskcard-bad-yaml/task-01.md
  - NEW:test/fixtures/taskcard-bad-yaml/task-02.md
  - NEW:test/fixtures/taskcard-bad-yaml/task-03.md
  - NEW:test/taskcard-frontmatter-hardgate.test.mjs
  - test/acceptance-matrix-probe.test.mjs
  - test/cross-task-contracts.test.mjs
  - test/plan-adopt-waves.test.mjs
related_tests:
  - test/taskcard-duplicate-key.test.mjs
  - test/plan-postcheck-crlf.test.mjs
expects_from:
  task-02:
    - contract: 'FeasibilityStep0bHardGate'
      needs:
        - 'validatePlanFeasibility 坏卡 ERROR 含文件:行:列'
        - 'parseTaskContracts yamlError 显式降级键'
        - '重复键双报豁免'
  task-03:
    - contract: 'ParseTaskAcceptanceTriState'
      needs:
        - 'status 三态（no-frontmatter / invalid-yaml / ok）'
goal: >
  以 multi-agent-platform 三张真实坏卡（2026-09-20-scope-audit-cross-repo-platform 变更
  tasks/task-01|02|03.md 整卡拷贝，坏行 20/22/26）为夹具，断言三症状消失（门禁空过、
  yamlError 冒充、假防御文案）+ 好卡零回归；迁移 parseTaskAcceptance 契约断言与
  cross-task-contracts 邻接用例。
implementation:
  - 拷贝三张原卡到 test/fixtures/taskcard-bad-yaml/（LF 原样，不改内容——坏卡就是夹具）
  - 新建 test/taskcard-frontmatter-hardgate.test.mjs：AC-01 parseTaskFrontmatter 行:列断言（20/22/26）；AC-02 validatePlanFeasibility 坏卡阻断；AC-03 parseTaskContracts yamlError；AC-04 validateCrossTaskContracts 坏卡零假阳性；AC-05 parseTaskAcceptance 三态；AC-06 renderProbe7Lines fmError 行；AC-07 重复键双报豁免
  - test/acceptance-matrix-probe.test.mjs：155-159 五条断言迁移到 status 三态契约（非法 YAML 从断言空数组改为断言 status 为 invalid-yaml）
  - test/cross-task-contracts.test.mjs：既有容错用例补 yamlError 断言（provides 仍空、yamlError 非 null）
  - test/plan-adopt-waves.test.mjs：§4c 夹具 deps 去预引号——原 ["'task-02'"] 经 card() 再包引号成双重引号=真非法 YAML，旧门禁不整体解析漏过、0b 硬拦后暴露（verify 门全量发现的连带债，修夹具数据不弱化断言）
acceptance:
  - 新用例文件全部通过且覆盖 AC-01 至 AC-07
  - 迁移后 acceptance-matrix-probe 与 cross-task-contracts 全绿
  - 相关邻接测试（taskcard-duplicate-key / plan-postcheck-crlf / parse-repo）全绿
verify:
  - node --test test/taskcard-frontmatter-hardgate.test.mjs test/acceptance-matrix-probe.test.mjs test/cross-task-contracts.test.mjs test/taskcard-duplicate-key.test.mjs test/plan-postcheck-crlf.test.mjs test/parse-repo.test.mjs
constraints:
  - 不修 multi-agent-platform 仓原卡（修工具不修数据）
  - 夹具保持原样字节（含坏行）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
