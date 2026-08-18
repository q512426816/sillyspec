
## ql-20260818-007-1c7a | 2026-08-18 09:07:03 | quick 需求字段写法与标题截断规则前置透明
状态：已完成
关联变更：（无）
文件：
- src/stages/quick.js（step3 模板行+截断规则警示段+核对段对齐、step1 ℹ️ 预告）
- docs/prompt/_extracted.json（重跑 _extract.mjs 刷新）
- docs/prompt/quick.md（step1/step3 fence 按提取稿逐字替换）
- .claude/skills/sillyspec-quick/SKILL.md（四字段模板补短标题规则、核对顺序两处同步）
需求：quick 需求字段写法与标题截断规则前置透明
根因：step3 模板把「需求：」指引为「用户/任务要什么」邀请写完整需求长句，而 extractTitleFromResult（quicklog.js）提取标题时截到首个标点（，。；,;）+ 超 80 字截断——按模板写必然截成语义不完整的状语前半段，触发事后手动精修（规则 16 补救）；「标题从需求：提取」虽在 step1 ℹ️ 和事后核对段出现，但都没说「所以需求：要写短」。
方案：quick.js 三处前置透明——step3 模板行改「一句话语义化短标题（写「改了什么」）」+ 模板块下方警示段写明截断规则（截到首个标点、80 字上限、长句截状语示例、背景放根因/方案）+ step3 核对段对齐「写短句则无需手改」+ step1 ℹ️ 预告；同步 _extracted.json / docs/prompt/quick.md 镜像（脚本带新旧字符串 sanity 断言）/ sillyspec-quick SKILL 两处。说明文字全放标签行外规避嵌套冒号坑。
结果：npm test 220/0 EXIT=0、lint 310 文件通过、docs check 417/417 全绿；file-lifecycle 不涉及（纯 prompt 文案无步骤/文件类型/流转变更）。
