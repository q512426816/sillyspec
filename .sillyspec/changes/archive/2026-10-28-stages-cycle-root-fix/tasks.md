---
author: flow-machine-draft
created_at: 2026-10-28T05:24:13.775Z
---
# 任务注册表（Tasks）— 2026-10-28-stages-cycle-root-fix

- [x] task-01: run/shared.js 断边（删 line 112 静态 import，getStageSteps 点用 await import 取 stageRegistry），node test/r5-wiring-three.test.mjs 直跑从 TDZ 变全绿——当场验证
- [x] task-02: test/stages-cycle-regression.test.mjs 落地：TDZ 入口形态完整进程直跑（import run/complete.js 再 import stages/index.js）+ run/shared 静态 import 面断言 + 动态 import 存在断言——跑绿
- [x] task-03: 撤 local.yaml known_failures 豁免（CLI known-failures remove）+ 断言清单不含该键；受影响面 r5-wiring-three 复跑绿（豁免撤后无掩蔽）
- [x] task-04: 注册表消费回归：getStageSteps quick 档三步表 / standard 注册表长度两档断言 + 受影响面（task-tick、flow 相关）跑绿
