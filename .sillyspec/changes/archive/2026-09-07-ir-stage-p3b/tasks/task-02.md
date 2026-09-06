---
id: task-02
title: 'verify-postcheck checkProbeConsistency 纯函数（重跑+子节定界锚点+分级判定+判别子）'
title_zh: 'verify-postcheck checkProbeConsistency 纯函数（重跑+子节定界锚点+分级判定+判别子）'
author: 'qinyi'
created_at: 2026-09-07 03:51:53
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - src/verify-postcheck.js
target_files:
  - src/verify-postcheck.js
goal: >
  一致性抽查纯函数 checkProbeConsistency——重跑探针对比 verify-result.md
  正文预填段，分级判定防篡改。
provides:
  - contract: checkProbeConsistency
    fields:
      - status
      - mismatches
implementation:
  - 签名 checkProbeConsistency({ cwd, specBase, changeName, runtimeRoot })（P3a reconcile 先例口径，平台模式缺参同款兜底）
  - 重跑 runVerifyProbes 取当前指标；解析 verify-result.md 正文——以 #### 探针 N 子节定界（防探针 2/4 补写内容碰撞），子节内紧锚正则提取 probe1 命中行数 / probe3 hasTest 数 / probe5 summary 行存在性与 missing 数 / probe6 删除条目数；锚点正则在本文件导出常量（与渲染同源语义，round-trip 由 task-05 锁定）
  - 分级（D-003）：probe1/6 不符=ERROR；init 快照后 HEAD 前进（facts.generatedAt 后 git log 非空）时 probe6 漂移降 WARNING 提示重跑 init；probe3/5=WARNING；子节全缺且 facts 在场=ERROR、不在场=存量 skip；重跑异常=降级
acceptance:
  - 篡改 probe1 命中数/删除预填子节（facts 在场）判 ERROR
  - probe3/5 漂移判 WARNING；存量旧报告 skip；HEAD 前进子案降 WARNING
verify:
  - node --test test/verify-postcheck-module.test.mjs
constraints:
  - 纯函数不改既有导出；不做 gates 接线（task-03 范围）
  - 锚点常量从本文件导出（不触碰 task-01 的 W1 文件，保 Wave 正交）

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
