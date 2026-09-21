---
id: task-01
title: 'P2 测试结果记账——test-ledger 三键指纹 fail-closed+消费点接线（含 test/test-ledger.test.mjs）'
title_zh: 'P2 测试结果记账（三键指纹 fail-closed 复用）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 22:51:51
priority: P0
depends_on: []
blocks: []
requirement_ids: ['FR-02']
decision_ids: ['D-001@v1']
allowed_paths:
  - src/run/test-ledger.js
  - src/run/gates.js
  - src/verify-postcheck.js
  - test/test-ledger.test.mjs
target_files:
  - NEW:src/run/test-ledger.js
  - src/run/gates.js
  - src/run/quick-audit.js
  - NEW:test/test-ledger.test.mjs
goal: >
  同码同环境全量结果复用，消重复跑与恐惧预跑（batch2 七跑账→必要二三跑）
implementation:
  - envProfile 探针清单从 13 个 worktree-cwd 环境族测试判定条件源码推导（读其测试源码取实际探测信号：spec-dir 位置/worktrees meta 存在性等，禁拍脑袋列举）
  - test-ledger.js：三键指纹（codeFingerprint=HEAD+porcelain 摘要×testSetHash=命令+测试面内容摘要×envProfile 结构化探针）+账本 .runtime/test-ledger-<change>.json IO
  - fail-closed 三层：键分量不可得=不复用/失败结果永不缓存/严格全等无模糊
  - 消费点接线：gates.js verify-test 与 quick --done 实测门查账本（全等→♻️ 复用一行+摘要；漂移→真跑+记账）
acceptance:
  - 同码同环境二次 gate 只复用不重跑（<5s 耗时断言）
  - 改一行 src 指纹变真跑
  - worktree 与主仓 envProfile 分键互不复用
  - git 不可达永远真跑（fail-closed）
verify:
  - node --test test/test-ledger.test.mjs
  - npm test
constraints:
  - 失败结果永不缓存——宁假红不假绿
  - quality-scan P0-1 机制共存不动
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（示例形态 src/foo . js:123——此处为格式教学非引用）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
