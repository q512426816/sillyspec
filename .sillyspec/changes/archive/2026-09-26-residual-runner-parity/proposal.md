---
author: flow-machine-draft
created_at: 2026-09-26T01:48:39.386Z
---
# 提案书（Proposal）— 2026-09-26-residual-runner-parity

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:aade63a151a39d97873355c99f59b2b1f092f74ab1ac3fe3ce1dff586d1a1e14:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-residual-runner-parity 留痕重锚 -->
任务原话转写：动机：R18-SF-full 实证 verify 残差段/依赖批对 .tsx/.jsx 测试文件用 node --test 直跑恒败（node 原生 type stripping 不支持 JSX——agent 烧 ~11 次尝试 99 分钟，最终被迫 verify 内改码把组件测试双宿主化绕过）。根因：buildDepsBatches 的 py 卷有运行器推断（hits 提取 pytest），js 卷一律 node --test 无分拣。
成功标准：
- buildDepsBatches js 卷分拣：.tsx/.jsx（JSX 原生不可跑）与 .ts/.js（原生可跑，既有行为）分离；JSX 卷从命中命令串推断 vitest/jest（与 py 侧 pytest 推断同法）——有则 deps(auto-jsx) 批（vitest 补 run 子命令），无则 deps(auto-jsx-skip) 整批 skip（command null，不制造恒败段）
- 两个消费点（runTraceResidualInner 残差段/主选测 module 子集）skip 批不跑不拦：warn+skipped 段留痕（漏测可见非静默）
- .ts 走 node --test 既有行为零变化（deps-cwd-prefix ④钉复验）
- 测试：vitest 推断批/无运行器 skip 批/jest 形态/混合卷三批分拣 + deps-cwd-prefix 与 verify 相关套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:9286bca68d67e8d4e92c1b829fd4a6ad6c237f0d70e8682b71f7bcd62f21b82c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-residual-runner-parity 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. buildDepsBatches js 卷分拣：.tsx/.jsx（JSX 原生不可跑）与 .ts/.js（原生可跑，既有行为）分离
2. JSX 卷从命中命令串推断 vitest
3. jest（与 py 侧 pytest 推断同法）——有则 deps(auto-jsx) 批（vitest 补 run 子命令），无则 deps(auto-jsx-skip) 整批 skip（command null，不制造恒败段）
4. 两个消费点（runTraceResidualInner 残差段
5. 主选测 module 子集）skip 批不跑不拦：warn+skipped 段留痕（漏测可见非静默）
6. .ts 走 node --test 既有行为零变化（deps-cwd-prefix ④钉复验）
7. 测试：vitest 推断批/无运行器 skip 批/jest 形态/混合卷三批分拣 + deps-cwd-prefix 与 verify 相关套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:8a6d610a541292136128370efe8fa8c02b15d8cf5a08b29e9f465cd71c19832f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-residual-runner-parity 留痕重锚 -->
1. buildDepsBatches js 卷分拣：.tsx/.jsx（JSX 原生不可跑）与 .ts/.js（原生可跑，既有行为）分离
2. JSX 卷从命中命令串推断 vitest
3. jest（与 py 侧 pytest 推断同法）——有则 deps(auto-jsx) 批（vitest 补 run 子命令），无则 deps(auto-jsx-skip) 整批 skip（command null，不制造恒败段）
4. 两个消费点（runTraceResidualInner 残差段
5. 主选测 module 子集）skip 批不跑不拦：warn+skipped 段留痕（漏测可见非静默）
6. .ts 走 node --test 既有行为零变化（deps-cwd-prefix ④钉复验）
7. 测试：vitest 推断批/无运行器 skip 批/jest 形态/混合卷三批分拣 + deps-cwd-prefix 与 verify 相关套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
