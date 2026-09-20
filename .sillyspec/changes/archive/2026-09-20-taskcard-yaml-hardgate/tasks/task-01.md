---
id: task-01
title: 'add shared taskcard frontmatter parser module (splitFrontmatter + parseTaskFrontmatter)'
title_zh: '新增共享 frontmatter 解析源模块——splitFrontmatter 提取 + parseTaskFrontmatter 三态解析'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 22:27:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/taskcard-frontmatter.js
target_files:
  - NEW:src/taskcard-frontmatter.js
provides:
  - contract: 'TaskcardFrontmatterParse'
    fields:
      - 'splitFrontmatter 返回 has/yamlText/yamlStartLine（界定含回车容错，yamlStartLine 恒 2）'
      - 'parseTaskFrontmatter 返回 ok/hasFrontmatter/fm/error 四键'
      - 'error.line 为文件 1 基行（js-yaml mark.line + 2）'
      - 'error.column 为 1 基列（mark.column + 1）'
goal: >
  新增 src/taskcard-frontmatter.js 作为 plan 与 verify 两侧消费的单一 frontmatter 解析源。
  splitFrontmatter 负责界定提取（与 verify-probes.js:1723 同款回车容错口径）；parseTaskFrontmatter
  把 jsYaml.load 异常转为显式 error 对象（mark 换算文件 1 基行:列）。除 js-yaml 零仓内依赖
  （plan-postcheck 与 worktree-apply 有既有依赖边，防环铁律）。
implementation:
  - 新建 src/taskcard-frontmatter.js，唯一 import 为 js-yaml
  - splitFrontmatter(content)：frontmatter 界定与 verify-probes.js:1723 同款口径，返回 has、yamlText、yamlStartLine（恒 2）
  - parseTaskFrontmatter(content) 三态：无 frontmatter 时 ok=true 且 hasFrontmatter=false；jsYaml.load 抛错时 ok=false 且 error 含 message、line（mark.line+2）、column（mark.column+1，mark 缺席回退 1）；合法时 ok=true、hasFrontmatter=true、fm 为解析对象
  - jsdoc 写明行号换算公式与 0 基语义（测试断言锚点，design R-01）
acceptance:
  - 合法 frontmatter 输入返回 ok=true 且 fm 为解析对象、error 为 null
  - 坏 YAML 输入（未闭合 flow 序列）返回 ok=false 且 error.line 等于 js-yaml mark.line+2
  - 无 frontmatter 输入返回 ok=true 且 hasFrontmatter=false
  - 模块 import 面仅 js-yaml（Node 内建不算仓内依赖）
verify:
  - node --check src/taskcard-frontmatter.js
  - node --test test/taskcard-frontmatter-hardgate.test.mjs（task-04 落地后回归）
constraints:
  - 不 import 仓内任何模块（防环）
  - 不改动 plan-postcheck.js 与 verify-probes.js（归 task-02/03）
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
