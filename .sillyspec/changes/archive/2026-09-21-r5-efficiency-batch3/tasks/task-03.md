---
id: task-03
title: 'P1 gate --full 只读预检档——覆盖 --done 检查面+flag 注册（含 test/gate-full-preflight.test.mjs）'
title_zh: 'P1 预检补全（--full 只读档，预检过=必过）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 22:51:51
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: ['FR-01']
decision_ids: ['D-002@v1']
allowed_paths:
  - src/run/gates.js
  - src/verify-postcheck.js
  - src/index.js
  - test/gate-full-preflight.test.mjs
target_files:
  - src/machine-interface.js
  - src/index.js
  - NEW:test/gate-full-preflight.test.mjs
goal: >
  --done 独有贵门的失败同回合暴露，消整回合级联（batch2 四类盲区实证）
implementation:
  - gate <stage> --full 只读档装配：module 子集实测（经 P2 账本复用）/target_files reconcile 只读/stage review 缺失探测（只报缺不生成）/quick 实测门同口径
  - src/index.js 注册 --full flag
  - 与 --done 同引擎同源调用（lint parity 先例）；默认档零变化
acceptance:
  - --full 对四类失败（stage review 缺/reconcile 缺/manifest 缺/test 红）同回合全报（构造四态测试钉）
  - 默认档输出与改前逐字节一致
  - 「--full 绿→--done 不因同因再拦」parity 钉（冻结状态快照下）
verify:
  - node --test test/gate-full-preflight.test.mjs
  - npm test
constraints:
  - --full 全只读零副作用（账本写入除外）
  - 不取代归档门复查（状态变化仍拦）
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
