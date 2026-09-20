---
id: task-03
title: 'verify-side: parseTaskAcceptance tri-state contract + probe 7 invalid-YAML rendering split'
title_zh: 'verify 侧——parseTaskAcceptance 三态契约 + 探针 7 按 fmError 区分坏 YAML 与真无 acceptance 文案'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 22:27:08
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03, FR-04]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-probes.js
target_files:
  - src/verify-probes.js
provides:
  - contract: 'ParseTaskAcceptanceTriState'
    fields:
      - 'status 三态（no-frontmatter / invalid-yaml / ok）'
expects_from:
  task-01:
    - contract: 'TaskcardFrontmatterParse'
      needs:
        - 'parseTaskFrontmatter 返回 ok/hasFrontmatter/fm/error 四键'
        - 'error.line 为文件 1 基行（js-yaml mark.line + 2）'
        - 'error.column 为 1 基列（mark.column + 1）'
goal: >
  verify 侧如实陈述坏 YAML：parseTaskAcceptance（src/verify-probes.js:1722）内部改用共享
  解析源，返回契约从 数组或null 扩为对象三态（status 为 no-frontmatter / invalid-yaml / ok，
  acceptance 恒为数组，error 仅 invalid-yaml 非 null）；探针 7 构建（:2141 调用点）按 status
  分流并把 fmError 挂进 task 条目；renderProbe7Lines（:1942 分支）优先判 fmError——坏卡渲染
  frontmatter 非法 YAML 行，真无 acceptance 的合法卡保留原防御行。
implementation:
  - parseTaskAcceptance 内部改用 task-01 的 parseTaskFrontmatter；no-frontmatter 时 status 为 no-frontmatter、acceptance 为空数组；invalid-yaml 时 status 为 invalid-yaml、error 为 error 对象；ok 时沿用 string/array 双形态归一为数组
  - 探针 7 构建（src/verify-probes.js:2141）：status 为 no-frontmatter 时 continue 跳卡（原 null 语义）；invalid-yaml 时 cards.push 挂 fmError；映射进 probe7.tasks 时透传 fmError
  - renderProbe7Lines（src/verify-probes.js:1942 分支）：条目有 fmError 时输出「frontmatter 非法 YAML（task-NN.md:行:列 message）——acceptance 不可读，本行非无 acceptance 防御；plan 门禁硬校验应已拦截，若已过 plan 门仍见此行即门禁失效信号」；无 fmError 且 acceptance 空时保留原「卡无 acceptance——防御，plan-postcheck 已拦」行
  - ensureAcceptanceMatrixSection 补段路径与骨架路径共用 renderProbe7Lines，自动继承区分行为（无单独改动）
acceptance:
  - 坏卡输入 parseTaskAcceptance 返回 status 为 invalid-yaml、acceptance 为空数组、error 非 null
  - 无 frontmatter 输入返回 status 为 no-frontmatter；合法输入返回 status 为 ok 且数组归一
  - renderProbe7Lines 对挂 fmError 的条目输出 frontmatter 非法 YAML 行且不输出防御行；真无 acceptance 合法条目保留防御行
verify:
  - node --test test/acceptance-matrix-probe.test.mjs test/taskcard-frontmatter-hardgate.test.mjs（task-04 落地后）
constraints:
  - 仓内调用方仅 :2141 一处（plan 审查实证），契约变更收口于此与直测
  - 不改 renderVerifyProbesReport 其他探针段
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
