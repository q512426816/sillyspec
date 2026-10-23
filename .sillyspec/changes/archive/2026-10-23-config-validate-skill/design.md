---
author: flow-machine-draft
created_at: 2026-10-23T01:30:19.883Z
---
# 设计记录（Design Record）— 2026-10-23-config-validate-skill

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新模块 src/config-validate.js：纯函数 validateLocalYamlContent(text) 消费 LOCAL_YAML_SCHEMA 单一源（校验只消费不生产）——YAML 解析（js-yaml）→ 顶层键归类（段 id ∪ 根级已知键，其余=未知警告）→ 在场键逐键类型/枚举校验（string/number/boolean/enum.values）→ 段内必填闭合（required:true 键所在段在场则须齐全，mcp/platform 凭据段）→ deprecated 键 info。cmdConfigValidate 包装：resolveLocalYaml（config-cat 权威路径链，worktree 感知）读文件渲染人类/--json 双态，exit 0/1；缺文件=info 零配置可用 exit 0（契约：69 键仅 4 凭据键真必填且仅平台用户，缺文件即全缺省形态）。技能 .claude/skills/sillyspec-config/SKILL.md 落在 init 既有分发源（.claude/skills/sillyspec-*）零接线成本；末步硬门写死「validate exit 0 才算完成」。选 schema 单一源消费而非自维护校验清单：69 键漂移零成本跟随（readers/desc/example 同源供技能引用）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新 CLI 子命令 `sillyspec config validate [--json]`（退出码 0=通过/1=有错误；--json 单对象 {file, exists, errors[], warnings[], infos[], keysChecked}）。src/config-validate.js 导出 validateLocalYamlContent（纯函数可测）与 cmdConfigValidate。config help 增 validate 行。新技能 .claude/skills/sillyspec-config/（init 复制面自动携带）。LOCAL_YAML_SCHEMA 与既有 config 子命令零改动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：校验读调用时点文件快照，无状态；配置写与校验间竞态最坏=校验到旧态多报一轮，重跑即收敛。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

只读校验零写盘，与并行会话写配置零冲突；路径解析走 config-cat 既有候选链（worktree 副本/主仓锚定语义不变）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：无状态副作用（不落任何标记）；exit 1 不留半态，修后重跑即过。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：resolveLocalYaml 候选链 worktree 感知（副本无文件向上命中主仓）；校验的是解析到的真实文件本位；技能按仓引导各写各的。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：schema 是文档级注册（readers 字符串指向读码点），键定义与真实 reader 行为可能漂移——校验过≠运行时一定读对。对策：①校验声明口径=「schema 注册面」（人类/--json 输出明示）；②段内必填只对 required:true 硬键生效（凭据族，reader 行为简单）；③doctor 的运行时维度（编码完整性等）互补不重叠。放弃方案：①把校验做进每个 reader（69 处散改，爆炸面大，弃）；②自动修复坏键（--fix）——写用户配置文件需谨慎，v1 只报不修，弃；③缺文件报错——违反零配置契约（缺省即全默认形态），弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 增 | src/config-validate.js | validateLocalYamlContent 纯函数＋cmdConfigValidate（路径链解析/渲染/退出码） |
| 改 | src/index.js | config 分发增 validate 子命令＋help 文案行 |
| 改 | src/config-schema.js | 执行期扩展（dogfood 实证欠账）：补登 7 键（本会话 5 键＋repos 跨仓注册表段＋fr_unmapped_baseline）；example 模板补 token（防漂耦合测试同源） |
| 增 | .claude/skills/sillyspec-config/SKILL.md | 引导技能（零配置契约/决策表/探测流程/末步硬门） |
| 增 | test/config-validate.test.mjs | unit 八态＋CLI e2e＋技能锚＋help/注册锚 |
