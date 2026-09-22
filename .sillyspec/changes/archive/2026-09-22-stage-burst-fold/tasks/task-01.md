---
id: task-01
title: 'readStageBurst config reader (stage.burst + env override)'
title_zh: 'readStageBurst 配置读取（stage.burst + env 覆写 + fail-safe）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:23:08
priority: P0
depends_on: []
blocks: ['task-02', 'task-03']
requirement_ids: [FR-01, FR-04]
decision_ids: [D-001@v1, D-007@v1]
provides: 'readStageBurst(cwd) -> Promise<boolean>：export 自 src/run/shared.js；local.yaml stage.burst===true / env SILLYSPEC_STAGE_BURST=0 强制 false / =1 强制 true（优先于配置）/ 一切读/解析失败 false'
allowed_paths:
  - src/run/shared.js
  - test/stage-burst.test.mjs
target_files:
  - src/run/shared.js
  - NEW:test/stage-burst.test.mjs
goal: >
  burst 开关的配置读取面：local.yaml stage.burst + env 逃生阀 + fail-safe 缺省 OFF——渲染侧（task-02）与完成侧（task-03）共用的唯一判定函数。
implementation:
  - src/run/shared.js 新增 export async function readStageBurst(cwd)：复用既有 readLocalYamlRaw(cwd)（src/run/shared.js:1938-1946）+ js-yaml 动态 import 读 doc?.stage?.burst === true（resolveLivingDocs 同款范式，src/run/shared.js:1331-1340）
  - env 覆写顺序：先读配置，再 SILLYSPEC_STAGE_BURST=0 → false / =1 → true（env 优先于配置）；坏 YAML/缺文件/import 失败 → false（fail-safe，D-001）
  - NEW:test/stage-burst.test.mjs 建文件：三态单测（无配置→false / stage:\n  burst: true→true / env=0 覆写 true→false / env=1 覆写无配置→true / 坏 YAML→false）；spawn/直调均显式 delete SILLYSPEC_STAGE_BURST 后按需注入（env 敏感双模式纪律）
acceptance:
  - readStageBurst 三态行为与 FR-01 逐条一致（五组断言全绿）
  - 缺省 OFF：无配置无 env 时返回 false
verify:
  - node --test test/stage-burst.test.mjs
  - npm run lint
constraints:
  - 不改 readFlowConfig（flow 配置读取是 task-04 面）
  - js-yaml 用动态 import（与 resolveLivingDocs 一致，防冷启动依赖）
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
