---
id: task-04
title: 'verify-postcheck reconcileTargetFiles 纯函数（三源 actual 口径 + 三类差集 + 过滤降级）'
title_zh: 'verify-postcheck reconcileTargetFiles 纯函数（三源 actual 口径 + 三类差集 + 过滤降级）'
author: 'qinyi'
created_at: 2026-09-07 00:35:26
priority: P0
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-03, FR-04]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - src/verify-postcheck.js
goal: >
  verify 侧对账纯函数 reconcileTargetFiles：三源 actual 口径覆盖
  worktree 存活/post-apply 两形态，输出三类差集与降级语义。
provides:
  - contract: reconcileTargetFiles
    fields:
      - status
      - missing
      - undeclared
expects_from:
  task-03:
    - contract: parseTargetFiles
      needs:
        - entries
        - missing
implementation:
  - 声明侧：读 change 下全部 task 卡（import task-03 的 parseTargetFiles），剔跨仓卡（repo: 键）
  - actual 三源：形态A = resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true })；形态B = 主仓 merge-base diff（sillyspec/<change> 分支锚，缺分支省略该源）∪ status --porcelain --untracked-files=all（splitOwnVsForeignDiffFiles 过滤并行 WIP）∪ apply-pathspec-<change>.txt 兜底
  - 统一 filterDeliverableFiles 过滤；三类差集（matched / missing 带 task-id / undeclared 带 changedFiles 尽力归因）；无声明→skipped、git 不可用→degraded
acceptance:
  - NEW 前缀文件在两形态下均进 actual（无假 missing）
  - ctx 显式 null（跨仓 diff 不并入）；skipped/degraded 均为 WARNING 语义不阻断
verify:
  - node --test test/verify-postcheck-worktree.test.mjs test/verify-postcheck-module.test.mjs
constraints:
  - 纯函数不改既有导出语义；不做门禁接线（task-05 范围）
  - 复用既有 resolveVerifyChangedFiles/filterDeliverableFiles/splitOwnVsForeignDiffFiles，不另造口径
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
