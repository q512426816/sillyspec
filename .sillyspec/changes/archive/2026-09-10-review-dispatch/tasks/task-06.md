---
id: task-06
title: 'review_dispatch config knobs'
title_zh: '配置面扩展'
author: 'qinyi'
created_at: 2026-09-10 13:54:29
priority: P0
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-08]
decision_ids: [D-003@1]
allowed_paths:
  - src/review-dispatch.js
  - .sillyspec/local.yaml.example
  - test/review-dispatch.test.mjs
target_files:
  - NEW:src/review-dispatch.js
  - .sillyspec/local.yaml.example
  - NEW:test/review-dispatch.test.mjs
goal: >
  readReviewDispatchConfig(cwd) 扩配置面（FR-08）——读 review_dispatch 段 budget_usd（默认 1.0）/stall_ms（默认 900000）/timeout_ms（默认 0=永不，仅提示不 kill），坏配置回默认不抛（D-003 的 queued 不计时、总时长默认无上限语义落进配置面）；local.yaml.example 的 review_dispatch 注释块沿 P1 channel_priority 块风格补三键说明；导出供 task-04 入口消费（创建形态的 budget 上限、--status 的停滞判定窗）。
implementation:
  - src/review-dispatch.js 新增导出 readReviewDispatchConfig(cwd)——js-yaml best-effort 读 .sillyspec/local.yaml，参照 stage-review.js readReviewChannelPriority（:53）容错风格，文件缺/读失败/坏 YAML/非对象段一律回默认不抛
  - 数值键类型校验——budget_usd/stall_ms/timeout_ms 非有限数值时回默认并 console.warn 单行（不静默吞配置错误）
  - .sillyspec/local.yaml.example 的 review_dispatch 注释块（:41-42）补三键说明——budget_usd 单次审查 mission 预算上限（默认 1.0）、stall_ms 停滞判定窗（默认 15 分钟，queued 不计时）、timeout_ms 总时长上限（默认 0=永不，仅提示不 kill），保持注释形态不引入生效配置
  - test/review-dispatch.test.mjs 并入三态单测——缺省（无 local.yaml 回全默认）/合法配置（三键取配置值）/坏 YAML（回默认不抛），临时目录写临时 local.yaml 驱动
acceptance:
  - readReviewDispatchConfig 三态断言全绿——缺省→budget_usd 1.0 / stall_ms 900000 / timeout_ms 0；合法→取配置值；坏 YAML→回默认且不抛
  - local.yaml.example 的 review_dispatch 注释块含三键说明，example 整体仍为合法 YAML（结构零破坏）
verify:
  - node --test test/review-dispatch.test.mjs（含新增三态用例全绿）
  - node -e 用 js-yaml 解析 .sillyspec/local.yaml.example 冒烟（解析不抛即注释块未破坏结构）
constraints:
  - 不新增依赖（js-yaml 既有）
  - 注释块更新不破坏 example 结构（保持注释形态，不引入生效配置）
  - 三键默认值单点定义在 readReviewDispatchConfig，消费方不写裸默认
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
