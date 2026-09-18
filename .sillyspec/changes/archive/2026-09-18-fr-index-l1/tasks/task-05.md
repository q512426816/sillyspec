---
id: task-05
title: 'Add D14 fourth check: FR index presence + supersede completeness (epoch-bounded)'
title_zh: 'D14 第四检查——doctor-diagnostics.js archive_integrity 加 epoch 分界检查（索引在场+取代完整，并入 offenders；豁免走既有账本；quick/scale:small 豁免面）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:16:22
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-007@v1, D-008@v1]
allowed_paths:
  - src/doctor-diagnostics.js
expects_from:
  task-02: 'FR_INDEX_EPOCH 常量 + 索引条目格式（来源变更/状态字段）'
goal: >
  D14 长出第四检查：epoch 后归档的 FR 索引在场性与取代完整性，机制复用零新账本。
implementation:
  - archive_integrity 维度：日期前缀 ≥ FR_INDEX_EPOCH 的归档目录（quick-<8hex> 前缀与无 requirements.md 者豁免——无 requirements 无索引义务）
  - 检查①在场：变更名须在 knowledge/fr/**/*.md 的「来源变更」字段出现；缺失→offender reason「FR 索引缺失（epoch 后归档应有索引条目）」
  - 检查②取代完整：该归档 requirements.md 含承接行但对应旧条目未翻 superseded→offender reason「承接未翻取代」
  - 违者并入现有 offenders 机制（豁免走 archive-integrity-exempt.yaml 零新增）；fr/ 目录不存在→epoch 后归档也豁免（仓未启用索引）
acceptance:
  - epoch 前归档零新检查；epoch 后无索引目录时按「仓未启用」豁免不误报
  - fixture：epoch 后归档+索引在场+取代完整→pass；缺条目/未翻链→offender
verify:
  - node test/doctor-archive-integrity.test.mjs（task-06 补组后全绿）
constraints:
  - 只改 doctor-diagnostics.js；只读纪律不变
  - 不新建豁免机制（复用既有账本）
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
