---
id: task-03
title: 'index.js --wait --inherit-from 参数（校验→同命令盖章轮进 wait_answers；不存在 exit 2；不带参数逐字节兼容）'
title_zh: 'index.js --wait --inherit-from 参数（校验→同命令盖章轮进 wait_answers；不存在 exit 2；不带参数逐字节兼容）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 21:12:40
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v2]
allowed_paths:
  - src/run/command.js
  - src/run/complete.js
  - src/index.js
  - src/run/complete-handlers.js
expects_from:
  task-01:
    - contract: preflight-pure-functions
      needs: [hasDecisionId]
target_files:
  - src/run/command.js
  - src/run/complete.js
  - src/index.js
  - src/run/complete-handlers.js
goal: >
  wait 继承盖章协议——run <stage> --wait 新增 --inherit-from <D-xxx@vN>：hasDecisionId 校验通过则同命令
  落盖章答案轮进 wait_answers，不存在 exit 2 fail-closed；不带参数逐字节兼容。
implementation:
  - src/run/command.js:339（现有 --wait 面）与 :378-380（参数解析先例）加 --inherit-from <D-xxx@vN> 解析
  - 'src/run/complete.js wait_answers 落账点（:92 与 :1577 写入点）加盖章轮「第N轮: 由 D-xxx@vN 继承确认（CLI 盖章）」——hasDecisionId(specBase/changeDir, id) 为真时同命令完成 wait 记录+盖章轮'
  - hasDecisionId 为假时 exit 2 报「决策 ID 不存在于 decisions.md——继承盖章 fail-closed」（防伪造锚点 R-04），不落任何 wait 状态
  - src/index.js help 文本加 --inherit-from 行（仅文案面）
  - src/run/complete-handlers.js:181 pruneArchivedChangeRuntime 枚举补 prompt-inject-<change>.json（task-02 账本的 archive 回收登记——Grill 评审 fail②，防孤儿累积）
  - 回放链不动：续跑照常回放盖章轮（wait_answers 既有协议追加轮，不改结构）
acceptance:
  - 不带 --inherit-from 的 --wait 行为与现状逐字节一致（兼容红线）
  - 带存在于 decisions.md 的 ID：同命令完成 wait 记录并追加盖章轮（来源标注可审计）
  - 带不存在的 ID：exit 2 且不落任何 wait 状态（fail-closed）
verify:
  - node --test test/run-wait-frontload.test.mjs test/wait-gates.test.mjs
  - npm run lint
constraints:
  - 只动 allowed_paths 四文件；LF 行尾；兼容 Windows/Linux/macOS
  - wait 回放协议与既有 wait_answers 通道不动（盖章轮走既有通道，只追加不改结构）
  - L1 机械门存在性与拦截逻辑零触碰（D-005 守恒红线）；不新增测试文件（双态直测归 task-05）
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
