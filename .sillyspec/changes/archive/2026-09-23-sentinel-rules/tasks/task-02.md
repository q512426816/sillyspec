---
id: task-02
title: 'Sentinel rules engine: four advisory rules'
title_zh: 'applySentinelRules 四规则引擎+子进程循环接线（恒 advisory warning）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:36:34
priority: P0
depends_on: [task-01]
blocks: [task-04, task-06]
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1]
allowed_paths:
  - src/watcher.js
target_files:
  - src/watcher.js
expects_from:
  - contract: buildSnapshot 扩展字段（task-01）
    fields: [commits, dirtyCode, scanStatus, reviews, checkedTasks]
goal: >
  watcher 从只看升级为会喊：applySentinelRules({prev, next, baseEvents, state, now})
  纯函数四规则（假勾选/改测试凑绿/范围漂移/停滞），输出恒 advisory warning 事件
  {ts, kind:'warning', stage:null, rule, severity:'warning', detail, provisional:true}
  入既有 jsonl+平台推送；createSentinelState 初值；runWatcherFromEnv 主循环接线
  （inferEvents 后调用，warning 与基础事件同管线追加/推送，但不计活动不触发 archived 退）。
implementation:
  - R1 假勾选：baseEvents kind='task-done' 且 next/prev.files[k].checkedTasks 差集非空；证据=区间新提交（next.commits 中 prev.commits 不含的 hash）subject 匹配 task-NN 用负向前瞻 RegExp(taskId+'(?!\\\\d)')，或 reviews 中路径含 /tasks/task-NN/ 条目 mtime 变化；翻格零证据 → warning（rule:'fake-check'）
  - R2 改测试凑绿：state.testTamper 状态机——scanStatus.status='failed' 置锚（快照当时 testDirtyAtFail=dirtyCode∩test/**）；锚在场期新 test/** 脏文件（不在 testDirtyAtFail 中）或区间新提交 files 触及 test/** → testChanged；随后 status='passed' 且 testChanged → warning（rule:'test-tamper'）并清锚；skipped 不参与；新 FAIL 重置
  - R3 范围漂移：声明面=任务卡 allowed_paths（tasks/task-*.md frontmatter 缩进列表，反引号剥离）∪ design.md 文件清单条目（NEW: 前缀剥、normalizePath 归一，复用 src/change-list.js globMatch 精确/glob 容差）；两源皆空跳过；dirtyCode 未命中集合 − state.lastDriftFiles 非空 → warning（rule:'scope-drift'），state.lastDriftFiles=当前未命中全集
  - R4 停滞：state.phase early→execute 锁存（baseEvents 含 task-done，或 next.files 有 tasks.md 且区间有新提交）；阈值 STALL_EARLY_MS=20min/STALL_EXECUTE_MS=15min（导出常量）；now−lastActivityAt>阈值且 !stallOpen → warning（rule:'stall'，detail 含相位/闲置毫秒）置 stallOpen；任意 baseEvent 复位 lastActivityAt/stallOpen
  - runWatcherFromEnv（src/watcher.js:436 附近）：inferEvents 后 try/catch 调引擎，batch=[...events, ...warnings] 同管线 append+timing+push；lastActivityAt（空闲自退）与 archived 终态判定仍只认 baseEvents
acceptance:
  - 四规则各 ≥1 正 ≥1 负 fixture 单测（task-06 测试文件，正例各出对应 rule 的 warning，负例零 warning）
  - warning 事件恒带 provisional:true+severity:'warning'+rule 名；kind='warning' 与基础事件可区分
  - 引擎抛异常被 try/catch 吞（warn 后主循环继续）——best-effort 钉
  - 不写 progress db（引擎零 db 引用）
verify:
  - node --test test/sentinel-rules.test.mjs
  - npm run lint
constraints:
  - 恒 advisory：无 blocking/error 级别；warning 不计 lastActivityAt、不触发 archived 自退
  - prev 缺新字段（旧水位）按空集/null 容错（fail-open）
  - 声明面文件读取失败/不存在 → R3 跳过，不告警
  - task-NN 匹配一律词边界（task-01 不证 task-010）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/<file>.js:<行号>）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
