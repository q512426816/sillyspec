---
author: flow-machine-draft
created_at: 2026-09-26T01:48:39.387Z
---
# 设计记录（Design Record）— 2026-09-26-residual-runner-parity

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-residual-runner-parity 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
buildDepsBatches 的 js 卷分拣（对齐 py 卷 pytest 推断先例）：.tsx/.jsx（node 原生 type stripping 不支持 JSX——R18-SF-full 残差段 node --test 直跑恒败 ~11 次尝试的坑）从命中命令串推断 vitest/jest——有则 deps(auto-jsx) 批（vitest 补 run 子命令），无则 deps(auto-jsx-skip) 整批 skip 转项目运行器（不制造恒败段）；.ts/.js 照旧 node --test（原生可跑，deps-cwd-prefix ④既有钉零变化）。两个消费点（残差段 runTraceResidualInner/主选测 module 子集）skip 批不跑不拦：warn+skipped 段留痕（漏测可见非静默）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-residual-runner-parity 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
verify-postcheck.js buildDepsBatches：jsRun 分拣 jsProject/jsNative + jsxRunner 推断（正则对齐 py 侧两形态）+ 三批 push（skip 批 command:null skip:files reason）；runTraceResidualInner 与主选测循环加 b.skip 分支（skipped 段/模块留痕）。批次 short 新增 jsx/jsx-skip 两值。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-residual-runner-parity 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：分拣是纯函数（deps+hits 时点快照）。2. 并发：无共享态。3. 切换：skip 批幂等（重跑同样 skip 同样留痕）。4. 作用域：py/js 原生批零变化（既有测试钉）；skip 批的漏测风险由 reason 点名+披露面承担（不静默——与「环境缺件跳过聚合」同款可见性语义）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-residual-runner-parity 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=jsxRunner 提取的命令串形态不匹配项目实际（cd 链/嵌套 pnpm exec）——提取不到走 skip 批（安全侧：转办不假跑），提取到但命令错会 failed 由 known_failures/归属鉴定兜（与 py 侧推断同风险面同兜法）。死路：CLI 主动探测项目 vitest 配置（读 vite.config/tsconfig 判项目类型）——探测面无界且易过时，命令串推断+skip 转办是诚实分界，弃；死路：JSX 批也 node --test 顶着 known_failures——制造恒败段正是要修的病，弃。
