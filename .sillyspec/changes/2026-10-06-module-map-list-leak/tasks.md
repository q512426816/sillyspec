---
author: flow-machine-draft
created_at: 2026-10-06T06:35:49.994Z
---
# 任务注册表（Tasks）— 2026-10-06-module-map-list-leak

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-module-map-list-leak --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-module-map-list-leak` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 三个解析器（parseModulePathsSubset / parseModuleMapPaths / parseModuleMapSimple）修复列表收集终止条件：任何缩进 4 的字段头行（形如 '字段名:' 或 '字段名: 值'——开放世界判据，不枚举字段名清单）终结上一个 list 字段的收集；块式 paths 后跟 tags/aliases/depends_on 的 yaml 解析后 paths/core_files 恰只含各自声明的列表项；未来新增字段名（当前未识别的自定义字段）同样不泄漏；既有内联 'paths: [..]' 行为不变
- [x] task-02: flow start fresh 起点域路由的 input token 增加在场过滤：token 相对 cwd 在文件系统存在（existsSync）才参与域路由——文件系统当裁判不建前缀白名单；绿地模块图草案的路径提取（bsPaths）保持不过滤（绿地语料允许指向尚不存在的目标）；实测误路由用例回归：git/DB/JSON 不再路由到 server-parser
- [x] task-03: 测试覆盖：三解析器的块式多字段不泄漏回归、未识别自定义字段名不泄漏（开放世界性）、routing 在场过滤保留真实路径 token 且过滤散文斜杠词、绿地草案路径提取不受影响
