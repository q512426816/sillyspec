---
id: task-07
title: 'e2e mock full-chain test'
title_zh: '端到端 mock 全链路测试'
author: 'qinyi'
created_at: 2026-09-10 13:54:29
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05', 'task-06']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@1, D-002@1, D-003@1]
allowed_paths:
  - test/review-dispatch.test.mjs
target_files: [NEW:test/review-dispatch.test.mjs]  # task-03 已建文件，本 task 追加端到端用例
goal: >
  mock SillyHubMcpClient 注入跑通完整生命周期：创建（create_mission external 参数断言 +
  dispatch_worker read_only/worker_prompt 四要素断言）→ 在途记录落盘 → --status 轮询（mock
  list_workers 状态迁移 queued→running→completed）→ 停滞注入（lastStateAt 回拨超窗 →
  stalled 提示）→ 终态回收（mock get_worker_result 带 artifacts → review.json 落盘过
  validateStageReview + reviewer.channel=platform/missionId 落款）→ 幂等（in-flight
  重复创建拒）→ 中断分支（dispatch_worker 抛错 → dispatching/abandoned 处置文案）。
  真平台活体冒烟归 verify 阶段不在此卡。
implementation:
  - 全 mock 零网络：复用 test/dispatch/path-a-probe.test.mjs 的 mock client 工厂风格注入
    SillyHubMcpClient（create_mission/dispatch_worker/list_workers/get_worker_result 可控可计数）
  - 断言 .runtime 在途记录状态机迁移与 design.md 生命周期契约表逐条对齐
    （无记录→dispatching→in-flight→completed/failed/abandoned 各迁移点全覆盖）
acceptance:
  - node --test test/review-dispatch.test.mjs 端到端全链路用例全绿
  - verify 阶段复跑同一命令同样全绿
verify:
  - node --test test/review-dispatch.test.mjs
constraints:
  - 零网络、零真实平台调用（全 mock）
  - Windows 路径兼容
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
