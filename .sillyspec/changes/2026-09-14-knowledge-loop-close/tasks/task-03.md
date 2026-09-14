---
id: task-03
title: 'add-classify-proposal-renderer-and-baseline-ratchet'
title_zh: '归类提议器 + 棘轮——src/run/complete-handlers.js 提议渲染（handleQuickStageCompletion 进程内 outputText×matchKnowledge）+ 抽审清单（handleArchiveConfirmStep）+ knowledge-baseline 软警告棘轮 + NEW:test/knowledge-baseline.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 19:59:00
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-03]
decision_ids: [D-001@v1]
allowed_paths:
  - src/run/complete-handlers.js
  - test/knowledge-baseline.test.mjs
  - test/concurrent-preflight-hooks.test.mjs
target_files:
  - NEW:test/knowledge-baseline.test.mjs
related_tests:
  - path: test/concurrent-preflight-hooks.test.mjs
    reason: ':165-171 对 handleQuickStageCompletion 有源码文本级断言（detectConcurrentChanges 前后 ±[200,600] 字符窗口内须有 try/catch 且禁 process.exit 字样），本卡在该函数插码位置敏感，破坏断言时优先挪插码位置而非改测试'
goal: >
  在 quick --done 与 archive 收尾渲染归类提议（进程内 outputText × matchKnowledge）和 knowledge-baseline 棘轮软警告，把归类提醒推到收尾时刻、让 uncategorized 条数受基线约束单调下降（FR-01/FR-03，D-001@v1）。
implementation:
  - handleQuickStageCompletion（complete-handlers.js :983 附近）收尾渲染：completeQuicklogEntry 落盘后同进程取四字段 outputText（免读回盘），根因字段拼查询串跑 matchKnowledge；命中则渲染「📚 待归类提议：ql-xxx 根因疑似命中 <目标文件>#<条目>，确认归类跑 sillyspec knowledge classify --ql <id> --file <目标>」
  - 提议渲染守卫：根因为「无，纯新增/纯样式」形态或未命中时不渲染任何提议（拿不准不写）；渲染包进既有 try/catch fail-open 结构，不引入 process.exit、不阻断 --done
  - handleArchiveConfirmStep（:545 起）archive 收尾渲染自动归类抽审清单（近 N 条 classify 审计，供人抽审 revert，X-006 定锚）
  - knowledge-baseline 棘轮：读 .sillyspec/knowledge-baseline 单整数（缺失=未启用不警告）；按 validate 同款正则 /^#{2,3}\s+\S/gm 计数 uncategorized 条数（X-010 口径对齐防双数字打架）；超线渲染软警告+建议 classify 清单不阻断；低于基线自动收紧写回当前值
  - 新建 test/knowledge-baseline.test.mjs：超线软警告不阻断/降线自动收紧/缺失不警告/计数正则口径
acceptance:
  - quick --done 四字段 outputText 命中知识时收尾输出含待归类提议（ql-ID + 目标文件#条目 + classify 建议命令）；未命中或纯新增形态零提议输出（FR-01 Then）
  - 棘轮三态可验证：超线只软警告不阻断退出、低于基线自动收紧写回、baseline 文件缺失时不警告不阻断（FR-03 Then）
  - node test/concurrent-preflight-hooks.test.mjs 仍通过（插码未破坏 handleQuickStageCompletion 的源码文本级断言）
  - node test/knowledge-baseline.test.mjs 0 fail；npm test 全量 0 fail
verify:
  - node test/knowledge-baseline.test.mjs
  - node test/concurrent-preflight-hooks.test.mjs
  - npm test
constraints:
  - 提议只渲染不自动执行（R-01：归类须 agent 显式跑 classify 确认，错误归类靠 archive/doctor 抽审 revert）
  - 插码避开 concurrent-preflight-hooks.test.mjs :165-171 断言窗口（detectConcurrentChanges ±[200,600] 字符内禁 process.exit、须保 try/catch）；断言失败时修插码位置，不改测试迁就
  - 计数正则必须与 knowledge validate 同款 /^#{2,3}\s+\S/gm（X-010）；棘轮起步只软警告不阻断（R-05）
  - 不越 allowed_paths：渲染宿主定锚 complete-handlers.js（X-006），src/stages/quick.js 指引更新属 task-04；不改 src/knowledge-match.js
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
