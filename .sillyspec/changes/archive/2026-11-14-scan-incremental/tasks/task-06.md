---
id: task-06
title: '跨仓实测验收（multi-agent-platform 对比全量/空仓降级/对账抽查/回归）'
title_zh: '跨仓实测验收（multi-agent-platform 对比全量/空仓降级/对账抽查/回归）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-14 22:24:56
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08]
decision_ids: ['D-001@v1', 'D-002@v1', 'D-003@v1']
allowed_paths:
  - .sillyspec/changes/2026-11-14-scan-incremental/verify-evidence.md
target_files: []
goal: >
  跨仓实测验收：multi-agent-platform 仓增量 scan 对比全量（产物 diff/耗时/token 实测数字）、
  临时空仓降级零回归、对账报告人工抽查、既有 scan 测试面回归——任务书的四条验收标准落地取证。
implementation:
  - 实测一（multi-agent-platform 增量 vs 全量）：在该仓（已有就绪索引 .sillyspec-codegraph/）跑增量 scan；另取全量 scan（--force-rescan 或对照片段）产物对比——未受影响模块文档正文零变化（排除 frontmatter source_commit/updated_at/generator 三键）、受影响模块文档已重写；记录耗时与 token 实测数字（对比全量）
  - 实测二（降级零回归）：临时空仓（无 codegraph 安装假象：可用 PATH 移除法或独立临时目录）跑 scan——输出含「全量（原因）」一行，产物/退出码/流程与现行版本一致
  - 实测三（对账抽查）：读 multi-agent-platform 仓 _module-map-audit.md，人工抽查 5+ 未归属文件与真实路径对照（与手工 grep 一致）
  - 实测四（回归）：node --test 跑既有 scan 测试面（test/scan-diff.test.mjs、test/scan-staleness.test.mjs、test/scan-refresh.test.mjs、test/scan-postcheck.test.mjs）+ 本变更新增三套单测——零失败
  - 证据落盘 verify-evidence.md（变更目录）：四条验收逐项 PASS/FAIL + 实测数字 + 环境（codegraph 版本/仓 commit）
acceptance:
  - 验收 1：增量 scan 后未受影响模块文档正文零变化（diff 取证）；耗时与 token 相比全量显著下降（给数字）
  - 验收 2：空仓 scan 行为与现行版本完全一致（输出/退出码/产物取证）
  - 验收 3：对账报告未归属文件清单与人工抽查一致（≥5 文件取样记录）
  - 验收 4：既有 scan 测试四套零失败 + 新增单测三套零失败（测试输出尾部取证，日志落 .sillyspec/.runtime/logs/）
verify:
  - 逐条对照 tasks 卡 acceptance 与 tasks.md 验收四条，证据齐全写入 verify-evidence.md
constraints:
  - 只读实测：不在 multi-agent-platform 仓留任何写残留（scan 产物如生成，实测后按该仓规范处理或还原）；本 task 唯一写入=变更目录 verify-evidence.md
  - 跑批输出落 .sillyspec/.runtime/logs/ 只回看尾部（输出纪律）
  - 测试只跑变更测试面（scan 域 + 新增），禁全量套件（归 pre-push/CI）
  - multi-agent-platform 仓命令用 git -C/绝对路径读，不 cd（进度库分裂防线）
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
