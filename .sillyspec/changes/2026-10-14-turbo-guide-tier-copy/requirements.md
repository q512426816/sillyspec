---
author: flow-machine-draft
created_at: 2026-10-14T01:04:21.966Z
---
# 需求规格（Requirements）— 2026-10-14-turbo-guide-tier-copy

## 功能需求

### FR-01: --turbo --thick 同给时 start 不再输出「收口自动跳过实测与重仪式门」承诺，改输出档位如实文案（thick 起步走全量仪式）；--turbo 且 thin 时承诺文案照旧

- 系统 MUST：`--turbo --thick` 同给时 start 输出「极速留痕已记（--turbo），但 --thick 厚档起步——收口走全量仪式，实测与仪式门照跑不跳过（升厚即失效）」，禁止出现「收口自动跳过实测与重仪式门」承诺（与 D-007 门判定一致，cli-copy-selfsufficient②）；`--turbo` 且 thin 时承诺文案逐字照旧；无 `--turbo` 时输出与改动前逐字一致。

#### 场景：主路径

Given 用户以 `--turbo --thick` 起变更
When flow start 渲染极速指引行
Then 输出档位如实文案（全量仪式），无跳过承诺

### FR-02: turbo done 输出含 ui 探针跳过留痕行；带未提交交付缺口时 turbo 降 advisory 放行（exit 0）而非 turbo 同场景阻断（exit≠0 三选一）

- 系统 MUST：turbo 变更 flow done 输出含「⚡ 极速模式：UI 视觉证据探针跳过」留痕行；存在未提交交付缺口时输出「⚡ 极速模式：未提交交付缺口未显式处置——降 advisory 放行」并 exit 0；同场景非 turbo 必须 exit≠0 且报三选一阻断（既有语义零回归）。

#### 场景：主路径

Given turbo 变更交付面留有未提交文件
When flow done 执行 patch 冻结
Then 降 advisory 放行留痕并完成收口；非 turbo 对照组同场景阻断

### FR-03: flow-state turbo 值损坏（非布尔 true）时 done 走非 turbo 全量路径；flow-state.yaml 整体损坏时 done exit 2 报「无 flow-state」并指路

- 系统 MUST：turbo 字段值非布尔 true（如字符串）时读态判定不激活跳过面（fail-soft 回退全量，实测门照跑）；flow-state.yaml 整体损坏时 flow done 必须 exit 2 并报「无 flow-state.yaml（未参与 thin 协议）」指路（既有 fail-loud 语义，禁止静默按非 turbo 收口）。

#### 场景：主路径

Given flow-state 被外部篡改（turbo 值损坏 / 文件损坏）
When flow done 读态
Then 值损坏走全量路径完成收口；文件损坏拒绝并指路

### FR-04: 新增断言全绿 + 全量测试核心套回归零失败

- 系统 MUST：四件 turbo 测试文件全部用例通过（13 用例），`npm run test:core` 全量回归 325/325 零失败。

#### 场景：主路径

Given 本变更交付面（src/flow.js 指引行 + 四件测试）
When 跑 node --test 四件与 npm run test:core
Then 全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/turbo-mode-scope.test.mjs「② --turbo --thick 同给：指引文案随档位收窄」
FR-02: test/turbo-mode-done-skip.test.mjs「① ui 探针跳过留痕行／③ dirty 降 advisory 行为对照」
FR-03: test/turbo-mode-scope.test.mjs「④ turbo 值损坏 fail-soft／⑤ flow-state.yaml 整体损坏 fail-loud」
FR-04: test/turbo-mode-scope.test.mjs「全文件 5 用例 + npm run test:core 325/325（收口实测对账承载）」
