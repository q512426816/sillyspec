---
id: task-02
title: 'P4 M1 缺省开——SILLYSPEC_STEP_GUIDE 翻默认+stdout 确定性测试族迁移（含 test/step-guide-default-on.test.mjs）'
title_zh: 'P4 M1 缺省开（翻默认+测试族迁移）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 22:51:51
priority: P0
depends_on: []
blocks: []
requirement_ids: ['FR-04']
decision_ids: ['D-004@v1']
allowed_paths:
  - src/run/prompt.js
  - test/step-guide-default-on.test.mjs
target_files:
  - src/run/prompt.js
  - NEW:test/step-guide-default-on.test.mjs
  - test/step-guide-fingerprint.test.mjs
  - test/semantic-guard-prompt-inject.test.mjs
  - test/preflight-slimming.test.mjs
  - test/cli-top-level-aliases.test.mjs
goal: >
  D-001@batch2 退役判据兑现：未设 env 即短输出，每轮注入税随轮数乘数消解
implementation:
  - prompt.js 缺省翻转：SILLYSPEC_STEP_GUIDE 未设=开，=0 显式关（逃生门保留）
  - stdout 确定性测试族（别名路由奇偶校验等 5 断言）逐例迁移：fixture 设 =0 或断言短形态，逐例一行迁移注记
  - --json 全量与动态段永不缓存语义不动
acceptance:
  - 翻转后全量测试零红
  - 不设 env 复入输出短形态（≤10 行沿用断言）
  - =0 显式关回全量（逃生门钉）
verify:
  - node --test test/step-guide-default-on.test.mjs
  - npm test
constraints:
  - 迁移漏面以全量零红为硬门
  - 禁改测试语义迁就（逐例注记可审计）
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
