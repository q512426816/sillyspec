---
id: task-02
title: 'preview-progress 投影纯函数+短连接写入+watcher 循环接线'
title_zh: 'preview-progress 投影纯函数+短连接写入+watcher 循环接线'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 16:10:27
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02,FR-07]
decision_ids: [D-004@v1, D-005@v1]
allowed_paths:
  - NEW:src/preview-progress.js
  - src/watcher.js
  - NEW:test/preview-progress.test.mjs
target_files: [NEW:src/preview-progress.js, src/watcher.js, NEW:test/preview-progress.test.mjs]
goal: >
  投影纯函数+短连接写入+watcher 循环接线——预览账本的写路径
implementation:
  - NEW src/preview-progress.js：projectPreviewStages({changeName,snapshot,prevSnapshot}) 纯函数——快照差分→阶段级行集，archived 拍不投影，evidence 携带事件序号引用与 ts
  - writePreviewStages({specDir,changeName,rows,maxRows=8})：db-engine openDatabase 短连接→逐行 INSERT ... ON CONFLICT(change_name,stage) DO UPDATE ... WHERE stages.authority='watcher'→close；异常整体吞返回 false（FR-07）
  - watcher.js 轮询 inferEvents 之后 best-effort 调一次投影（写失败 warn 一行不影响事件流）
acceptance:
  - 投影纯函数组测试绿（差分→行集/archived 不投影/evidence 在场）
  - 写纪律组：既有 cli 行不被触碰、无行时写入、maxRows 截断、写异常 fail-open
verify:
  - node --test test/preview-progress.test.mjs
constraints:
  - 短连接毫秒级锁窗，不持长连接
  - 事件 jsonl 流不受预览写失败影响
  - maxRows=8 写放大护栏
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
