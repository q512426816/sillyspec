---
author: flow-machine-draft
created_at: 2026-10-15T08:30:00.000Z
---
# 设计记录（Design Record）— 2026-10-15-ui-proto-form-config

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用户四点裁决落地为每仓原型形态契约。机制复用既有接线：brainstorm「提出 2-3 种方案」步已有 {UI_VISUAL_GUIDANCE} 占位符、prompt.js 在 UI 触达（changeName+proposal+requirements 语料）时替换为 buildUiGuidanceLines 产物、flow start 须知同源——把 buildUiGuidanceLines 从纯静态升级为 local.yaml 感知即同时打通两注入口。新增 readUiPrototypeForm（js-yaml 解析 ui_prototype 段，五态语义）+ resolveUiPrototypeFor（repos 注册路径前缀匹配，子仓 override 优先仓级兜底）。brainstorm 生成要求做四句修正堵实测漏洞（knowledge-search 把抄值当引入、51 先例当管线；server-logs-panel 连形态声明都没有——来源声明必填堵后者）。设计原则：工具只做指导注入+声明在场检查，不做质量强制（CLI 测不了「是不是真码」，诚实边界写入注释）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- ui-visual.js 新增导出：`readUiPrototypeForm(specBase)`、`resolveUiPrototypeFor(specBase, paths)`；`extractQuotedPaths` 转导出（prompt.js 组路径用）。
- `buildUiGuidanceLines(specBase=null, paths=[])` 签名扩展：无参/无 specBase 行为与现状逐字一致（既有三调用点与两测试文件兼容）；guidance-output-neutrality 生态命令词禁入约束对新行同样生效。
- local.yaml 新增消费段 `ui_prototype`（form/ruling/repos 子仓 override）——读侧 fail-soft，坏 YAML/坏值零抛出。
- brainstorm.js 生成要求文本四句修正（静态模板，docs/prompt 同步）；design-facts 清单项与 gates 软提醒文案追加登记指引。
- 无 CLI 命令/flag 变化；ui_visual_gate 语义不动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：须知每次渲染即时读 local.yaml（不缓存），登记后下一轮 CLI 调用即生效；无时序假设。
2. 并发写：local.yaml 是用户所有物，本变更只读；agent 建议登记但不代写（豁免须用户裁决留痕——写入权留给用户或经用户同意的 agent，ruling.by 字段承载）。
3. 切换/生命周期：登记持久在 local.yaml，跨会话/跨变更稳定；未登记态每次 UI 变更强提醒直至登记。
4. 作用域：specBase 解析沿用 readUiVisualGate 同根（平台模式 specRoot/本地 .sillyspec）；repos 匹配用 local.yaml repos 注册路径（key→path），跨仓路径形态（Windows 反斜杠/正斜杠）归一后前缀匹配。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险1：local.yaml 手写 YAML 嵌套缩进错 → 解析失败被当未登记。对策：js-yaml fail-soft + 缺席与解析失败同态（registered:false）+ 强提醒文案会持续出现倒逼修复；不做 YAML 校验器（越界）。
- 风险2：repos override 匹配不到（触达路径未落 local.yaml repos 注册）→ 静默退仓级。对策：可接受降级（仓级兜底即用户登记的默认态），guidance 不额外告警（噪音大于收益）。
- 风险3：新行破坏字节级既有断言。对策：无参路径逐字不变已由 guidance-output-neutrality/ui-visual-guidance 既有测试锁定；新四态行禁生态命令词。
- 死路：考虑过把 form 校验做硬门（登记非法即拒收口）——放弃：local.yaml 是用户配置面不是变更产物，硬门会把配置笔误升级成流程阻断；警告+强提醒足够。
