---
author: flow-machine-draft
created_at: 2026-09-26T01:48:39.387Z
---
# 任务注册表（Tasks）— 2026-09-26-residual-runner-parity

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。

- [x] task-01: buildDepsBatches js 卷分拣：.tsx/.jsx（JSX 原生不可跑）与 .ts/.js（原生可跑，既有行为）分离
- [x] task-02: JSX 卷从命中命令串推断 vitest
- [x] task-03: jest（与 py 侧 pytest 推断同法）——有则 deps(auto-jsx) 批（vitest 补 run 子命令）…
- [x] task-04: 两个消费点（runTraceResidualInner 残差段
- [x] task-05: 主选测 module 子集）skip 批不跑不拦：warn+skipped 段留痕（漏测可见非静默）
- [x] task-06: .ts 走 node --test 既有行为零变化（deps-cwd-prefix ④钉复验）
- [x] task-07: 测试：vitest 推断批/无运行器 skip 批/jest 形态/混合卷三批分拣 + deps-cwd-prefix 与 verify 相关套件零回归
