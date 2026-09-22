---
id: task-05
title: 'Implement flow drafters with fingerprint guard and amend channel'
title_zh: '四件机器起草器+三态拒收守卫+amend 留痕通道'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-22 10:58:49
priority: P0
depends_on: [task-03, task-04]
blocks: []
requirement_ids: [FR-07, FR-08]
decision_ids: [D-004@v1, D-005@v1, D-007@v1]
allowed_paths:
  - src/flow-draft.js
  - src/flow.js
  - test/flow-draft.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
target_files:
  - NEW:src/flow-draft.js
  - NEW:src/flow.js
  - NEW:test/flow-draft.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
expects_from:
  task-04:
    - contract: wrapSection
      needs: [key, body, amendCmd]
    - contract: verifyMarkers
      needs: [md, ledger, violations]
    - contract: amendDraft
      needs: [mdPath, ledgerPath, reanchored]
goal: >
  薄跑道治理工件全部 CLI 机器起草（agent 只裁例外）——四件起草器+draft-ledger 首版原文
  永存+AGENT 槽+验收侧三态拒收守卫；工件回填轮=0。
implementation:
  - NEW src/flow-draft.js——draftProposal（--input 机械转写）/draftRequirements（机械摘成功标准条目）/draftTasks（成功标准推导 checkbox；任务卡分岔——默认 thin+直写零卡、--thick/--with-tasks 生成 tasks/task-NN 卡）/draftDecisions（只记真实新增）；每件机器段经 wrapSection 包裹
  - draft-ledger（.runtime/draft-ledger-<change>.json）——每段存 hash+首版原文 body（首版快照永不覆盖，amend 只刷 hash）；命名空间按 文件名与段键 组合
  - AGENT 槽——显式 AGENT 标记对内为合法书写面
  - src/flow.js 接线——flow start 调四起草器落盘；flow done 增加工件校验子步（verifyMarkers 三态→阻断+回滚指引；AGENT 槽放行）；flow amend-draft 子命令（amendDraft 重锚+ledger 留痕）
  - NEW test/flow-draft.test.mjs——四件起草形态/三态拒收/AGENT 槽放行/amend 留痕+内容保留/薄跑道会话内 .sillyspec 写入面仅例外裁决（harness 验产物）
  - module-map 录入 src/flow-draft.js（core-engine）
acceptance:
  - 四件起草器输出含机器段标记与 AGENT 槽的规范形态
  - 机器段被整份重写三态拒收（标记删除/哈希失配/手工重锚未审计）；AGENT 槽改写放行
  - flow amend-draft 重锚后 ledger 留 amendment 审计且首版原文仍在
  - 薄跑道 harness 全程 .sillyspec 写入仅 AGENT 槽与 amend 产物
verify:
  - node --test test/flow-draft.test.mjs
  - npm run lint
  - npm test
constraints:
  - 守卫全在验收侧（flow done 拒收），零 prompt 劝说
  - ledger 首版原文永不覆盖（切片四 editRatio 基准依赖）
  - 任务卡分岔判据只认显式 flag（--thick/--with-tasks），不做规模启发式
  - verify-result.md 既有 verify-probes --draft 语义不动
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
