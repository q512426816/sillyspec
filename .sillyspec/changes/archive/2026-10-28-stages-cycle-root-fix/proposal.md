---
author: flow-machine-draft
created_at: 2026-10-28T05:24:13.775Z
---
# 提案书（Proposal）— 2026-10-28-stages-cycle-root-fix

## 动机

任务原话转写：断 stages 循环引用：run/shared 惰性取注册表

收口归属判别实证（2026-10-28-shadow-checkpoint D-001）：r5-wiring-three 在基线 b195fe1f 即抛 stages/index.js TDZ（Cannot access 'execute' before initialization）。诊断为 ESM 循环引用：stages/execute.js → knowledge-hits.js → agent-session-log.js → run/shared.js → stages/index.js——当入口先经 execute.js 子树进入（测试直 import run/complete.js 形态，execute.js:19-21 注释记载的已知坑形态），stages/index.js 首次求值 stageRegistry 时 execute 绑定仍在 TDZ。根修：run/shared.js 的 stageRegistry 静态 import（仅一处函数内使用，该函数已是 async 且同函数已有 await import 先例）改点用惰性动态 import，断回边；静态断言 run/shared.js 不再静态引 stages/index.js。

成功标准：
- test/r5-wiring-three.test.mjs 单独直跑不再抛 TDZ，原用例全绿
- run/shared.js 静态 import 面不再含 stages/index.js（测试断言锁死，防回边复潮）
- local.yaml 的 r5-wiring-three known_failures 机器豁免撤销（该测试回归默认验证面）
- CLI 既有入口零回归（受影响面测试绿）
- 零新依赖

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. test/r5-wiring-three.test.mjs 单独直跑不再抛 TDZ，原用例全绿
2. run/shared.js 静态 import 面不再含 stages/index.js（测试断言锁死，防回边复潮）
3. local.yaml 的 r5-wiring-three known_failures 机器豁免撤销（该测试回归默认验证面）
4. CLI 既有入口零回归（受影响面测试绿）
5. 零新依赖

## 成功标准（可验证）

1. test/r5-wiring-three.test.mjs 单独直跑不再抛 TDZ，原用例全绿
2. run/shared.js 静态 import 面不再含 stages/index.js（测试断言锁死，防回边复潮）
3. local.yaml 的 r5-wiring-three known_failures 机器豁免撤销（该测试回归默认验证面）
4. CLI 既有入口零回归（受影响面测试绿）
5. 零新依赖
