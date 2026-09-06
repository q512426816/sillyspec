---
id: task-02
title: '步骤级 gate 接线（complete.js 钩子链，ERROR exit 1/信封）+ index.js design-init 命令'
title_zh: '步骤级 gate 接线（complete.js 钩子链，ERROR exit 1/信封）+ index.js design-init 命令'
author: 'qinyi'
created_at: 2026-09-07 05:10:51
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - src/run/complete.js
  - src/index.js
target_files:
  - src/run/complete.js
  - src/index.js
goal: >
  步骤级 gate 接线 + design-init CLI——核验进 brainstorm 末步完成链。
expects_from:
  task-01:
    - contract: validateDecisionModuleRefs
      needs:
        - errors
        - warnings
    - contract: generateDesignSkeleton
      needs:
        - skeleton
implementation:
  - complete.js 步骤级钩子链（warnMissingUiPrototype 同点位 :281 附近）：brainstorm「生成规范文件」步 --done 时调 validateDecisionModuleRefs——errors 非空 → exit 1（阻断，先例同形）附信封输出（code decision_module_ref_invalid / domain_gap / check_skipped）；warnings console.warn 放行
  - index.js 新 case design-init --change <名> [--force]：调 generateDesignSkeleton 落盘 design.md（已存在不覆盖提示 --force；--force 覆盖）
acceptance:
  - 幻觉 id 场景 brainstorm 末步 --done 被拦（exit 1）
  - design-init 幂等（已存在不覆盖）
verify:
  - node --test test/run-complete-step-brainstorm.test.mjs
constraints:
  - 不改 gates.js；接线只在 brainstorm「生成规范文件」步触发（其他 stage/步零影响）

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
