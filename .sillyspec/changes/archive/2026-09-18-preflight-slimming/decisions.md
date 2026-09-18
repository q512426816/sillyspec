---
author: qinyi
created_at: 2026-09-18 20:40:03
---

# 决策记录

## D-001@v1 门禁前置：--done 面门的失败清单前移注入
- 类型：architecture
- 问题：9 次摩擦≈20-30 请求全是「提交→被打回→重读→重改」循环，怎么砍？
- 答案：产出型步骤的 prompt 注入本步 --done 将消费的 validator 当前失败清单（只读快跑+超时帽，异常静默不注）：agent 拿着清单一轮修完。防打架约束（评审）：①只注本步相关 validator ②条数帽 5+「完整见 sillyspec gate <stage> --json」③验收盯单步 prompt 中位长度不反弹。design-file-list 前移先例（e871a1e）的泛化

## D-002@v1 注入瘦身：阶段首步全量、后续摘要引用
- 类型：architecture
- 问题：模块上下文/scan 事实每步重注，上下文 249k 均值的主因之一
- 答案：每阶段首步全量注入；同阶段后续步骤只注摘要行（digest 前 8 位+可 Read 的路径引用），.runtime 落注入账本（change-stage 粒度幂等）。验收：单步 prompt 中位长度不反弹（基线 249k 均值→目标 ≤210k）

## D-003@v1 wait 继承盖章：--inherit-from D-xxx@vN 机械校验
- 问题：可从决策记录继承的确认轮仍要两次 CLI 调用（--wait 后再 --done --answer）

## D-004@v1 测选路：引导不改默认
- 问题：旧版 23 次全量 npm test 是 task 卡 verify 命令驱动的 agent 行为，要不要改 test_strategy 默认值？
- 答案：不改默认（module-zero-hit→skip 的静默无测试风险仍在，默认翻转是行为变更）——改引导：任务卡模板与 execute prompt 加「中间验证定向优先（node --test <本任务测试文件>），全量 npm test 留 task 收口与 verify」文案。时间大头收益靠引导拿，风险零

## D-005@v1 守恒红线进本变更验收
- 类型：architecture
- 问题：降本不暗降
- 答案：①L1 机械门拦截数不降（前置化=出口挪进口，总数守恒）②verify noAI 亲测 test+lint 照跑③单步 prompt 中位长度不反弹（D-002 帽）。三条全部进 verify-result 验收段

## D-003@v2 wait 继承盖章：--inherit-from D-xxx@vN 机械校验
- 答案：同命令完成 wait 记录+盖章轮（省一次 --done --answer 往返）；ID 不存在 exit 2 fail-closed 防伪造锚点；回放链照常回放盖章轮

## D-006@v1 前置 validator 映射表 v2 收录边界（execute 评审 gap 回写）
- 类型：architecture
- 问题：PREFLIGHT_VALIDATORS 本期只收两键，execute 任务步 allowed-paths-scan 与 plan 步 postcheck-lite 怎么办？
- 答案：留 v2 扩展位（映射表纯增量收录，机制/通路/超时帽/条数帽均已就位）；本期 execute 任务步声明留空数组=零前置清单（非静默——代码注释/commit/镜像/design 四处明示）；v2 归期=首个真实 execute 摩擦案例驱动（friction-ledger 可观测）
