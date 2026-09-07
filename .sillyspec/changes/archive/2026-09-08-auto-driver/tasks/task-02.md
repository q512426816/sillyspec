---
id: task-02
title: '三态 --change——单活跃回显 + 多活跃 auto 文案 + 零活跃建变更'
title_zh: '三态 --change——单活跃回显 + 多活跃 auto 文案 + 零活跃建变更'
author: 'qinyi'
created_at: 2026-09-08 06:38:23
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-003@v1]
allowed_paths:
  - src/run/command.js
target_files: [src/run/command.js]
goal: >
  三态 --change：单活跃回显 + 多活跃 auto 专门文案 exit 2 + 零活跃新增建变更。
implementation:
  - 单活跃：既有 pm.read(cwd,null) 自动采用，补 console 回显「auto 目标变更：<名>」
  - 多活跃：既有守卫处补 auto 专门文案（对齐 brainstorm :1076 先例）列候选 exit 2
  - 零活跃：复用 brainstorm :1082-1089 的 date-new-change-hex 命名 + title 逻辑建变更（auto 入口新增分支）
  - autoMeta 透传：runAutoMode 三处 outputStep 调用点传 { changeName }
acceptance:
  - 单活跃自动选中且回显
  - 多活跃 exit 2 列候选
  - 零活跃 run auto --input 建变更不再 exit 2
  - 三态各进测试
verify:
  - node --check src/run/command.js
  - 测试在 task-06
constraints:
  - 不动单阶段 run 的 --change 语义
  - 建变更复用 brainstorm 逻辑不复制（抽 helper 或注释指引）
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
