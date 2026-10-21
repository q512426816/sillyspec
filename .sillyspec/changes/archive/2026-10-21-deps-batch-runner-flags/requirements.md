---
author: flow-machine-draft
created_at: 2026-10-21T15:07:47.079Z
---
# 需求规格（Requirements）— 2026-10-21-deps-batch-runner-flags

## 功能需求

### FR-01: pytest 运行器提取保留尾随 flag（必须）

src/verify-postcheck.js buildDepsBatches 的 pytest 运行器提取（现 :2904 正则懒惰匹配到 pytest 一词为止）必须保留模块命令（local.yaml modules 命中）中 runner 词之后的尾随 flag：裸 flag（-q、--no-cov）与含等号 flag（--cov-report=xml）原样保留；已知吃值 flag（-n/--numprocesses、-k、-m、--maxfail、--timeout、--durations、--junitxml、-p 等）连同其值一并保留。原命令的位置参数（文件/目录路径 token，不以 - 开头且非已知吃值 flag 之值）必须仍被丢弃——批文件面由 buildDepsBatches 重定基供给，不得混入原命令文件面。

#### 场景：模块命令含并行 flag

- Given：local.yaml 模块命令 `cd backend && uv run pytest -q --no-cov -n auto app/modules/daemon/tests`
- When：buildDepsBatches 以该命令为 hits 命中构建 deps(auto-py) 批
- Then：批命令为 `cd backend && uv run pytest -q --no-cov -n auto <批文件…>`（`app/modules/daemon/tests` 位置参数被丢弃）

#### 场景：无尾随 flag 的命令零变化

- Given：模块命令 `cd backend && uv run pytest`（或结构推断路径 inferPyRunner）
- When：同上
- Then：批命令与现行逐字一致（缺省不补任何 flag——尊重显式配置，不引入意外并行）

### FR-02: 批命令形态钉死 + 既有语义面零回归（必须）

带 flag 保留后的批命令形态必须为 `<原 runner 前缀含 cd> <保留 flag 串> <重定基批文件…>`；cd 前缀提取（:2969 cdDir 正则）与文件重定基语义不得因 flag 追加而变化；vitest/jest（jsxRunner）提取路径本变更必须保持不动（其批耗时实测 60~199s 无痛点，flag 语义面不同先不扩）。

#### 场景：重定基保持

- Given：命令 `cd backend && uv run pytest -n auto`、deps 文件 `backend/app/modules/daemon/tests/test_a.py`
- When：buildDepsBatches 组批
- Then：批命令文件参为 `app/modules/daemon/tests/test_a.py`（backend/ 前缀剥离不因 -n auto 破坏）

### FR-03: 纯函数导出 + 直测（必须）

新增纯函数 extractRunnerTrailingFlags 必须（从 verify-postcheck.js）导出供直测，并与 buildDepsBatches 直测共同断言：①含 `-n auto` 命令的批命令保留该 flag；②无 flag 命令批命令逐字不变；③位置参数（路径）不混入批命令；④既有受影响测试面（verify-postcheck 相关既有用例）复跑 0 失败。

#### 场景：测试面

- Given：本变更实现完成
- When：跑新增测试 + 既有 verify-postcheck 相关面
- Then：0 失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/deps-batch-runner-flags.test.mjs「extractRunnerTrailingFlags：裸 flag/含等号 flag/吃值 flag 值/位置参数丢弃矩阵」
FR-02: test/deps-batch-runner-flags.test.mjs「buildDepsBatches：-n auto 保留 + 重定基不破 + 无 flag 命令逐字不变 + jsx 路径不动」
FR-03: test/deps-batch-runner-flags.test.mjs「回归面：verify-postcheck 既有相关用例复跑 0 失败」
