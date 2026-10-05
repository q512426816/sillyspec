---
author: flow-machine-draft
created_at: 2026-10-05T12:44:46.600Z
---
# 需求规格（Requirements）— 2026-10-05-flowdone-lintfail-output

## 功能需求

### FR-01: flow done lint 门 FAIL 时输出 lint 件套：命令、输出尾部（后15行）、失败文件（前10）、结果文件路径（与 test 三件套同构）

- flow done 实测门 lint FAIL 时必须在 FAIL 主输出后打印 lint 件套：lint 命令（含 reason）、输出尾部（过滤空行后至多后 15 行、每行截 160 字）、失败文件清单（前 10）、结果文件路径——禁止只留「命令与输出尾部见上」名不副实的空指引。

#### 场景：主路径

- Given: local.yaml 配置 lint 命令（node lint-fail.js，退出码 1、输出提及本变更交付文件）
- When: flow done 实测门跑 lint FAIL
- Then: FAIL 输出含「lint 命令：」「lint 输出尾部」「lint 失败文件」「lint 结果文件」四段，尾部含失败行内容

### FR-02: lint 结果持久化：并入 test-result.json（modules 并列 lint 节）；test 无结果文件而 lint 实跑时独立落盘（kind:lint）；skipped 不落

- lint 结果（passed/failed）必须持久化：有 test 结果文件时读改写并入 `lint` 节（既有字段不受扰）；test 无结果文件而 lint 实跑时按 writeRunResult 形状独立落盘（kind:lint 标识）；skipped 不落盘。落盘 best-effort——失败不阻断门禁语义。

#### 场景：主路径

- Given: quick-audit 门跑完 test（passed，有结果文件）+ lint（failed）
- When: persistLintResult 执行
- Then: test-result.json 含 lint 节（command/exitCode/outputTail/failureFiles），既有 modules 字段不变；testResultPath 缺席时独立落盘 kind:lint 文件；status=skipped 时返回 null 不落

### FR-03: quick-audit failed 提升到 try 外，快照 FAIL 回拷（P6b）与 resultPath 重映射真实生效

- `failed` 数组必须声明在 try 块外（块级作用域），使 finally 的快照 FAIL 回拷（P6b）与 resultPath 重映射可达——修复其自 2026-09-28 落地即因 ReferenceError 被空 catch 吞掉的死代码状态。

#### 场景：主路径

- Given: 快照模式跑 quick 门且 lint FAIL（需回拷结果）
- When: finally 块执行快照回拷
- Then: failed.length 可读，结果文件回拷主仓、resultPath 重映射为可访问路径（不再随临时快照目录蒸发）

### FR-04: e2e 单测锁定全链路：lint 门 FAIL 输出件套 + test-result.json 含 lint 节（含 persistLintResult 三态单测）

- 必须有单测锁定：persistLintResult 三态（并入/独立落盘/skipped 不落）+ e2e 全链路（真实 CLI 走 flow start→approve→done，lint 门 FAIL 时输出件套与 test-result.json lint 节断言）。

#### 场景：主路径

- Given: 临时仓 + 失败 lint 夹具
- When: e2e 跑 flow done
- Then: 断言 FAIL 件套四段与 lint 节形状

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flowdone-lint-fail-output.test.mjs「② e2e：flow done lint 门 FAIL 输出 lint 命令/尾部/失败文件，结果并入 test-result.json」
FR-02: test/flowdone-lint-fail-output.test.mjs「① persistLintResult 三态：并入 / 独立落盘 / skipped 不落」
FR-03: test/flowdone-lint-fail-output.test.mjs「② e2e：…结果并入 test-result.json（快照回拷链路经 e2e 门路径覆盖）」
FR-04: test/flowdone-lint-fail-output.test.mjs「① + ② 双件齐备（fixture 快照）」
