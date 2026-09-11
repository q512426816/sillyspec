---
id: task-06
title: 'quick --done assertion-rewrite WARNING inside runQuickTestLintGate'
title_zh: 'quick --done 断言 WARNING（quick-audit.js gate 内+渲染）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 14:45:11
priority: P0
depends_on: ['task-03']
blocks: [task-07]
requirement_ids: [FR-04]
decision_ids: [D-001@v1]
allowed_paths:
  - src/run/quick-audit.js
  - test/semantic-guard.test.mjs
target_files:
  - src/run/quick-audit.js
expects_from:
  - task-03: detectAssertionRewrites / collectRecentForeignDelivery / readSemanticGuardEnabled
goal: >
  quick --done 收尾时，对「他者近因交付的测试文件里既有断言行被改」输出 WARNING 级点名
  （FR-04，D-001@v1 模块五）——治「改断言重定义绿灯」这一事故唯一逃逸路径。
implementation:
  - runQuickTestLintGate 内、file 清单确定后追加：步骤 0 readSemanticGuardEnabled false → 跳过检测（test/lint 实测门行为不变）；三条早退路径（env skip/无文件/纯 doc）同样不跑检测
  - 检测对主仓 cwd 执行而非 gateCwd 隔离快照（检测对象=本会话工作树改动，快照语义=实测隔离，两者不同层——Grill X-001 附注）
  - detectAssertionRewrites 命中文件 ∩ collectRecentForeignDelivery 归因文件 → gate 返回对象增 semanticGuard: { hits } 字段（对调用方 complete-handlers.js 增量安全——它只读 action/failed，不遍历）
  - printQuickTestLintGate 末尾渲染 ⚠️ 段：点名文件+样例行（封顶 5）+ 交付变更名 + 建议重写理由写进 quicklog --solution / 关联决策复查
  - WARNING 非阻断（D-001@v1：误报校准数据为零，先 advisory 收集实证）
acceptance:
  - 他者交付测试文件断言行被改 → --done 输出 ⚠️ 点名（含变更名与样例行）
  - 纯新增断言/非测试文件/无归因标记 → 无 WARNING 输出
  - 调用方 complete-handlers.js 零改动（返回对象只增字段）
  - SILLYSPEC_QUICK_TEST_GATE=skip / 纯 doc / 无文件 → 不跑检测（与既有语义一致）
verify:
  - node --test test/semantic-guard.test.mjs
  - npm test（quick-audit 既有测试保持绿）
constraints:
  - 不改 complete-handlers.js（并行会话脏文件，design 明确不改清单）
  - 不阻断 --done（WARNING 级——D-001@v1 复潮条件：误报率实证后可升 block）
  - 检测不进隔离快照（快照失败 fallback 语义不受影响）
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
