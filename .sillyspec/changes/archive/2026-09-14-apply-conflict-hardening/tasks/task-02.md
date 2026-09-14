---
id: task-02
title: 'guard-overlap-precheck-and-force-autoapply-wiring'
title_zh: '拦截层——collectActiveQuickGuardFiles 导出 + applyWorktree 锁内相交预检（三分支）+ index.js --force/autoApply 接线'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 14:05:33
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-002@v1]
allowed_paths:
  - src/quicklog.js
  - src/worktree-apply.js
  - src/index.js
target_files:
  - src/quicklog.js
  - src/worktree-apply.js
  - src/index.js
expects_from:
  task-01:
    - contract: ApplyManifest
      needs: [manifest-schema]
provides:
  - contract: GuardOverlapCheck
    fields: [collectActiveQuickGuardFiles, overlap-result, force-flag, autoapply-skip]
goal: >
  apply 前拦截层——quicklog.js 新导出 collectActiveQuickGuardFiles（活跃 guard 文件集收集），applyWorktree withMainRepoLock 锁内与 changedFiles∪newPatchFiles 求交集做三分支判定（人工入口结构化错误 exit 1 / --force 放行留痕 / autoApply 软跳过），index.js 接线 --force flag 与 assess autoApply 标记（FR-03，D-002@v1）。
implementation:
  - src/quicklog.js 新导出 collectActiveQuickGuardFiles(specBase, opts)——返回 Map<quickSessionId, allowedFiles[]>；活跃口径=guard 目录存在即活跃 ∪ 7 天僵尸窗口兜底（GUARD_CLAIM_STALE_MS，与 collectGuardReservedQuicklogIds 同源同款）；opts.excludeChange 排除自身 change 的 quick 会话；无 guard/无声明→空数组，fail-open
  - src/worktree-apply.js 预检内嵌 applyWorktree 自身（withMainRepoLock :539 锁内）——内部函数 checkGuardOverlap（签名按 design.md 接口定义，返回 overlaps/blocked）对活跃 guard.allowedFiles 与本次 apply 文件集（changedFiles∪newPatchFiles，result 实际字段）求交集；勿用 changes.last_active 判活跃（非周期心跳，D-002）
  - 交集非空三分支——opts.force → 放行+result.overlapForced 留痕；opts.autoApply → 软跳过自动落盘（result.overlapSkipped=true + warning 指引人工评估，不抛错——无人值守不越权也不阻断审计流）；其余（CLI 人工入口）→ 抛结构化错误 exit 1，信息含冲突会话×文件对清单+串行化指引（等对方 --done 或显式 --force）
  - src/index.js 接线——apply 分支 :2724-2727 区域解析 --force + usage 文案补 --force（:2721 与帮助 :2673）+ opts 透传（:2758-2759）；assess 自动入口 :2902 置 opts.autoApply=true
acceptance:
  - 相交四态——空集（无活跃会话/无声明）apply 行为与现状零变化；CLI 人工入口交集非空 exit 1 且错误含会话×文件对清单与 --force 提示；--force 放行且 result.overlapForced 留痕；autoApply 入口软跳过（result.overlapSkipped + warning）不抛错不落盘
  - 自动路径（assess）永不 force——autoApply 且无 force 时只软跳过，绝不带 overlapForced 落盘
  - 无活跃交集的存量项目 apply 零回归（既有 apply/assess 相关测试全绿）
verify:
  - npm test && npm run lint
constraints:
  - 预检内嵌 applyWorktree（CLI apply 与 assess 自动入口全经此覆盖，不改 complete-handlers.js——其无 applyWorktree 调用）
  - 只读消费 task-01 的 manifest-schema（manifest 写点与写回 add 不改）；不动 doctor 检查面与文档（归 task-03/04）
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
