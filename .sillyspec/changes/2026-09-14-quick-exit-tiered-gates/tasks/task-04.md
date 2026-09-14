---
id: task-04
title: 'rewrite-scale-rule-and-mirror-init-template'
title_zh: '规则面——AGENTS.md 判规模条款改写+init 模板镜像'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 10:02:07
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - AGENTS.md
  - templates/agents-instruction.md
target_files:
  - AGENTS.md
  - templates/agents-instruction.md
goal: >
  把 AGENTS.md 第 6 条（必要时第 4 条）的选道判据从「≤3 文件、范围明确走 quick」改为「本次改动有无需要落盘的设计决策」（有→完整流程，无→quick），文件数降为出口绊线提法，并在 templates/agents-instruction.md 同步镜像（init 生成面），消除文件数主判据的规则源头（FR-01，D-001@v1）。
implementation:
  - 改写 AGENTS.md 第 6 条——选道主判据改为「本次改动有无需要落盘的设计决策」（有→完整流程，无→quick），「≤3 文件、范围明确」不再作为选道判据，文件数仅在出口绊线提法中出现（选错道代价由 quick --done 分级门禁兜底）
  - 第 4 条 quick 适用描述同步（小修复/小调整=无设计决策落盘需求的改动），与第 6 条新口径一致，quick 命令与流程本身不变
  - templates/agents-instruction.md 同步镜像第 6 条（及第 4 条）改写——init 生成面与仓根 AGENTS.md 口径逐字一致（producer=规则定稿 → 模板镜像 → consumer=后续 init 新项目）
  - 改写后全文核查——其余条款语义零变化、无新增流程步骤、保持中英混排风格与现有行文（加粗/编号/引用格式不动）
acceptance:
  - AGENTS.md 第 6 条（及同步的第 4 条）不再以文件数（≤3 文件等）作为选道主判据，主判据为「有无需要落盘的设计决策」
  - templates/agents-instruction.md 对应条款与 AGENTS.md 关键句逐字对照一致（口径零漂移）
  - 除选道判据相关表述外其余条款语义、流程步骤数、行文风格零变化
verify:
  - git grep -n 设计决策 -- AGENTS.md templates/agents-instruction.md（两文件同现，关键句一致）
  - git diff -- AGENTS.md templates/agents-instruction.md（复核改动面仅限选道判据相关行）
constraints:
  - 不改其他条款语义、不新增流程步骤、保持中英混排风格与现有行文
  - 只动规则文案——quick 命令行为与代码面归 task-01/02/03，本 task 不触代码
  - 模板镜像必须与 AGENTS.md 关键句逐字一致，不允许模板侧意译
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
