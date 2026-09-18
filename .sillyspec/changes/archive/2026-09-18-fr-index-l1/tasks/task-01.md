---
id: task-01
title: 'Parameterize decision-distill base functions for reuse'
title_zh: 'decision-distill 四底座函数参数化重构（splitKnowledgeSections 节头正则经参/syncIndexRoutingLines 的 INDEX 节名与子目录经参/joinKnowledgeFile/discoverModuleIndex 导出）——decisions 侧行为零回归由既有测试钉死'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:16:22
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-003@v1]
allowed_paths:
  - src/decision-distill.js
expects_from:
  task-02: 'fr-index 将以 {sectionRegex, indexSection, subdir} 参数调用四函数'
goal: >
  把 decision-distill 的四个内部函数变成 fr-index 可复用的参数化底座，decisions 侧行为零回归。
implementation:
  - splitKnowledgeSections 接节头正则参数（decisions 缺省 ^## (D-\d+)@v(\d+) 不变；fr 侧传 FR 形态正则）
  - syncIndexRoutingLines 接 INDEX 节名/子目录/链接前缀参数（decisions 缺省值不变）
  - joinKnowledgeFile / discoverModuleIndex 直接导出
  - 既有 distill 调用点全部走缺省参数——代码路径等价
acceptance:
  - 既有 decision-distill 测试族全绿（decision-distill-cross-change / flat-list / heading-variants 等，npm test 自动发现）
  - 四函数 export 可从模块 import
verify:
  - node --input-type=module -e "import * as d from './src/decision-distill.js'; console.assert(typeof d.splitKnowledgeSections==='function' && typeof d.syncIndexRoutingLines==='function' && typeof d.joinKnowledgeFile==='function' && typeof d.discoverModuleIndex==='function')"
  - node test/decision-distill-cross-change-supersede.test.mjs（如名不同以 ls test/ | grep distill 为准逐个跑）
constraints:
  - decisions 侧调用点与输出零变更（缺省参数等价）
  - 不动 parseDecisions/distillIntoKnowledge 主流程
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
