---
id: task-02
title: 'init 接线：VALID_TOOLS 增 zcode+注入调用+活文档锚'
title_zh: 'init 接线：VALID_TOOLS 增 zcode+注入调用+活文档锚'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 01:10:00
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-05, FR-06]
decision_ids: [D-003]
allowed_paths:
  - src/init.js
  - src/index.js
  - docs/sillyspec/platform-interface-map.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
target_files: []
goal: >
  把 task-01 的注入器接进 init 命令面：zcode 入 VALID_TOOLS 并同获 AGENTS.md 注入，
  卡注入挂点遵循 --no-skills/platformMode 门，gitignore advisory 提示，活文档锚补新导出面。
implementation:
  - src/init.js:79 VALID_TOOLS 增 'zcode'；L578/L674 消费点文案（toolChoices 选项名与描述）
  - src/init.js:447 AGENTS.md 注入条件 claude||codex → 增 zcode（FR-05：zcode 亦获 AGENTS.md，Grill P1-1）
  - 挂点 L449 后、noSkills return（L457）之前：tools 含 zcode/claude 时调 injectCommandCards(projectDir, { tools, force: forceCards, version: pkgVersion })；--no-skills / platformMode 与 skills 复制同门跳过（Grill P2-4）
  - 注入返回的 skipped/warnings 汇总输出；目标目录被 gitignore 时 advisory 一行（git check-ignore 探测，不阻断，R-02）
  - docs/sillyspec/platform-interface-map.md 补 init 段锚：injectCommandCards/COMMAND_CARD_TARGETS（file:line 实锚）
acceptance:
  - sillyspec init --tools zcode（临时目录）后 .zcode/commands/sillyspec/ 七卡落盘且 AGENTS.md 同获（FR-05/06）
  - tools 不含 zcode/claude 时行为与旧版一致（零变化）
  - platform-interface-map.md docs check 绿
verify:
  - npm test（含 task-01 新增 command-cards 套件与全量回归）
  - node test/doc-ref-check.test.mjs
constraints:
  - 不动注入器本体（task-01 范围）
  - AGENTS.md 注入机制零改动（仅扩展 tools 条件面）
  - 不给其余五工具（codex/gemini/opencode/cursor/openclaw）生成卡（D-003）
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
