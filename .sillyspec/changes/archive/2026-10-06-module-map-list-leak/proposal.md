---
author: flow-machine-draft
created_at: 2026-10-06T06:35:49.994Z
---
# 提案书（Proposal）— 2026-10-06-module-map-list-leak

## 动机

任务原话转写：动机：轻量道实测（2026-10-06-wallclock-entry）发现 flow start 知识注入触达域误判——input 散文斜杠词 git/DB/JSON 被提取为路径样 token，前缀命中 dashboard 项目 server-parser 模块泄漏进 paths 的 tag 项 'git'，伪路由冒充真域 server-parser。根因：_module-map.yaml 的三个手写解析器对块式列表的收集终止条件残缺——parseModulePathsSubset（decision-distill.js，域路由/FR 覆盖排名/complete-handlers 消费）与 parseModuleMapPaths（module-impact.js，归属分类消费）只认已知字段，paths: 块之后遇到任意未知字段头（tags/aliases/entrypoints/main_symbols/depends_on/used_by…开放集）不重置收集 key，后续列表项全部漏进 paths/core_files；parseModuleMapSimple（modules.js）依赖字段名枚举白名单，枚举外新字段同样漏。量化：docs/ 下 8 个项目 map 合计 950 条实路径 vs 1375 条泄漏项；api/v1/users、server/client 等常见 token 均误命中。次生发现：fresh 起点域路由对 input token 无在场校验，散文斜杠词直接参与路由。

成功标准：
- 三个解析器（parseModulePathsSubset / parseModuleMapPaths / parseModuleMapSimple）修复列表收集终止条件：任何缩进 4 的字段头行（形如 '字段名:' 或 '字段名: 值'——开放世界判据，不枚举字段名清单）终结上一个 list 字段的收集；块式 paths 后跟 tags/aliases/depends_on 的 yaml 解析后 paths/core_files 恰只含各自声明的列表项；未来新增字段名（当前未识别的自定义字段）同样不泄漏；既有内联 'paths: [..]' 行为不变
- flow start fresh 起点域路由的 input token 增加在场过滤：token 相对 cwd 在文件系统存在（existsSync）才参与域路由——文件系统当裁判不建前缀白名单；绿地模块图草案的路径提取（bsPaths）保持不过滤（绿地语料允许指向尚不存在的目标）；实测误路由用例回归：git/DB/JSON 不再路由到 server-parser
- 测试覆盖：三解析器的块式多字段不泄漏回归、未识别自定义字段名不泄漏（开放世界性）、routing 在场过滤保留真实路径 token 且过滤散文斜杠词、绿地草案路径提取不受影响

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 三个解析器（parseModulePathsSubset / parseModuleMapPaths / parseModuleMapSimple）修复列表收集终止条件：任何缩进 4 的字段头行（形如 '字段名:' 或 '字段名: 值'——开放世界判据，不枚举字段名清单）终结上一个 list 字段的收集；块式 paths 后跟 tags/aliases/depends_on 的 yaml 解析后 paths/core_files 恰只含各自声明的列表项；未来新增字段名（当前未识别的自定义字段）同样不泄漏；既有内联 'paths: [..]' 行为不变
2. flow start fresh 起点域路由的 input token 增加在场过滤：token 相对 cwd 在文件系统存在（existsSync）才参与域路由——文件系统当裁判不建前缀白名单；绿地模块图草案的路径提取（bsPaths）保持不过滤（绿地语料允许指向尚不存在的目标）；实测误路由用例回归：git/DB/JSON 不再路由到 server-parser
3. 测试覆盖：三解析器的块式多字段不泄漏回归、未识别自定义字段名不泄漏（开放世界性）、routing 在场过滤保留真实路径 token 且过滤散文斜杠词、绿地草案路径提取不受影响

## 成功标准（可验证）

1. 三个解析器（parseModulePathsSubset / parseModuleMapPaths / parseModuleMapSimple）修复列表收集终止条件：任何缩进 4 的字段头行（形如 '字段名:' 或 '字段名: 值'——开放世界判据，不枚举字段名清单）终结上一个 list 字段的收集；块式 paths 后跟 tags/aliases/depends_on 的 yaml 解析后 paths/core_files 恰只含各自声明的列表项；未来新增字段名（当前未识别的自定义字段）同样不泄漏；既有内联 'paths: [..]' 行为不变
2. flow start fresh 起点域路由的 input token 增加在场过滤：token 相对 cwd 在文件系统存在（existsSync）才参与域路由——文件系统当裁判不建前缀白名单；绿地模块图草案的路径提取（bsPaths）保持不过滤（绿地语料允许指向尚不存在的目标）；实测误路由用例回归：git/DB/JSON 不再路由到 server-parser
3. 测试覆盖：三解析器的块式多字段不泄漏回归、未识别自定义字段名不泄漏（开放世界性）、routing 在场过滤保留真实路径 token 且过滤散文斜杠词、绿地草案路径提取不受影响
