---
id: task-04
title: 'review-dispatch command wiring'
title_zh: '命令注册三形态'
author: 'qinyi'
created_at: 2026-09-10 13:54:29
priority: P0
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-07]
decision_ids: [D-001@1, D-002@1, D-003@1]
allowed_paths:
  - src/index.js
  target_files:
  - src/index.js
  goal: >
  注册顶级命令 sillyspec review-dispatch 并把三形态接到 task-03 的 runReviewDispatch(opts) 入口（plan 关键契约段）——缺省=创建（--change 必填 + --stage ∈ brainstorm|plan|execute；probeSillyHub 三层前置 no-config/daemon-unreachable/daemon-offline 任一不可用 → 非零退出 + readReviewChannelPriority 去掉 platform 后的剩余通道指引 → create_mission(orchestration_mode=external, budget_usd≤配置) → dispatch_worker(read_only, worker_prompt=buildReviewerTaskBook 产物) → 写在途记录 + 打印 missionId 与 --status 指引后退出，创建即返回不阻塞）；--status（list_workers 更新记录 → 停滞检测 → 终态回收 getWorkerResult → persistStageReview）；--kill（清在途记录 + 平台处置指引，无专用 kill tool 时 fail-open）。index/command 只做 flag 解析与退出码映射——PI 等无 Agent tool/MCP 宿主由此获得 platform 审查通道的 CLI 入口（D-001）。
implementation:
  - src/index.js 加 case 'review-dispatch'——参照 register-stage-review 先例（index.js:1628）的解析风格，args.indexOf 取 --change/--stage 值、filteredArgs.includes 判 --status/--kill 布尔，缺参/形态互斥（--status 与 --kill 同给）打用法 + process.exit(2)，assertSafeChangeName 消毒 --change，stage 白名单校验 ∈ brainstorm|plan|execute
  - src/run/command.js——flag 若经 runCommand 校验循环（command.js:42 VALUE_FLAGS）则把 --stage 补进值类集合（--change 已在集合内），--status/--kill 保持布尔不吞值；校验循环只对 VALUE_FLAGS 跳下一 token，漏加会把 stage 的值误判成裸 token
  - case 体内动态 import('./review-dispatch.js') 调 runReviewDispatch(opts)（task-03 契约）——index 侧只组 opts（change/stage/status/kill + cwd/specDir）并按返回结果映射 process.exitCode；--json 时按 register 先例输出单行 JSON 信封
  - 用法文案（--help 或缺参触发）含三形态示例——创建（--change --stage 必填）、--status 轮询、--kill 处置；probe 不可用路径的剩余通道指引由 runReviewDispatch 输出，index 不重复拼
  - 冒烟自查三形态退出码语义——创建成功/probe 不可用/用法错误各自独立的 exit code（0 / 非零 / 2）
acceptance:
  - no-config 环境（无 mcp 段的临时目录）跑创建形态 → 非零退出，输出含 readReviewChannelPriority 去掉 platform 后的剩余通道指引文案
  - 缺 --change 或 --stage、stage 非法值、--status 与 --kill 同给 → 用法报错 exit 2
  - 三形态均进到 runReviewDispatch，index.js/command.js 内无 probe/create_mission/记录读写等业务分支（≤薄壳）
verify:
  - node --check src/index.js && node --check src/run/command.js
  - node bin/sillyspec.js review-dispatch --help（或无参用法输出）核对三形态用法文案
  - no-config 路径冒烟——临时目录（无 .sillyspec/local.yaml mcp 段）跑创建形态，期望非零退 + 剩余通道指引
constraints:
  - 不在 index/command 写业务逻辑（≤薄壳——解析、消毒、退出码；probe/mission/在途记录一律 import src/review-dispatch.js）
  - 跨平台路径（join 拼接不硬编码分隔符），不新增依赖
  - 纯新增 case，不动 run/gate 既有命令分支语义
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
