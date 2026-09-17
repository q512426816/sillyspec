---
id: task-04
title: 'parseDesignApiTable tolerant 解析器 + 骨架「接口验证覆盖矩阵」段（预填/口径注记/声明占位）+ 消费面与表间完备性 advisory 输出'
title_zh: 'parseDesignApiTable tolerant 解析器 + 骨架「接口验证覆盖矩阵」段（预填/口径注记/声明占位）+ 消费面与表间完备性 advisory 输出'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:06:55
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-05, FR-04, FR-06]
decision_ids: [D-005@v1, D-006@v1, D-007@v1]
allowed_paths:
  - src/verify-probes.js
target_files:
  - src/verify-probes.js
provides:
  - contract: api-face-parser
    fields:
      - parseDesignApiTable
      - endpoints
      - declared
      - 骨架矩阵段
      - advisory输出
goal: >
  给接口冒烟定「测什么」的依据物（D-005/D-006/D-007，FR-05/FR-04/FR-06）——
  parseDesignApiTable tolerant 解析 design 接口表端点集，generateVerifyResultSkeleton
  机械预填「## 接口验证覆盖矩阵」段（probe7 口径互指 + 声明降级占位），消费面与表间
  完备性 advisory warning 并入段尾——接口面不可静默为零、用例派生不再自由发挥。
implementation:
  - tolerant 解析器（src/verify-probes.js 新导出 parseDesignApiTable）——纯函数、本地正则零新依赖；输入统一 CRLF→LF 归一（parseRuntimeEndpointExcluded :1756 同款）后扫描：①段头过滤——仅含 接口/端点/API/REST 关键词的##级段头内的表格行才认（非接口段/文档示例行不计，R-02 误报防护）；②行内双条件——HTTP 方法 token（GET|POST|PUT|DELETE|PATCH，词边界）+ 路径样式 token（/xxx 路径或 {xxx} 模板段）缺一不认。产出 endpoints（[{method, path, rowIdx}]）+ declared（输入文本内「本变更接口面：N 端点」形态声明行的 N，缺席为 null——声明与解析并存以解析为准并注记）+ sectionHint（命中的接口段头，审计注记）。
  - 骨架矩阵段（src/verify-probes.js generateVerifyResultSkeleton :2045-2117）——在「## 探针结果（CLI 机械预填）」段（probe7 矩阵渲染面 :1310）之后增「## 接口验证覆盖矩阵」段：段头口径注记与 probe7 互指（probe7=验收项×测试承接面 / 本矩阵=接口端点×验证用例面，R-07）；解析出端点 → 逐端点预填行（端点列 METHOD /path 形态 + 判定列四枚举占位 covered/partial/uncovered/non-testable + 用例依据 ID / 结果 / 证据锚点列）与依据 ID 五形态锚点注释（design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径）；子行/探索行机械文法注释（子行=端点行下一行、两空格缩进、以「↳ <消费端>：」前缀书写，锚点要求 载荷@构造点路径；探索行=判定 uncovered + 证据列含 [探索] 标记不算覆盖）；解析零行 → 注入声明占位行「本变更接口面：<N> 端点（agent 声明）」；零解析零声明 → 渲染「无接口面」注记行（判级 critical 的 error 拦截归 task-05 validator）。
  - 消费面 advisory（D-006）——消费端归类=design 清单文件面启发式（routes/pages/model 目录词）+ task 卡 repo 声明（tasks/task-NN.md frontmatter）机械归类出 web/mp/script 等消费端集合；有消费端的端点未填子行 → warning 列出端点与检出消费端，输出并入矩阵预填段尾部（advisory 不阻断——归类启发式假提示无害，R-05）。
  - 表间完备性 advisory（D-007/FR-06）——权限矩阵段定位=段头启发式（含 权限/角色 关键词的##级段）；写端点=endpoints 中 method ∈ {POST, PUT, DELETE, PATCH}；命中=权限矩阵行内路径或动作 token 命中该端点，显式豁免=「无权限约束」标记；缺 → warning「写端点 X 未在权限矩阵声明——补行或显式豁免（表缺行会让派生框架继承你的洞）」，输出并入矩阵预填段尾部。
acceptance:
  - parseDesignApiTable 解析形态——规范接口表（## 接口定义 段内 GET/POST 行）产出 [{method, path, rowIdx}]；{xxx} 模板路径段端点被认；方法 token 词边界（GETTING 类不误认）与路径 token 双条件缺一不认；非接口段（非目标/先例引用段）表格行不计（段头过滤）；返回含 declared（声明行在场时为 N，缺席 null）与 sectionHint（命中段头）
  - 骨架生成——含接口面的 design.md 产出骨架含「## 接口验证覆盖矩阵」段（位于探针结果段之后），端点行按解析集预填、口径注记与 probe7 互指在场；解析零行 → 声明占位行「本变更接口面：<N> 端点（agent 声明）」在场；零解析零声明 → 「无接口面」注记行在场
  - 消费面 advisory——design 清单含 routes/pages/model 面或 task 卡 repo 声明时，检出消费端以 warning 行并入矩阵预填段尾部；子行文法（两空格缩进 ↳ 前缀）与 载荷@构造点路径 锚点要求写入段注释
  - 表间完备性 advisory——写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段命中且无「无权限约束」豁免 → warning 文案落矩阵段尾部；命中或豁免在场 → 该端点零 warning
  - probe7 既有矩阵段渲染零改动（接口矩阵为独立 ## 章节并行存在）；npm test 全量不回归
verify:
  - npm test
  - npm run lint
constraints:
  - 不做 validator——validateApiCoverageMatrix（行数对账/covered 记账/锚点解析级校验/移交联动/降级 error）归 task-05；本任务只交付解析器、骨架段与 advisory 渲染面（校验时点 warning 注册同归 task-05）
  - 分层单向（全局硬约束 3）——parseDesignApiTable 产出经 verify-probes 侧导出/落盘/经 context 传参给 task-05 消费，stage-contract 内不动态 import
  - 不动 probe7 既有矩阵（独立章节，口径注记互指，D-009 非目标）；零新依赖（解析器本地正则）；CRLF/LF 归一容忍（Windows/Linux/macOS）
  - 测试划界——不建不改 test/api-coverage-matrix.test.mjs（解析五形态/对账/advisory 断言归 task-07）
  - 幂等口径——预填只在骨架生成新写路径生效，agent 已填内容不覆盖（renderProbe7Lines :954-958 先例）
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
