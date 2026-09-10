---
id: task-02
title: 'client getWorkerResult wrapper'
title_zh: 'client getWorkerResult 封装'
author: 'qinyi'
created_at: 2026-09-10 13:54:29
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-001@1]
allowed_paths:
  - src/sillyhub-mcp/client.js
  - test/sillyhub-mcp-platform-fixes.test.mjs
target_files:
  - src/sillyhub-mcp/client.js
  - test/sillyhub-mcp-platform-fixes.test.mjs
goal: >
  SillyHubMcpClient（src/sillyhub-mcp/client.js）新增 getWorkerResult({ missionId, workerId })：
  调平台 get_worker_result tool，解析返回 {worker_id, status, artifacts: [{kind, content_ref, id}]}；
  未配置/调用失败/isError → { workerId: null, status: 'unavailable', artifacts: [] }——与
  dispatchWorker/getDaemonStatus 同族 best-effort 风格。FR-04 回收链必需（--status 读到
  worker completed 后经此取 artifacts，get_worker_result 现无 CLI 封装，Grill gap①）。
implementation:
  - 参照同文件 dispatchWorker（~L529）/getDaemonStatus（~L566）模式：_configured 前置短路 → _callTool('get_worker_result', {mission_id, worker_id})（参数取入参 missionId/workerId）→ result === null 或 isError → unavailable 形态 → _parseToolReturnValue 解析
  - 解析字段：workerId 取 worker_id ?? workerId ?? id 兜底（dispatchWorker id 兜底同款）；status 缺省 'unknown'；artifacts 非数组或缺省 → []，数组项原样透传、不按 {kind,content_ref,id} 白名单裁剪（形态演进容错留给消费方 task-03 extractReviewFromArtifacts）
  - 单测并入 test/sillyhub-mcp-platform-fixes.test.mjs（沿用既有 monkey-patch cli._callTool 风格），三分支：正常 artifacts 形态 / 返回无 artifacts（空） / isError（如 token 缺 scope）——断言各分支返回形态且不抛
  - 顺带断言未配置分支（_configured=false）返回 unavailable 形态不抛
acceptance:
  - node --test test/sillyhub-mcp-platform-fixes.test.mjs 全绿（既有用例 + 新增 getWorkerResult 用例）
  - 三分支行为符合契约：正常 → {workerId, status, artifacts} 原样解析；空/isError/未配置 → {workerId:null, status:'unavailable', artifacts:[]}，全程不抛
  - dispatchWorker/getDaemonStatus/listWorkers 等既有方法行为零变化（既有用例不回归）
verify:
  - node --test test/sillyhub-mcp-platform-fixes.test.mjs（新增用例绿 + 既有用例无回归）
constraints:
  - best-effort 不抛：tool 不存在/网络异常/isError/未配置一律降级 unavailable 形态，绝不向上抛
  - 不引新依赖，不改 client.js 既有方法行为
  - artifacts 只透传不解读：kind 匹配/JSON 提取等语义解析属 task-03 extractReviewFromArtifacts，本封装保持传输层纯度
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
