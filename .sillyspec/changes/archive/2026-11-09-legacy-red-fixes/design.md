---
author: flow-machine-draft
created_at: 2026-11-09T07:30:00.000Z
---
# 设计记录（Design Record）— 2026-11-09-legacy-red-fixes

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三类归因三类修法，全部锚定「修被误伤面，不改测试迁就错误」（AGENTS 规则 5 例外说明：FR-05 的测试断言更新属「测试锚定对象本身有意演进」——锚的不是逻辑是文案，文案演进提交 a556e117 是应然，故改测试是正确方向）：

1. **知识 SKILL 误回退恢复（FR-01）**：`git checkout 2b1fd2fb^ -- .claude/skills/sillyspec-knowledge/SKILL.md` 原样恢复 2026-11-07 三知识变更累积版（accept 命令行/refresh 退役/propose --body-file/K 形态四段模板）。选恢复而非改测试：SKILL 文档是功能面（accept 命令是 6a68770c 根因修复的对外入口），回退是 2b1fd2fb 的误伤（项目地图变更与知识 SKILL 无关），测试断言正确地拦住了它。
2. **残渣治理（FR-02）**：backlog-batch-e ③ MCP gate 段首尾加 `process.chdir` 到隔离 tmp 目录并复原——gate 的 `_pathWithDir` mkdir-p 语义决定了「cwd 落哪 runtime 目录建哪」，源头修掉；spec-dir-home-guard Test 5 前对 `test/.sillyspec` 做前置 rmSync 防护（auto-pull-throttle 残渣的源头未必只有一处，防护保证该测试不再依赖仓内整洁态）。顺手删除现存残渣（不进 git 的运行产物）。
3. **文案/行号锚对齐（FR-03/04/05）**：doc-ref 行号按当前源码实测更新（890→895/839、1217/1068/1144→1254/1282/1353、942→947、spec-sync.js:56→120、936 核对）；prompt-golden 走官方 `SILLYSPEC_REGEN_PROMPT_GOLDEN=1` 再生成（diff 随提交可审）；thin-record 断言更新到 a556e117 演进后的现行句。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- **src/ 零改动**——全部修复面为文档（SKILL.md、platform-interface-map.md）、测试文件（backlog-batch-e、spec-dir-home-guard、thin-user-decision-record）与测试基线（prompt-golden.json）。无 API/行为变化。
- backlog-batch-e ③ 的 chdir 仅测试进程内生效（段尾复原，不影响其它测试文件的 cwd——node --test 各文件独立进程）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——静态文档/锚修复，无时序依赖；SKILL 恢复以 git 历史版本为准（2b1fd2fb^ 单一确定源）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   node --test 各测试文件独立进程并行跑时，chdir 是进程内全局态——backlog-batch-e 的 chdir 只影响本文件内后续代码（段尾复原），同进程内其它段不受影响（该文件各段串行执行）；不同测试文件进程各自独立 cwd 互不可见。前置清理 rmSync 与残渣产生方并跑时存在竞态（清了又被建）——防护是 best-effort，源头修复（chdir）才是根治，两者叠加后残渣无产生方。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——修复全部为一次性的文件内容替换，无运行时状态；chdir 若在段中途抛异常未复原，仅影响本测试文件后续段（进程退出即终结，不跨文件）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不串台——SKILL.md/文档/测试均为本仓文件；prompt-golden.json 是本仓测试基线；chdir 隔离目录用 mkdtemp 唯一路径。explore SKILL 的措辞删词（同 commit 2b1fd2fb）无测试锚佐证误伤，本变更不动、记录在案留观察。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：SKILL 恢复若与 2b1fd2fb 之后其它变更对该文件的（如果有）有意修改冲突——git log 核实 2b1fd2fb 是该文件最后一笔提交，无此冲突面。
- 次风险：auto-pull-throttle 残渣源头未精确定位（仅确认 backlog-batch-e 的 gate 残渣源）——前置清理防护兜底，若全量绿后再复发即暴露真源头（防护每次跑前清，污染不再影响被测断言）。
- 试过但放弃：改三个 knowledge 测试断言迁就回退后的 SKILL——违反「修被误伤面不改测试迁就错误」，且 accept 命令是真实功能（CLI 代码在），文档必须跟上代码；改 spec-dir-home-guard Test 5 让它容忍 test/.sillyspec——该测试的本义就是「test/ 下无 .sillyspec 时向上命中仓根」，容忍等于废掉测试。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 恢复 | .claude/skills/sillyspec-knowledge/SKILL.md | git checkout 2b1fd2fb^ 版本（知识三变更累积版） |
| 修改 | test/backlog-batch-e.test.mjs | ③ MCP gate 段 chdir 隔离 tmp 并复原 |
| 修改 | test/spec-dir-home-guard.test.mjs | Test 5 前对 test/.sillyspec 前置清理防护 |
| 修改 | test/thin-user-decision-record.test.mjs | 断点②断言更新为现行句「等用户选择再跑收口」 |
| 修改 | docs/sillyspec/platform-interface-map.md | §7 行号锚更新（895/839/1254/1282/1353/947/120 等） |
| 再生 | test/prompt-golden.json | SILLYSPEC_REGEN_PROMPT_GOLDEN=1 官方通道再生 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | 追加修复条目 |
