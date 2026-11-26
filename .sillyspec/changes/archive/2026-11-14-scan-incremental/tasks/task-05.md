---
id: task-05
title: '文档同步（file-lifecycle/prompt 镜像/skill）'
title_zh: '文档同步（file-lifecycle/prompt 镜像/skill）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-14 22:24:56
priority: P1
depends_on: [task-03, task-04]
blocks: []
requirement_ids: [FR-08]
decision_ids: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/_extracted.json
  - docs/prompt/scan.md
  - docs/prompt/README.md
  - .claude/skills/sillyspec-scan/SKILL.md
target_files:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/_extracted.json
  - docs/prompt/scan.md
  - .claude/skills/sillyspec-scan/SKILL.md
goal: >
  履行 CLAUDE.md 双同步义务：触及 src/stages/scan.js 后同步 file-lifecycle.md
  （新运行时文件条目）与提示词镜像（_extract.mjs 重跑 + scan.md 逐字同步 + skill 同步）。
implementation:
  - docs/sillyspec/file-lifecycle.md：新增条目——.sillyspec/.runtime/scan-incremental-plan.json（生命周期：启动层写入/编排与 finalize 共读/scan 结束保留供审计/下次覆盖）与 docs/<project>/scan/_module-map-audit.md（对账报告，_ 前缀非基线载体）；guard mode='scan-incremental' 握手语义补注；更新头部 updated_at
  - 运行 node docs/prompt/_extract.mjs（刷新 docs/prompt/_extracted.json——stages/scan.js prompt 已被 task-04 改动）
  - docs/prompt/scan.md：按 _extracted.json 逐字替换 prompt 正文（禁止手改正文）；README.md 占位符总表如有新注入块（增量计划标记块）补行
  - .claude/skills/sillyspec-scan/SKILL.md：scan skill 说明补增量模式段（自动判定/--incremental/--force-incremental/降级语义/对账报告位置）
acceptance:
  - file-lifecycle.md 含两个新运行时文件条目且 updated_at 已更新；与代码实际文件名一致（validateFileLocations 口径）
  - node docs/prompt/_extract.mjs 重跑成功且 scan.md 与 _extracted.json prompt 正文逐字一致（无手改残留）
  - SKILL.md 增量模式段与 design 语义一致（自动判定/降级/对账）
verify:
  - node docs/prompt/_extract.mjs && git diff --stat docs/prompt/（镜像再生成功，改动仅限 task-04 触发的真实差异）
constraints:
  - 纯文档同步：不改 src/ 任何文件（发现代码与文档矛盾 → 回报主代理，不代改）
  - prompt 正文以 _extracted.json 为准逐字替换，禁止手改 md 里的 prompt 原文
  - 不跑全量测试（本任务无代码面）
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
