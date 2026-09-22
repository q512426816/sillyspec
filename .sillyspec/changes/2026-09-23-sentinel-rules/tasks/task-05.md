---
id: task-05
title: 'run auto watcher spawn hook'
title_zh: 'run 族最小挂点：runAutoMode 头部 spawnWatcher（补 auto 早退缺口）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:36:34
priority: P1
depends_on: []
blocks: [task-06]
requirement_ids: [FR-09]
decision_ids: [D-006@v1]
allowed_paths:
  - src/run/command.js
target_files:
  - src/run/command.js
goal: >
  run 族观测面完整：现状核对后唯一缺口是 run auto 早退分支（src/run/command.js:1342
  return runAutoMode 发生在既有 1367 spawnWatcher 挂点之前）——在 runAutoMode 头部
  （changeName 回显后、循环前）补与 flow start 同款 best-effort spawnWatcher 块。
implementation:
  - src/run/command.js runAutoMode（约 src/run/command.js:1916，`if (changeName) console.log` 之后）：try/catch spawnWatcher(cwd, changeName, platformOpts)，r.status==='spawned' 打一行拉起提示；catch 只 warn
  - changeName 为空不 spawn（auto 入口守卫已保证单活跃；防御性判断）
  - 位置避开并行会话 A（stage-burst-fold）正在改的 1727/2073 一带；git 冲突时 rebase 以 A 为先、本提交在后
acceptance:
  - run auto 路径拉起 watcher（既有 run <stage> 路径 1367 挂点零改动——负例即既有行为不变）
  - spawn 失败只 warn 不阻断 auto 主流程（best-effort 钉）
  - SILLYSPEC_WATCHER=0 逃生阀语义继承（spawnWatcher 内部短路）
verify:
  - npm run lint
  - npm test
constraints:
  - 只加单块约 10 行，不动 runAutoMode 既有步骤推进/审批/triggerSync 逻辑
  - 不碰 1727/2073 一带（会话 A 冲突带）
  - 不改 spawnWatcher 本体（签名/锁语义不动）
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
