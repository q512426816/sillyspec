---
author: flow-machine-draft
created_at: 2026-09-26T01:48:39.387Z
---
# 需求规格（Requirements）— 2026-09-26-residual-runner-parity

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: JSX 卷运行器推断
Given .tsx/.jsx 用 node --test 直跑恒败（node 原生不支持 JSX）
When js 卷分拣出 JSX 文件并从命中命令串推断 vitest/jest（与 py 侧 pytest 推断同法）
When 有运行器则 deps(auto-jsx) 批（vitest 补 run 子命令、jest 直拼）

### FR-02: 无运行器整批 skip
Given 命中命令串提不出 vitest/jest
When deps(auto-jsx-skip)（command null）
When 两消费点不跑不拦、warn+skipped 留痕（漏测可见非静默，转项目运行器执行）

### FR-03: 原生批零变化
Given .ts/.js node 原生可跑（既有行为）
When 分拣后照旧 node --test
Then deps-cwd-prefix ④钉复验通过



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/residual-runner-parity.test.mjs 用例①③（vitest 补 run/jest 直拼）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/residual-runner-parity.test.mjs 用例②（skip 批形态：command null+skip true+转办 reason）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/residual-runner-parity.test.mjs 用例④（混合三批分拣+.ts 原生）+ test/deps-cwd-prefix.test.mjs 零回归

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
