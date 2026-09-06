---
id: task-01
title: 'src/design-facts.js 纯函数模块（解析/索引/核验/骨架生成）'
title_zh: 'src/design-facts.js 纯函数模块（解析/索引/核验/骨架生成）'
author: 'qinyi'
created_at: 2026-09-07 05:10:51
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1, D-004@v1]
allowed_paths:
  - src/design-facts.js
target_files:
  - NEW:src/design-facts.js
goal: >
  design-facts 纯函数模块——解析/索引/核验/骨架生成四函数，P3c 核心。
provides:
  - contract: validateDecisionModuleRefs
    fields:
      - errors
      - warnings
  - contract: generateDesignSkeleton
    fields:
      - skeleton
implementation:
  - parseDecisionDomains(decisionsText)：import decision-distill 的 parseDecisions（:98 已导出，单向依赖）取当前版本条目（同款最高版过滤，highestByNumber 未导出则本地实现同款并测试锁定双源一致）+ 模块域 parseListValue 同款解析，NEW:前缀项原样保留
  - loadModuleMap(specRoot, project)：modules id 集合 + paths 前缀对（复用 modules.js 或 decision-distill :226 同源解析思路；无 map 返回 null）
  - validateDecisionModuleRefs({ changeDir, specRoot, project })：NEW:前缀（冒号后无空格）豁免；∈ ids 通过；否则 ERROR（条目 id+非法 id+出路提示「补录 _module-map.yaml 或 NEW:前缀」）；NEW:带空格=ERROR 附正确写法；design.md 文件清单×paths 推导实改模块集，与声明域并集差异=WARNING 双向；无模块域汇总 WARNING；无 map/无 decisions=skipped
  - generateDesignSkeleton({ changeName, decisionsText, author, now })：十三章节骨架——章节标题逐字对齐 brainstorm Step6 既有模板/stage-contract-spec 目标定义；决策追踪表从当前版本 D 条目预填行；文件清单表骨架
acceptance:
  - 幻觉 id ERROR + NEW: 豁免 + 出路提示（单测锁定）
  - 骨架章节标题与 stage-contract-spec 目标定义一致（契约断言）
verify:
  - node --test test/design-facts.test.mjs
constraints:
  - 纯函数无 IO（骨架生成为字符串返回）；不接线（task-02 范围）

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
