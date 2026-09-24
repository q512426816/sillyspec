---
id: task-04
title: '前端折叠卡+挂载+组件测试'
title_zh: '前端折叠卡+挂载+组件测试'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 02:48:25
priority: P0
depends_on: [task-03]
blocks: []
requirement_ids: [FR-06, FR-07]
decision_ids: [D-006@v1, D-007@v1]
expects_from:
  - "task-03: listChangeEvents(changeName, since?) 与 api-types 事件类型"
allowed_paths:
  - frontend/src/components/changes/detail/change-events-card.tsx
  - frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx
  - frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx
  - frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx
  - frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx
target_files:
  - NEW:frontend/src/components/changes/detail/change-events-card.tsx
  - frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx
  - NEW:frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx
related_tests:
  - frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx
  - frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx
goal: >
  变更详情页「观测事件」折叠卡：缺省收起/有 warning 默认展开+角标、时间线
  warning 琥珀高亮、provisional 徽标悬停、30s 轮询增量、空态，配四组组件测试。
implementation:
  - 新建 frontend/src/components/changes/detail/change-events-card.tsx（"use client"）：props {changeName: string}；useQuery queryKey ["changeEvents", changeName]，queryFn 依 lastTsRef 决定带 since 增量，refetchInterval 30_000，数据按行 id 去重合并、ts 排序；折叠 useState（缺省收起），首拉含 severity==="warning" 一次性展开（useRef 防抢用户手动收起）；角标=warning 计数（amber 徽标）；行渲染 时间/类型/规则/详情，warning 行琥珀高亮（amber 语义阶+dark 变体）；provisional 徽标恒显 title="旁路观测信号，非流程真相"；空态「暂无观测事件」；查询错误静默按空态处理
  - frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx：change 数据就绪后挂 ChangeEventsCard changeName=change.change_key（ChangeRead 无 name 字段，backend/app/modules/change/schema.py:74）；位置放详情卡片区（对齐 ChangeSessionsCard 挂载区）
  - 新建 __tests__/change-events-card.test.tsx 四组：渲染组（事件行 时间/类型/规则/详情 可见）/ 高亮组（warning 行带琥珀类名，info 行不带）/ 空态组（空数据「暂无观测事件」且无角标）/ 角标组（有 warning 默认展开+角标计数；无 warning 默认收起）；mock lib/change-events 的 listChangeEvents
  - 既有详情页测试如因新组件 fetch 未 mock 失败：补 mock 不改断言语义
acceptance:
  - cd frontend && pnpm vitest run src/components/changes 四组全绿
  - 既有 src/app/(dashboard)/workspaces 测试零回归
verify:
  - cd frontend && pnpm vitest run "src/app/(dashboard)/workspaces" src/components/changes
constraints:
  - severity 判定仅用于样式（琥珀高亮/角标/默认展开），不得触发任何业务动作（FR-07 红线）
  - provisional 徽标按行内字段渲染，不假设恒 true
  - 样式用 amber 标准阶+主题 token，不引入新色 token；UI 中文
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
