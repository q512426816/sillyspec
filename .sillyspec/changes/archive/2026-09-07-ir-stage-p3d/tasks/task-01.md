---
id: task-01
title: 'src/archive-delta.js 聚合器（collectDeltaSources/buildDeltaReport + deriveActualModules 复用）'
title_zh: 'src/archive-delta.js 聚合器（collectDeltaSources/buildDeltaReport + deriveActualModules 复用）'
author: 'qinyi'
created_at: 2026-09-07 06:36:52
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-002@v1, D-003@v1]
allowed_paths:
  - src/archive-delta.js
  - src/design-facts.js
target_files:
  - NEW:src/archive-delta.js
  - src/design-facts.js
goal: >
  delta 聚合器——四源采集 fail-soft + 三段式渲染，agent 零参与。
provides:
  - contract: buildDeltaReport
    fields:
      - report
implementation:
  - src/design-facts.js deriveActualModules（:149）加 export（一行，D-003）
  - collectDeltaSources({ changeDir, specRoot, project, runtimeRoot })：源1 reconcile（runtimeRoot/verify-runs/<ts> 按 change 字段过滤取最新；缺失则读 .runtime/apply-pathspec-<change>.txt 兜底清单 deliverables）；源2 verify-facts.json；源3 loadModuleMap；源4 parseDecisionDomains（decisions.md 文本）——全部 fail-soft 返回 null 语义
  - buildDeltaReport(...)：三段式 md——Before（受影响模块注册摘要+声明域并集 NEW: 标记）/ Delta（交付文件×模块归属表（deriveActualModules）+ missing/undeclared 附注 + 决策 id+模块域清单 + 探针 metrics 摘要）/ After（module-impact.md 更新结果行引用 + scan 刷新建议（受影响模块+未匹配文件提示补录）+ 端点基线独立立项提示（probe5 指标非零时））；缺源逐段降级注记
acceptance:
  - 含四源的 fixture 生成完整三段；逐源缺失降级不失败；reconcile 缺失走 apply-pathspec 兜底
verify:
  - node --test test/archive-delta.test.mjs
constraints:
  - 纯函数（collect 返回数据、build 返回字符串）；不改四源的任何生产行为

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
