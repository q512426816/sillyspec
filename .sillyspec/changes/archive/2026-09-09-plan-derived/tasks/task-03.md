---
id: task-03
title: 'prompt 与文档收口'
title_zh: 'prompt 与文档收口'
author: 'qinyi'
created_at: 2026-09-09 04:34:27
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/plan.js
  - docs/prompt/plan.md
  - docs/prompt/_extracted.json
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/stages.changelog.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.changelog.md
target_files:
  - src/stages/plan.js
  - docs/prompt/plan.md
  - docs/prompt/_extracted.json
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
goal: >
  prompt 措辞 + 镜像 + 卡同步 + execute 零改动锁定。
implementation:
  - plan.js 生成计划步 :431-434 共享文件分 Wave 教学保留，补「依赖方向违规（同 Wave/后置 Wave）在 --done 自动按拓扑修复；手工分 Wave 的合法保守串行不会被改写」
  - _extract + _sync 镜像（_verify exit 0）
  - stages 卡（section 2 三类分流/plan_level 复核）+ cli-entry 卡（adopt proposal 档）+ sidecar
  - execute 解析零改动验证：跑既有 test/plan-execute-contract.test.mjs（不新增断言文件——parseTaskWavesFromPlan 零触碰由 diff 审查保证）
acceptance:
  - _verify exit 0
  - 卡与 sidecar 登记齐
  - execute 零改动断言绿
  - npm test 模块子集全绿
verify:
  - node docs/prompt/_verify.mjs
  - node --test test/plan-execute-contract.test.mjs
constraints:
  - 纯文档/prompt 层不改判定逻辑
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
