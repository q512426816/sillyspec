---
author: flow-machine-draft
created_at: 2026-10-10T07:28:13.220Z
---
# 设计记录（Design Record）— 2026-10-10-dyn-subset-nontest-runner-face

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

故障链（平台侧 2026-10-10-repo-native-no-platform-markers 实证，已重放定位）：探针 7 的 `isProbe7TestPath` 用 `/spec/i.test(name)` 裸子串判定——任务卡 allowed_paths 里的源码 `spec-sync.ts` 被误判为测试路径，随 trace 行落盘、归档提升进 knowledge/fr 机器绑定子块；后续变更触碰该文件时 FR 关联回归把绑定文件并入实测面；`buildDepsBatches` 对非测试形态文件无兜底，分进 jsNative 批 `node --test` 直跑 → ERR_MODULE_NOT_FOUND 假败阻断收口。

修两处、口径单源：① 生产侧收紧——isProbe7TestPath 改锚定口径（`.test./.spec.` 后缀 + `tests?/` 目录前缀 + `test_*.py`/`*_test.py`），与 verify-postcheck 执行侧权威 `isTestFilePath` 对齐，杜绝脏绑定继续产生；② 执行侧兜底——buildDepsBatches 组卷时把非测试形态文件从 node --test / pytest 执行批拆出，单独 skip 批点名披露（复用 run-tests.mjs / jsx-skip 先例：skip 不跑不拦、reason 点名可见），存量脏绑定与新数据面误差都被拦在执行批外。选择修生产+执行两侧而非只修一处：只修生产侧则存量脏绑定（平台仓 knowledge/fr/spec-sync.md 已有 2 行）继续假败；只修执行侧则脏数据继续累积污染绑定面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/verify-probes.js` `isProbe7TestPath(p)`：判定口径从「文件名含 test 边界词或任意位置含 spec」收紧为「路径含 `(^|/)tests?/` 目录段，或文件名 `.test./.spec.` js 系后缀，或 `test_*.py`/`*_test.py`」。函数导出（原模块私有）供直测——导出名与签名不变语义只收紧。消费面仅探针 7 的 testFiles 收集三处（fromAllowed / fromDependents / existingTests 预填），预填面收窄不影响硬门判定。
- `src/verify-postcheck.js` `buildDepsBatches`：js/py 组卷后新增非测试形态拆批——被拆文件不进 `deps(auto-js)`（node --test）/ `deps(auto-py)`（pytest）执行批，新增 `deps(auto-nontest-skip)` skip 批（command: null、skip: true、files 点名、reason 说明）。批返回形状 additive（新增批型），既有批型与计数口径不变。
- 无 CLI 命令、文件格式、落盘结构变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

两处修复均为同步纯函数/组卷期判定，无事件序依赖；绑定行迟到写入（归档提升）在下次组卷时才被消费，届时已被执行侧兜底拦截——顺序无关。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不新增写面。isProbe7TestPath 只影响探针 7 写 trace 的内容（少写误判行）；buildDepsBatches 只读 deps 面组卷。多会话并行时 skip 批披露写入各自 verify-runs 时间线，互不冲突。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

skip 批不落 ledger failedFiles（skip 批 status 非 failed），增量重跑账本不会把非测试文件反复带入修复面；中断重入组卷幂等（纯函数重算）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

两处判定均为仓内相对路径纯函数，无跨仓状态；跨仓绑定行（repo: key）解析后的路径同样过执行侧形态校验——跨仓源码绑定同样被拦（方向正确：跨仓面本就不进内嵌执行）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：预填面收紧的漏检边界——连字形态 `foo_test.js`（无 `.test.` 点锚）不再预填。取向与 isTestFileName 注释一致（宁紧勿松：漏检落 agent 手查是 fail-visible，误判产生脏绑定+假败是 fail-hidden 更糟）；js 生态主流形态是 `.test.`/`.spec.`，连字形态罕见，且执行侧权威口径本就不认它（预填了也进不了执行批）。放弃的方案：a) 在 `collectFrLinkedTests` 读侧直接过滤非测试路径——绑定语义是「FR 覆盖证据」不限测试文件（capability 证据可以是源码/文档），读侧过滤会让合法证据绑定静默失效，改在执行侧拦「当测试跑」这一步；b) node --test 批加 `--experimental-strip-types` 类运行参数迁就 TS 源码——治标且方向反了（源码本就不该进测试执行面，`./config.js` 类 ESM 后缀映射在裸 node 下无解）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | isProbe7TestPath 收紧为锚定口径并导出（FR-01） |
| 修改 | src/verify-postcheck.js | buildDepsBatches 非测试形态拆 skip 批（FR-02） |
| 新增 | test/probe7-testpath-anchor.test.mjs | isProbe7TestPath 锚定口径边界表直测（FR-01/FR-03） |
| 修改 | test/dynamic-test-inference.test.mjs | buildDepsBatches 非测试拆批用例（FR-02/FR-03） |
| 修改 | test/deps-cwd-prefix.test.mjs | 既有用例占位文件名换 pytest 收集形态（x.py→test_x.py；点名非收集形态本就 0 collected exit 5 假败——与本次修复同病灶，断言语义原样） |
| 修改 | test/fr-regress-cap-drop.test.mjs | 同上（a1.test.py→test_a1.py 族） |
| 修改 | test/residual-runner-parity.test.mjs | 同上（t.py→test_t.py） |
