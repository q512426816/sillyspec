---
id: task-01
title: '绑定基座：src/test-bindings.js 行模型+两真源读写'
title_zh: '绑定基座：src/test-bindings.js 行模型+两真源读写'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 12:35:27
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04, task-05, task-06]
requirement_ids: [FR-01, FR-03, FR-04, FR-07]
decision_ids: [D-001@v1, D-002@v1, D-005@v1]
allowed_paths:
  - src/test-bindings.js
  - test/test-bindings.test.mjs
target_files:
  - NEW:src/test-bindings.js
  - NEW:test/test-bindings.test.mjs
provides:
  - contract: 绑定行模型与两真源读写 API
    fields: [anchor, row_id, tests, reason, state, discovery, confirmed_by, confirmed_at, reconfirm, status, source_change]
goal: >
  绑定体系基座：行 schema（anchor∈{FR,ql,null}）+ 变更期载体（changes/<名>/test-trace.json）
  + FR 真源（fr-index 条目「测试绑定:」机器子块）+ ql 真源（quicklog/test-bindings.json）
  的单点解析读写，含 upsert 幂等与取代——供 task-02~06 全部消费（D-002@v1）。
implementation:
  - 新建 src/test-bindings.js：行 schema 定义+枚举校验（anchor/reason/state 违例抛错拒绝写入）
  - 变更期载体：readChangeTrace/writeChangeTrace（writeAtomicSync、内容不变跳写）
  - FR 真源：parseEntryBindings/upsertEntryBindings——条目子块读写；upsert 键=source_change+row_id；内容全等 no-op；机器 upsert 不删 agent 行
  - ql 真源：readQlBindings/writeQlBindings（quicklog 机器面 JSON）
  - 视图查询：queryByAnchor/queryByChange（两真源合并）
acceptance:
  - upsert 幂等：同内容重放条目子块字节不变；同键新内容只改该行不动他行（fixture 直测）
  - confirmed_by=agent 行在机器 upsert 重放后原样保留（字段级所有权②）
  - anchor=CAP-x / reason=other 等违例抛错且零写入
  - 全部落盘 writeAtomicSync（中断不留半文件，写读回验）
verify:
  - node --test test/test-bindings.test.mjs
  - npm run lint
constraints:
  - 纯基座零接线（调用方在 task-02~06）；不建 knowledge/test-trace/ 目录
  - 不改 fr-index 既有蒸馏行为（提升在 task-06）
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
