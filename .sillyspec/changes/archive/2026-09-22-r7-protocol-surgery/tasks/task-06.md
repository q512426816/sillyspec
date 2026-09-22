---
id: task-06
title: 'Add edit-ratio routing signal and failure-driven tier upgrade'
title_zh: '编辑距离路由信号+失败触发升厚'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-22 10:58:49
priority: P0
depends_on: [task-05]
blocks: []
requirement_ids: [FR-09, FR-10]
decision_ids: [D-005@v1]
allowed_paths:
  - src/flow-draft.js
  - src/flow.js
  - test/flow-route.test.mjs
target_files:
  - NEW:src/flow-draft.js
  - NEW:src/flow.js
  - NEW:test/flow-route.test.mjs
goal: >
  机器稿改写比例=决策覆盖度机械代理（advisory 定案：测绿可薄档过）；失败触发自动升厚
  不依赖 agent 主动声明。
implementation:
  - src/flow-draft.js 增 computeEditRatio——LCS 行 diff 纯函数，基准=draft-ledger 首版原文，AGENT 槽内容不计入
  - flow amend-draft 执行时算 editRatio——超阈值（flow.edit_ratio_threshold 缺省 0.5）输出厚档提示并落 flow-state route_hint
  - src/flow.js flow done 输出醒目打印 route_hint 与 editRatio 数值；遥测四列记一笔（friction/知识库既有遥测通道 additive）；enforcement 开关（advisory|block 缺省 advisory——block 时超阈阻断 done）
  - 失败触发升级——flow done 的 verify 实测失败/审查否决/distill 异态→flow-state tier 升 thick+upgrade_reason，剩余流程按厚档走（完整 verify/archive 仪式）
  - NEW test/flow-route.test.mjs——合成场景阈值两侧（0.49/0.51）/失败升级通路真跑一次/enforcement=block 可选阻断/AGENT 槽不计入
acceptance:
  - editRatio 阈值触发正确（合成改写 0.5 边界两侧行为分明）
  - 失败升级通路真跑一次（verify 失败注入→tier 变 thick+upgrade_reason 在案）
  - advisory 缺省下测绿+高 editRatio 可薄档过（不阻断）；block 配置下阻断
  - AGENT 槽书写不改变 editRatio
verify:
  - node --test test/flow-route.test.mjs
  - npm run lint
  - npm test
constraints:
  - editRatio 与三态拒收守卫的汇合点只在 amend 通道（直接改写仍被拒收，路径恒 0 不参与路由）
  - 不依赖 agent 主动 --full（升级全由失败/否决/异态机械触发）
  - 遥测只记录不判罚
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
