---
id: task-10
title: '文档镜像——file-lifecycle 阶段表+archive 3→4、_extract.mjs staticStages 删 ''verify'' 后重跑、AGENTS/CLAUDE/.claude-CLAUDE 五阶段→四阶段、skills 更新、module-map paths、conventions.md:47-53 段修订（依赖 task-08）'
title_zh: '文档镜像——file-lifecycle 阶段表+archive 3→4、_extract.mjs staticStages 删 ''verify'' 后重跑、AGENTS/CLAUDE/.claude-CLAUDE 五阶段→四阶段、skills 更新、module-map paths、conventions.md:47-53 段修订（依赖 task-08）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:10
priority: P0
depends_on: [task-08]
blocks: []
requirement_ids: [FR-01, FR-06, FR-07]
decision_ids: [D-003@v1, D-007@v1]
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/_extract.mjs
  - docs/prompt/_extracted.json
  - docs/prompt/verify.md
  - AGENTS.md
  - CLAUDE.md
  - .claude/CLAUDE.md
  - .claude/skills/sillyspec-verify/SKILL.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - .sillyspec/knowledge/conventions.md
target_files:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/_extract.mjs
  - docs/prompt/_extracted.json
  - docs/prompt/verify.md
  - AGENTS.md
  - CLAUDE.md
  - .claude/CLAUDE.md
  - .claude/skills/sillyspec-verify/SKILL.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - .sillyspec/knowledge/conventions.md
goal: >
  文档镜像同步四阶段语义：file-lifecycle 阶段表、prompt 提取（先改脚本再重跑）、AGENTS/CLAUDE 五阶段改四阶段、skills、module-map paths、conventions 整段修订。
implementation:
  - docs/sillyspec/file-lifecycle.md：verify 行删除、archive 行改 4 步（顺带修正旧值 archive 5）、updated_at 更新、本仓 local.yaml unavailable 关闭态说明补记
  - docs/prompt/_extract.mjs:68 staticStages 数组删 verify（顺序铁律：先改脚本再重跑，否则 import verify.js 失败）→ node docs/prompt/_extract.mjs 重跑镜像（_extracted.json 再生成、verify.md 删除）
  - AGENTS.md/CLAUDE.md/.claude/CLAUDE.md：完整流程五阶段改四阶段（brainstorm/plan/execute/verify/archive 字样逐处修订，含选道表与规则 3）
  - .claude/skills/：sillyspec-verify 目录删除；auto/continue/flow 等提及 verify 的 skill 更新为四阶段
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml：paths 删 verify 族文件、verify-quality-scan 更名条目同步
  - .sillyspec/knowledge/conventions.md:47-53 整段修订（StageEnum 的 VERIFY 节点、:52 禁止跳态条目改「verify 已退役，execute 到 archive 为合法转换」）
acceptance:
  - node docs/prompt/_extract.mjs 零报错且产物无 verify 段
  - grep -rn "execute → verify\|run verify" AGENTS.md CLAUDE.md .claude/CLAUDE.md docs/sillyspec/file-lifecycle.md 零命中（历史变更记录除外）
  - package.json 版本号不变（FR-06/D-003——diff 事实零改动）
verify:
  - node docs/prompt/_extract.mjs
  - node test/check-syntax.mjs（module-map 覆盖）
constraints:
  - 先改 _extract.mjs 再重跑（B3 盲区——顺序反了 import 失败）
  - conventions 修订走收口 distill 通道同步（:47-53 整段，不只 :52）
  - 历史变更记录（changelog/归档叙述）中的五阶段字样保留不动
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（形如 src/foo.js:<行号>——行号写实际数字）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
