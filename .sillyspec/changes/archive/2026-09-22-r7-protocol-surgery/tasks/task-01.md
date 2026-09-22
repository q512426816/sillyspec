---
id: task-01
title: 'Implement change watcher with lease and event stream'
title_zh: '实现变更 watcher（心跳租约+轮询三源事件+provisional 流+墙钟拆账）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-22 10:58:49
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1]
allowed_paths:
  - src/watcher.js
  - src/run/command.js
  - test/watcher.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
target_files:
  - NEW:src/watcher.js
  - src/run/command.js
  - NEW:test/watcher.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
provides:
  - contract: spawnWatcher
    fields: [cwd, changeName, runtimeRoot, spawnImpl]
goal: >
  watcher 独立进程观测 change 产物签名（文件/git/工件三源），事件恒带 provisional:true
  落本地 jsonl 并 best-effort 推平台——为切片二提供与 CLI 调用数解耦的观测面（D-001）。
implementation:
  - NEW src/watcher.js：循 src/run/bg-sync.js 骨架（spawn detached+windowsHide+单飞锁+日志 1MB 截尾）加心跳租约——锁文件 .runtime/watcher.lock 增 heartbeatAt 字段，子进程每 30s 刷新，5min 无心跳或 pid 死判死（isWatcherLeaseLive 纯函数）；未连接平台也 spawn（与 bg-sync 反向）
  - 轮询快照 diff（3s 间隔，弃 fs.watch）：change 子树 mtime+内容 hash、git log -1 头指针、.runtime 质量扫描记录三类源；inferEvents(prevSnap,nextSnap) 纯函数推断阶段（proposal.md/requirements.md/design.md/tasks.md 出现与变更、任务卡中划空格翻格计数、新提交、verify 工件、change 目录移入 archive 即 archived 终态自退）
  - 事件 append .runtime/watcher-events-<change>.jsonl（每事件 ts/kind/stage/detail/provisional true）；平台推送循 src/agent-session-log.js 模式（readPlatformPushConfig+POST 专用 events 端点+5s 超时+best-effort+env 开关，未配置或非 2xx 静默降级本地）
  - aggregateStageTiming(events) 纯函数聚合阶段墙钟拆账落 .runtime/watcher-stage-timing-<change>.json；空闲 6h 无事件自退；SILLYSPEC_WATCHER=0 逃生阀
  - src/run/command.js effectiveChange 解析后（约 1344 行，registerChange 调用后）无条件 spawnWatcher——活锁在跑则 coalesced 直接返回；SILLYSPEC_WATCHER=0 短路
  - NEW test/watcher.test.mjs：inferEvents/aggregateStageTiming/租约判死（含 pid 复用假活）/杀灭零影响/provisional 标记/harness 解耦钉断言
  - module-map：src/watcher.js 录入 sync 模块 paths
acceptance:
  - harness 无 agent 产物流程：watcher 事件数与 CLI 调用数解耦（事件来自文件/git/工件三类源，不随调用数等比例下降）
  - 全部事件恒带 provisional:true
  - watcher 被杀/SILLYSPEC_WATCHER=0 时主流程命令正常返回零影响（best-effort 语义）
  - 租约判死覆盖心跳过期与 pid 死两态；pid 复用假活有守卫
  - 墙钟拆账 json 落盘且阶段序列单调
verify:
  - node --test test/watcher.test.mjs
  - npm run lint
  - npm test
constraints:
  - 不碰协议（run/command.js 仅加 spawn 接线，不改 stage 步进语义）
  - 不动 registerChange/initChange 返回值语义（无条件 spawn+锁合并，不做新建检测）
  - Windows 兼容：轮询弃 fs.watch；路径 path.join；jsonl appendFileSync
  - watcher 崩溃/不 spawn 零影响主流程；平台推送失败只 warn 不抛
  - 不触 DB schema；事件不写 SQLite
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
