---
id: task-01
title: 'codegraph 适配层（探测三态/形状映射/cmd-shim）+单测'
title_zh: 'codegraph 适配层（探测三态/形状映射/cmd-shim）+单测'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-14 22:24:31
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-03]
decision_ids: ['D-002@v1']
allowed_paths:
  - src/scan-codegraph.js
  - test/scan-codegraph.test.mjs
target_files:
  - NEW:src/scan-codegraph.js
  - NEW:test/scan-codegraph.test.mjs
provides:
  - contract: probeCodegraph
    fields: [available, reason, status]
  - contract: listIndexFiles
    fields: [path, language, nodeCount, size]
  - contract: affectedTests
    fields: [affectedTests, truncated]
  - contract: resolveCodegraphCommand
    fields: [command, baseArgs]
goal: >
  新建 CodeGraph CLI 统一封装层：探测三态（fail-soft）、Windows cmd-shim 解析、
  三个命令的防御式形状映射（status/files flat/affected）、分级超时与统一 env——
  增量 scan 的全部 codegraph 子进程调用经此单点，探测失败绝不阻断。
implementation:
  - resolveCodegraphCommand()：Windows 下解析 npm 全局 .cmd shim 到真实 node 入口（参考 multi-agent-platform 仓 sillyhub-daemon/src/codegraph/cli.ts:117-160 思路自实现轻量版，不引跨仓依赖）；非 Windows 直接返回 {command:'codegraph', baseArgs:[]}
  - 底层 exec 封装：execFile 参数数组（禁 shell 拼接，src/worktree-deps.js:260 惯例）、统一 env 注入（CODEGRAPH_DIR='.sillyspec-codegraph' + CODEGRAPH_TELEMETRY=0 + DO_NOT_TRACK=1，cwd=root）、分级超时（version/status 5s、query 10s、affected 15s、sync 60s）、maxBuffer 32MB、windowsHide
  - probeCodegraph(root)：status <root> -j → JSON.parse 防御式——命令不存在（ENOENT）/initialized:false/index.state!=='complete'/超时/解析失败 → {available:false, reason:中文原因}；成功 → {available:true, reason:'索引就绪', status:解析对象}
  - listIndexFiles(root)：files -p <root> --format flat -j → 裸数组映射 [{path, language, nodeCount, size}]；输出非数组/解析失败 → null
  - affectedTests(root, files)：affected -p <root> -j <files...> → {changedFiles, affectedTests}；截断 200 置 truncated:true；失败 null
  - execFile 与命令解析器均可注入（测试 mock，不真 spawn codegraph——参考 daemon cli.ts CodegraphCliDeps 形态）
  - 新建 test/scan-codegraph.test.mjs：探测三态×降级路径（ENOENT/未 init/state 非 complete/超时/污染输出混非 JSON 行/字段缺失）、形状映射防御式、cmd-shim 解析、env 注入断言、截断标记——纯 mock 单测
acceptance:
  - probeCodegraph 对命令不存在/未初始化/索引未完成/超时/输出不可解析五类输入全部返回 {available:false, reason 非空中文}，零 throw（单测断言）
  - status/files/affected 形状映射对实测形状（2026-11-14 实测 1.6.2）字段正确取出；污染输出（npm 噪声前缀行）与缺字段样本降级不崩（单测夹具覆盖 Review Focus #1）
  - 所有子进程调用为 execFile 参数数组，env 三键恒定注入，超时按命令分级（单测断言 RecordedExecOptions）
  - 不携带 --local-only/--no-telemetry（1.6.2 发布包无此参数——design 硬约束）
verify:
  - node --test test/scan-codegraph.test.mjs（或仓内既有 runner 形态，按 test/ 目录惯例）
constraints:
  - 全程 fail-soft：任何异常返回不可用/null，绝不抛出阻断主流程（D-002）
  - 零新运行时依赖（node:child_process 既有面）
  - 错误/提示文案中文
  - 不做索引维护编排（init/index/sync 生命周期不在本变更——sync 仅留封装供未来用）
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
