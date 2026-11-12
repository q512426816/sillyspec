---
author: flow-machine-draft
created_at: 2026-11-12T16:08:02.096Z
---
# 需求规格（Requirements）— 2026-11-13-probe7-existing-tests-cap

## 功能需求

### FR-01: src/verify-probes.js 既有用例候选行有展示帽（前 5 + 「…共 N 个」折叠），单行不超过约 1KB

- 渲染既有用例候选行时，必须最多展示前 5 个测试路径并追加「…共 N 个」折叠计数；单行渲染字节数必须收敛在约 1KB 以内（数百项级候选禁止全量拼接）。
- 折叠计数必须如实反映原始候选总数，且指向全量存放位置（verify-facts.json）。

#### 场景：332 项候选

- Given 无归属测试卡注入 332 个 FR 关联回归候选
- When renderProbe7Lines 渲染该卡
- Then 既有用例候选行只展示前 5 个路径 + 「…共 332 个」，单行长度 ≤ 1024 字节

#### 场景：≤5 项候选

- Given 候选只有 3 个
- When 渲染该卡
- Then 全部展示且不出现折叠计数尾巴

### FR-02: 同一变更内多张无归属卡共享同一候选集时，第二张起折叠为「同上（见 task-XX）」不再重复全量

- 同一渲染批次内，内容完全相同的既有用例候选集必须只在首张卡渲染一次（按 FR-01 展示帽）；后续卡必须折叠为「同上（见 task-<首卡>，共 N 个）」。
- 候选集内容不同的卡之间禁止互相折叠（必须各自按 FR-01 展示帽渲染）。

#### 场景：两卡共享同一候选集

- Given task-03 与 task-04 都注入同一份 332 项候选集
- When 渲染探针 7 段
- Then task-03 行展示 5 个 + 共 332 个，task-04 行为「同上（见 task-03）」，全段不含第二份路径清单

### FR-03: 全量候选写入 verify-facts.json，兑现代码注释承诺

- buildVerifyFacts 必须在 result.probe7 在场时把 existingTests 全量去重后写入 verify-facts.json 顶层段（按候选集分组，携带承接卡列表与文件全量）；result.probe7 缺席时禁止产出该键（存量调用方零回归）。

#### 场景：探针带 probe7 结果

- Given result.probe7 含 332 项既有候选
- When buildVerifyFacts(result, { changeName })
- Then facts 含 probe7ExistingTests 段，文件全量 332 项在场且与 md 折叠计数一致

#### 场景：存量调用方无 probe7

- Given result 无 probe7 键
- When buildVerifyFacts
- Then 输出不含 probe7ExistingTests 键，其余事实与改造前一致

### FR-04: 新增测试覆盖上述三条行为，相关测试面绿，既有 verify 相关测试无回归

- 本变更必须新增自动化测试覆盖 FR-01/02/03 的行为断言，且 test/pitfall-probe7-noise.test.mjs 既有探针用例必须保持全绿、禁止改写既有断言。

#### 场景：回归面

- Given 新增用例与既有探针测试
- When 运行 node --test 相关测试文件
- Then 全部通过，无既有断言被改写

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/pitfall-probe7-noise.test.mjs「既有用例候选行展示帽：前 5 + 共 N 个折叠」
FR-02: test/pitfall-probe7-noise.test.mjs「相邻无归属卡共享候选集折叠为同上」
FR-03: test/pitfall-probe7-noise.test.mjs「buildVerifyFacts 落 probe7ExistingTests 全量、缺省零回归」
FR-04: test/pitfall-probe7-noise.test.mjs「既有用例候选行展示帽：前 5 + 共 N 个折叠」（另含同文件既有 FR-10 三用例回归）
