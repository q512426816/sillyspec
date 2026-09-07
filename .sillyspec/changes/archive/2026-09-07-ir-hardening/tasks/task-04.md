---
id: task-04
title: 'design 清单核验——validateDesignFileList（glob/占位/NEW: 分级）+ brainstorm 末步接线'
title_zh: 'design 清单核验——validateDesignFileList（glob/占位/NEW: 分级）+ brainstorm 末步接线'
author: 'qinyi'
created_at: 2026-09-07 23:13:34
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-004@v1]
allowed_paths:
  - src/design-facts.js
  - src/run/complete.js
target_files: [src/design-facts.js, src/run/complete.js]
goal: >
  design.md 文件清单行级核验：幻觉路径 ERROR 阻断 brainstorm 完成（对齐 validateTargetFiles 先例）。
implementation:
  - design-facts.js 增 validateDesignFileList({ changeDir, cwd }) 纯函数
  - parseFileChangeListDetailed(join(changeDir,'design.md'), { keepSillyspecDocs: true }) 逐条目
  - 分级：NEW: 前缀（startsWith 直判）或 existsSync(join(cwd,path)) → 过；含 * 或 ? → warning 跳过；<...> 占位段归一化剥除后再判；其余 → errors { path, message }（code design_file_ref_invalid）
  - design.md 无清单段 → warning（small 可无清单）；解析异常 → warning 不阻断（fail-soft）
  - complete.js brainstorm「生成规范文件」步（决策模块域同点位）：errors 非空 → exit 1 指引（修清单或补 NEW:）
acceptance:
  - 幻觉路径 ERROR 阻断 + 文案含出路
  - NEW:/glob/占位三形态豁免或跳过
  - .sillyspec/ 交付物路径在核验范围（keepSillyspecDocs: true）
  - 无清单段/解析异常 WARNING 不阻断
verify:
  - node --check src/design-facts.js src/run/complete.js
  - 测试在 task-09（design-file-list-gate）
constraints:
  - 纯函数不落盘
  - 挂点仅在 brainstorm 末步（plan/verify 不重复核验——plan 侧 validateTargetFiles 已有）
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
