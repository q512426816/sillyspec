---
id: task-01
title: 'src/endpoint-baseline.js（capture 复用 scanBackendEndpoints + diff 归一）'
title_zh: 'src/endpoint-baseline.js（capture 复用 scanBackendEndpoints + diff 归一）'
author: 'qinyi'
created_at: 2026-09-07 07:52:45
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/endpoint-baseline.js
target_files:
  - NEW:src/endpoint-baseline.js
goal: >
  基线采集与增删计算纯函数——复用生态既有组装与归一。
provides:
  - contract: captureEndpointBaseline
    fields:
      - written
  - contract: diffEndpointSets
    fields:
      - added
      - removed
implementation:
  - captureEndpointBaseline({ cwd, changeName, runtimeRoot })：复用 endpoint-extractor 的 scanBackendEndpoints（:217 文件枚举+三提取器分派）扫主仓 → { schemaVersion:1, change, baseCommit, generatedAt, endpoints:[{method,path,source}] }；写 runtimeRoot/endpoint-baselines/<change>.json，已存在 return {written:false, reason:'exists'}（幂等不覆盖）；抽取异常 fail-soft 返回 {written:false, error}
  - diffEndpointSets(baselineEndpoints, currentEndpoints)：key = METHOD大写 + normalizePath（:372 参数归一）+ 去尾斜杠 → {added:[{method,path,source}], removed:[...]}；changed 不配对独立行；输入 null → null
acceptance:
  - 幂等（首拍 written:true/重跑 false）；normalizePath 使参数改名不假报
verify:
  - node --test test/endpoint-baseline.test.mjs
constraints:
  - 纯函数零 IO 例外（capture 写基线文件是唯一 IO）；不接线（task-02/03 范围）

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
