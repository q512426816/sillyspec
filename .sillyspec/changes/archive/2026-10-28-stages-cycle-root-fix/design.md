---
author: flow-machine-draft
created_at: 2026-10-28T05:24:13.775Z
---
# 设计记录（Design Record）— 2026-10-28-stages-cycle-root-fix

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

ESM 循环引用根修：环为 `stages/execute.js → knowledge-hits.js → agent-session-log.js → run/shared.js → stages/index.js`（诊断脚本实证）。当入口先经 execute.js 子树进入（测试直 import run/complete.js），stages/index.js 首次求值 stageRegistry 字面量时 `execute` 绑定仍在 TDZ——正是 execute.js:19-21 注释记载并预防过的坑形态（叶子约束被 2026-10-28 前后新增的知识遥测依赖边破坏）。

修法选最小断边：`run/shared.js:112` 的 `stageRegistry` 静态 import 仅在 getStageSteps 一处函数内使用（run/shared.js:2508），该函数已是 async 且同函数内已有 `await import('./scan-profile.js')`、`await import('../worktree.js')` 惰性先例——把该静态 import 改为点用 `await import('../stages/index.js')`，断掉回边，run/shared 对外 API 零变化。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/run/shared.js`：删除 line 112 静态 `import { stageRegistry } from '../stages/index.js'`；getStageSteps（唯一使用点）改为函数内 `const { stageRegistry } = await import('../stages/index.js')`。**函数签名与返回值零变化**，导出面零变化。
- `.sillyspec/local.yaml`：known_failures 撤销 r5-wiring-three 锚定豁免及注释（机器本位配置，不入库）。
- 无 CLI/文件格式/公共 API 变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立——修复只动模块求值图（静态→动态），不动任何运行时数据流；动态 import 的求值时机后移到首次调用点，任何调用顺序下 stageRegistry 都在完整初始化后才被访问。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   无共享写面——ESM 模块记录由 Node 加载器单次求值，动态 import 首次触发后走缓存；与静态 import 相比并发语义不变。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全——中断语义与静态 import 相同（要么完整求值要么抛错，无半初始化导出）；首次动态 import 失败即该次调用失败，与现状同形。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会——模块实例作用域与 import 形态无关；worktree 各自的 node 进程各自求值各自的模块图。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险是环不只这一条（同一子树可能还有其他模块静态引 stages/index.js 系），断此边后换入口形态仍撞——对策：诊断脚本全子树扫描确认 run/shared.js 是唯一回边（常量/进度等直引者不在 execute.js 子树内），并加 FR-02 静态断言锁死该文件的 import 面防复潮。次级风险：动态 import 首调有微小延迟（<1ms，模块已缓存路径无感）——getStageSteps 非热路径，可忽略。

放弃的方案：① 改 stages/index.js 把 stageRegistry 惰性化（getter/工厂）——所有消费方 API 面翻动，风险远大于收益；② 断 execute.js → knowledge-hits 边——那是知识遥测的正当依赖方向，反向把 appendKnowledgeHit 惰性化属错位修补（环的成因在 run/shared 这个共享库背了重依赖，不在知识链）；③ 把 stageRegistry 挪到轻叶子模块——注册表定义与阶段定义文件强耦合，搬家动 10+ 文件。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/run/shared.js | stageRegistry 静态 import → getStageSteps 点用动态 import（断回边） |
| 修改 | .sillyspec/local.yaml | 撤销 r5-wiring-three known_failures 机器豁免（gitignored 机器面） |
| 新增 | test/stages-cycle-regression.test.mjs | TDZ 入口直跑 + import 面断言 + 豁免撤销断言 + 注册表消费回归 |
