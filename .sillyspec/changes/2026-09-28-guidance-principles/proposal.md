---
author: flow-machine-draft
created_at: 2026-09-28T05:35:51.108Z
---
# 提案书（Proposal）— 2026-09-28-guidance-principles

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:56278878eda8a0d8bdb57f50891c29e69d78d3b83ac8e00666c11313e93cc430:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-guidance-principles 留痕重锚 -->
任务原话转写：背景：2026-09-28 平台仓 frontend-apple-style 会话在头脑风暴阶段手绘单文件原型（遵循了 CLAUDE.md 旧指针），暴露三层缺口：①用户多次声明的「工具引导不限制语言框架」原则从未落知识库（昨日查证零记录）；②UI 执行须知只挂在 flow start，brainstorm 阶段（原型真正诞生地）无注入；③须知现文案只说「确认视觉基准」太虚，agent 不知道该就近发现本仓原型管线。用户同轮追加裁决：「门的位置应该跟错误的修复成本走，不是都堆在收口」也须入档。
成功标准：
- FR 落档两条并随归档入知识索引：工具引导产物语言生态中立（不绑定语言、框架、包管理器、构建工具；生态命令由仓与项目自描述，agent 就近发现）；门位原则（检查挂载时机与错误修复成本匹配：方向性错误开工引导、局部文本错误过程测试加收口兜底、累积性漂移三层都要）
- UI 执行须知改写为四条原则版：定稿原型必须是可复跑真码产物、开工先就近发现本项目管线（多项目仓按触达路径就近）、手绘单文件仅限粗选、视觉降级须用户裁决留痕——零生态词零命令
- brainstorm 阶段注入：方案对比步骤 prompt 增占位符，触达 UI 关键词时注入同一须知（fail-soft，指纹掩蔽防漂移）
- 引导输出断言测试：跑全部引导构建函数断言输出不含生态命令词（pnpm、npm run、yarn、gradle、mvn、pip install 等形态）
- 既有 ui-visual 测试同步断言新原则内容；过程与收口双时机可触发（动态测试推断自动绑定）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:aa9502aeb4db0abac38ad5fb198126e06c3babe96aacb7c34be52c7a8328271c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-guidance-principles 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. FR 落档两条并随归档入知识索引：工具引导产物语言生态中立（不绑定语言、框架、包管理器、构建工具
2. 生态命令由仓与项目自描述，agent 就近发现）
3. 门位原则（检查挂载时机与错误修复成本匹配：方向性错误开工引导、局部文本错误过程测试加收口兜底、累积性漂移三层都要）
4. UI 执行须知改写为四条原则版：定稿原型必须是可复跑真码产物、开工先就近发现本项目管线（多项目仓按触达路径就近）、手绘单文件仅限粗选、视觉降级须用户裁决留痕——零生态词零命令
5. brainstorm 阶段注入：方案对比步骤 prompt 增占位符，触达 UI 关键词时注入同一须知（fail-soft，指纹掩蔽防漂移）
6. 引导输出断言测试：跑全部引导构建函数断言输出不含生态命令词（pnpm、npm run、yarn、gradle、mvn、pip install 等形态）
7. 既有 ui-visual 测试同步断言新原则内容
8. 过程与收口双时机可触发（动态测试推断自动绑定）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:c0275ade62b1a1318229e73468355f6bfdded199ec997b8697c7082338df1dd5:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-guidance-principles 留痕重锚 -->
1. FR 落档两条并随归档入知识索引：工具引导产物语言生态中立（不绑定语言、框架、包管理器、构建工具
2. 生态命令由仓与项目自描述，agent 就近发现）
3. 门位原则（检查挂载时机与错误修复成本匹配：方向性错误开工引导、局部文本错误过程测试加收口兜底、累积性漂移三层都要）
4. UI 执行须知改写为四条原则版：定稿原型必须是可复跑真码产物、开工先就近发现本项目管线（多项目仓按触达路径就近）、手绘单文件仅限粗选、视觉降级须用户裁决留痕——零生态词零命令
5. brainstorm 阶段注入：方案对比步骤 prompt 增占位符，触达 UI 关键词时注入同一须知（fail-soft，指纹掩蔽防漂移）
6. 引导输出断言测试：跑全部引导构建函数断言输出不含生态命令词（pnpm、npm run、yarn、gradle、mvn、pip install 等形态）
7. 既有 ui-visual 测试同步断言新原则内容
8. 过程与收口双时机可触发（动态测试推断自动绑定）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
