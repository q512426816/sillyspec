---
id: task-01
title: 'verify-probes buildVerifyFacts + --init 落盘 verify-facts.json + 骨架层标注'
title_zh: 'verify-probes buildVerifyFacts + --init 落盘 verify-facts.json + 骨架层标注'
author: 'qinyi'
created_at: 2026-09-07 03:51:53
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-03]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-probes.js
target_files:
  - src/verify-probes.js
goal: >
  verify-probes 落 facts 机器底稿与骨架层标注——CLI 全权写的审计层，
  agent 零参与。
provides:
  - contract: buildVerifyFacts
    fields:
      - facts
implementation:
  - buildVerifyFacts(result, { changeName, now }) 构造 facts 对象（schemaVersion 1 / change / generatedAt / 四探针 command + metrics，metrics 按 design 总体方案 Wave1 清单）
  - --init 入口（index.js 调用链回传 changeDir 或在 verify-probes.js 内落）追加 writeFileSync verify-facts.json，重新 init 覆盖为最近快照
  - generateVerifyResultSkeleton 各章节标题行追加层标注后缀（结论/任务完成度=人工判断、探针结果=可复跑探针、测试结果=确定性检查、其余语义章节=人工判断），不新增行不破坏既有 TODO 占位与结论提取
acceptance:
  - --init 后变更目录存在 verify-facts.json 且含四探针 command 与 metrics
  - 骨架标题行含层标注后缀，既有七类 TODO 占位原样保留
verify:
  - node --test test/verify-probes.test.mjs
constraints:
  - 不改 runVerifyProbes 既有探针逻辑与 renderVerifyProbesReport 渲染语义
  - 层标注为标题行后缀，不新增行（G9 规格）

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
