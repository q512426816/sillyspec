---
author: flow-machine-draft
created_at: 2026-10-15T10:34:31.850Z
---
# 设计记录（Design Record）— 2026-10-15-lint-triage-path-unify

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新建 src/run/lint-ownership.js 把 gates.js 里已有的「lint 归属鉴定降档」内联块（判定 + 三行降档文案）抽成共享 helper lintOwnershipDowngrade，gates.js 的 --done 拦截面换调用（行为与文案等价）；verify-quality-scan.js（verify step6「noAI 质量扫描」）在 throw 前接同一 helper——仅当 lint 单独失败（testFailed=false）时做降档判定，throw 条件从 lintBlocked 收紧为 lintBlocked && !lintAdvisoryDowngraded。选共享模块而非复制粘贴：原缺陷本质就是同一语义两处实现不同步（分叉），单一来源 + 源级接线测试断言防复发。importer 参数可注入依赖（triageLintOwnership / resolveVerifyChangedFiles），测试免 git/文件系统面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增导出 src/run/lint-ownership.js#lintOwnershipDowngrade({lintCheck, cwd, changeName, specBase, importer}) → Promise<boolean>（true=降档放行）。gates.js：删内联判定块换 helper 调用（外部行为不变）。verify-quality-scan.js：noAI 质量扫描对「lint 单独失败且零交集存量债」从恒 throw 变为降档放行（打印 warning 不阻断 step6）——这是对外可见的行为变化，对齐 --done 路径既有语义。CLI 端点/命令/文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——helper 是单次调用纯判定（读 lintCheck 快照 + git 文件面），无事件流；lintCheck.failureFiles 由调用方在 lint 实测完成后一次性产出。
2. 并发写：低风险——判定只读（resolveVerifyChangedFiles 读 git/文件系统），无写面；并行会话共享工作区时降档判定面与既有 gates 路径完全同源，不引入新并发面。
3. 切换/生命周期：判定在 throw 决策前同步完成，无跨步状态；中途异常被 catch 吞掉转 false（保守硬拦），不会留下半态。
4. 作用域：cwd/changeName/specBase 全部由调用方传入（两路径各自已有），无全局态；跨仓场景 lint 门本就跑主仓 local.yaml 命令，helper 不改变作用域。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：降档被滥用掩盖真失败——unattributable（输出无可识别路径）与鉴定链异常都保守返回 false 硬拦，且降档仅在「lint 单独失败」时生效（testFailed 优先 throw），配合降档 warning 三行提示（含存量债文件清单与清偿建议），滥用面可控。试过放弃：①只在 quality-scan 复制一份 triage 代码——制造第二实现即复发原缺陷（两路径分叉），放弃；②把降档判定塞进 verify-postcheck.js——该文件正被并行会话在途迭代（active WIP），编辑即 interleaved 提交风险，放独立新模块避开。
