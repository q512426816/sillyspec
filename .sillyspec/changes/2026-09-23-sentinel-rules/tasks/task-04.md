---
id: task-04
title: 'Watermark backfill on watcher restart'
title_zh: '水位回补：重启按上次快照 diff 补发 backfill 事件（幂等）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:36:34
priority: P1
depends_on: [task-01, task-02]
blocks: [task-06]
requirement_ids: [FR-08]
decision_ids: [D-005@v1]
allowed_paths:
  - src/watcher.js
target_files:
  - src/watcher.js
goal: >
  修面板连续性：watcher 每轮把快照落盘 watcher-last-snapshot-<change>.json（内容与
  内存上次落盘串相同则跳过写）；重启时水位存在且可解析 → 以其为 prev 与首拍 diff，
  补发事件全部置 backfill:true（ts 取当前拍），照常入 jsonl/推送、规则引擎照常跑；
  幂等锚=水位消费即前移，同水位重复回补零事件。
implementation:
  - 导出 watcherSnapshotPath(runtimeRoot, changeName)（或 WATCHER_SNAPSHOT_FILENAME 生成器）+ loadSnapshotWatermark/writeSnapshotWatermark 两个小函数（load try/catch null=损坏全新启动）
  - runWatcherFromEnv（src/watcher.js:397 附近）：初始 prev 改为先 load 水位（无则现行为 buildSnapshot）；标记 watermarkBackfill=true，首轮 diff 事件置 backfill:true 后复位
  - 主循环每轮末（无论有无事件）writeSnapshotWatermark（与上次序列化串相同跳过；archived 首拍早退路径不读不写）
  - R4 stall 初值联动：state.lastActivityAt 初值取 max(启动时刻, 水位 ts)（水位落后即早已停滞，首拍即告警——Grill 修正②）
acceptance:
  - 幂等钉：同水位二次 load+diff → 零事件（单测直驱 load/write/inferEvents）
  - 水位缺失/损坏 JSON → 全新启动现行为（零回归）
  - 回补事件恒 provisional:true + backfill:true；archived 首拍早退不产生水位读写
  - 内容去重：快照未变的连续轮不重复写盘（串比对）
verify:
  - node --test test/sentinel-rules.test.mjs
  - npm run lint
constraints:
  - 非恢复依赖：水位只是面板连续性增强，任何失败降级全新启动
  - writeFileSync best-effort（失败 warn 不抛）；不 append（覆盖写，不膨胀）
  - 不动 IDLE_EXIT_MS/MAX_LIFETIME_MS/心跳租约语义
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
