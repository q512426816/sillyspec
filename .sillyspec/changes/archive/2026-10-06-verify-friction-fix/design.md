---
author: flow-machine-draft
created_at: 2026-10-06T13:38:06.171Z
---
# 设计记录（Design Record）— 2026-10-06-verify-friction-fix

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四件误工/丢失缺陷各自对症，全部走「同源规则复用 + fail-soft 兜底」路线，不引入新依赖：① `--force` 数据丢失——`backupVerifyResult`（verify-probes.js）在覆盖前把现文 copyFileSync 到 `<runtimeRoot>/verify-runs/verify-result-backup-<ms 时间戳>.md`（毫秒精度防同秒互吞），CLI 打印备份路径；新增 `--refresh-probes` 定向刷新通道：`refreshProbeSections` 纯函数只替换「仍含 `<待填`/`<!--TODO` 占位」的探针机械段，段内已填表格行按首列键携载到新渲染（半填矩阵不丢已填格），已手填段原样保留并逐段报告——安全方向取「宁可少刷新不误删」，与 `--force` 互斥。② gate-last 只写不读——machine-interface.js 新增 `summarizeVerifyGatePointer` 读指针 + 按 basename 在当前根重推导 run 目录（指针内绝对路径跨机器不可信），带上 reconcile/probe-consistency 明细；CLI `gate last` 子命令打印，exit code 反映 blocked。③ YAML 门禁 6 轮试错——taskcard-frontmatter.js 新增 `diagnoseTaskYamlError`（js-yaml v4 实证：`title: A: B` 报 bad indentation 而非 mapping values，故用「消息家族 + 出错行内容」双信号分诊而非纯文本匹配），plan-postcheck 0b 门报错内联「分诊：」动作；plan-postcheck 新增 `validateTaskcardsCli` 出口（补 target_files 严格形态检查），CLI `taskcard <change> --validate` 零成本自检、失败 exit 1，plan.js 填卡指引第 8 步接线。④ 接口零端点声明不被识别——`API_FACE_DECLARED_ZERO_RE` 宽收同义式（数字声明优先、`(?<!\d)0` 防「10 端点」尾 0 误命中），声明匹配面剥 HTML 注释（骨架指引句式留在注释内不自动生效），design 骨架接口段 TODO 附可粘贴句式。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

CLI 新增/变更四个用法：`sillyspec verify-probes --change <名> --init --force`（行为变更：覆盖前自动备份并打印路径）、`sillyspec verify-probes --change <名> --refresh-probes`（新增 flag，与 --force 互斥，无骨架时 exit 2）、`sillyspec gate last --change <名>`（新增子命令，无记录/未阻断 exit 0、blocked exit 1、指针损坏打印修复指引）、`sillyspec taskcard <change> --validate`（新增 flag，失败 exit 1，与 --all/--task 互斥）。新导出函数：verify-probes.js `backupVerifyResult({mdPath, runtimeRoot, label?})`/`refreshProbeSections(existingText, freshReportText)`（返回 {text, replaced, kept, appended, carriedRows}）、machine-interface.js `summarizeVerifyGatePointer({specBase, changeName})`、taskcard-frontmatter.js `diagnoseTaskYamlError(message, errorLineText?)`、plan-postcheck.js `validateTaskcardsCli({changeDir, projectRoot?})`。行为变更两点：plan postcheck YAML 硬门报错文案从泛化一句改为含「分诊：」针对性动作（仍同 errors 通道，不新增状态）；parseDesignApiTable 声明匹配剥 HTML 注释且同义零端点声明认 declared=0（此前恒 null——收紧与放宽同在：注释内数字声明不再认，属 fail-closed 方向）。数据格式：verify-runs 目录新增 verify-result-backup-*.md 工件；runtime list KNOWN 登记新条目。无端点、无 schema、无配置键变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不涉及事件流。探针渲染是每次全量重算（runVerifyProbes 无状态），refresh 拿「现文 + 最新渲染」做纯函数合并——迟到到达的旧渲染只会少刷新（kept 方向），不会误删；备份是先于写发生的单线程 copyFileSync，顺序由 CLI 调用序保证。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

verify-result.md 的既有并发语义不变（单 agent 工作物，gate 侧 checkProbeConsistency 管篡改）。新增面：备份文件名含毫秒时间戳，同秒两次 --force 各自成档不互吞；两进程同时 --force 仍是后写胜（与现状同），但两份备份都在，数据不丢。gate last / taskcard --validate / diagnose 均纯只读。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

所有新写入（备份、refresh 后的 verify-result.md）都是整文件单次 writeFileSync/copyFileSync，无中间态；refresh 前置备份意味着中断在写正文前后任一点，旧内容都可从备份找回。gate last 读指针失败三态（found:false / unreadable / 正常）各自有出路文案，不产生半态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

备份与指针都落 change 级路径（verify-runs/ 下按文件名区分 change 与用途），无跨 change 共享态；summarizeVerifyGatePointer 对指针内绝对路径做 basename 重推导，跨机器/迁移根不串台。--validate 的 specBase 解析走 resolvePlatformSpecDir（平台指针 fail-closed 语义同源 taskcard 主路径）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：refresh 的「已手填」判定依赖占位标记启发（`<待填`/`<!--TODO` 缺席 = 已填）——探针 1/3/5/6 这类直接渲染结论行、永无占位的段永远判 kept，预填过期要靠 --force（有备份兜底）；反向误判（agent 在段内追加叙述但占位仍在）会连带被替换，靠前置备份 + 逐段报告暴露，属可接受残余。试过但放弃：① 按「新旧渲染逐字节 diff」判定未触碰——需保存历史渲染指纹，gate 抽查机制已占用该信号位，复杂度不成比例；② refresh 时整段保留已填行、只重排未填行——行级携载已覆盖 38 格矩阵主场景，全行保真方案把 stale 行永远带下去；③ 给 gate last 加 --full 重跑——那正是要消灭的超时路径，读盘 3ms 解决。第二个风险：声明宽收的「不涉及接口」可能在个别 design 的无关散文中出现而误判 declared=0——影响面是 API 矩阵渲染少一行（advisory 层），且数字声明优先，已在测试钉住优先序。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | backupVerifyResult/refreshProbeSections 新增；声明宽收 + 注释剥离 |
| 修改 | src/index.js | verify-probes 备份/refresh 接线；gate last 子命令；taskcard --validate；KNOWN 登记 |
| 修改 | src/machine-interface.js | summarizeVerifyGatePointer 新增 |
| 修改 | src/taskcard-frontmatter.js | diagnoseTaskYamlError 新增 |
| 修改 | src/stages/plan-postcheck.js | 0b 报错分诊接线；validateTaskcardsCli 新增 |
| 修改 | src/stages/plan.js | 填卡指引第 8 步 --validate 自检 |
| 修改 | src/design-facts.js | 接口段 TODO 附可粘贴声明句式 |
| 修改 | templates/prompts/taskcard-rules.md | 填完即自检条目 |
| 修改 | docs/sillyspec/platform-interface-map.md | 行号漂移 7 处同步（本变更插入所致） |
| 修改 | package.json | 三个新测试收录 test:core |
| 新增 | NEW:test/verify-probes-refresh-backup.test.mjs | 备份/refresh/声明宽收/骨架句式回归 |
| 新增 | NEW:test/taskcard-yaml-triage-validate.test.mjs | 分诊 + validateTaskcardsCli 回归 |
| 新增 | NEW:test/gate-last-reader.test.mjs | gate last 读取三态回归 |
